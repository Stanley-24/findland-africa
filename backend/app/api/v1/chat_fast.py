from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime
import uuid

from app.database import get_db
from app.models.chat import ChatRoom, ChatMessage, ChatParticipant
from app.models.property import Property
from app.models.user import User
from app.auth.dependencies import get_current_user
from app.schemas.chat import ChatRoomCreate
import redis
import json

# Import WebSocket connection manager from chat module
from app.api.v1.chat import manager

router = APIRouter(prefix="/fast/chat", tags=["chat-fast"])

def get_online_status(user_id: str) -> bool:
    """Check if a user is currently online"""
    try:
        r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        online_users = r.get('online_users')
        if online_users:
            online_list = json.loads(online_users)
            return user_id in online_list
        return False
    except Exception:
        return False

def serialize_chat_room(room, property_data=None, last_message_data=None):
    """Convert SQLAlchemy ChatRoom object to JSON-serializable dictionary"""
    # Create a meaningful chat room name using agent name and property title
    chat_name = room.name
    if property_data and property_data.get('agent_name') and property_data.get('title'):
        chat_name = f"Chat with {property_data['agent_name']} - {property_data['title']}"
    elif property_data and property_data.get('agent_name'):
        chat_name = f"Chat with {property_data['agent_name']}"
    elif property_data and property_data.get('title'):
        chat_name = f"Chat about {property_data['title']}"
    
    # Check if agent is online
    agent_online = False
    if property_data and property_data.get('owner_id'):
        agent_online = get_online_status(str(property_data.get('owner_id')))
    
    return {
        'id': str(room.id),
        'name': chat_name,
        'room_type': room.room_type,
        'property_id': str(room.property_id) if room.property_id else None,
        'property_title': property_data.get('title') if property_data else None,
        'property_location': property_data.get('location') if property_data else None,
        'agent_id': str(property_data.get('owner_id')) if property_data else None,
        'agent_name': property_data.get('agent_name') if property_data else None,
        'agent_rating': float(property_data.get('agent_rating')) if property_data and property_data.get('agent_rating') else None,
        'agent_avatar': property_data.get('agent_avatar') if property_data else None,
        'agent_online': agent_online,
        'created_by': str(room.created_by),
        'is_active': room.is_active,
        'status': 'active' if room.is_active else 'inactive',
        'created_at': room.created_at.isoformat() if room.created_at else None,
        'updated_at': room.updated_at.isoformat() if room.updated_at else None,
        'last_message': last_message_data,
        'property': property_data
    }

def serialize_chat_message(message, current_user_id=None):
    """Convert SQLAlchemy ChatMessage object to JSON-serializable dictionary"""
    # Get sender name from the database
    from app.models.user import User
    from app.database import get_db
    db = next(get_db())
    sender = db.query(User).filter(User.id == message.sender_id).first()
    sender_name = sender.name if sender else None
    
    # If the sender is the current user, show "You" instead of their name
    if current_user_id and str(message.sender_id) == str(current_user_id):
        sender_name = "You"
    
    return {
        'id': str(message.id),
        'room_id': str(message.room_id),
        'sender_id': str(message.sender_id),
        'sender_name': sender_name,
        'content': message.content,
        'message_type': message.message_type,
        'is_edited': message.is_edited,
        'is_deleted': message.is_deleted,
        'created_at': message.created_at.isoformat() if message.created_at else None,
        'updated_at': message.updated_at.isoformat() if message.updated_at else None,
    }

@router.get("/rooms", response_model=List[Dict[str, Any]])
async def list_fast_chat_rooms(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    """List chat rooms with raw JSON serialization for speed."""
    # Get chat rooms where the current user is either creator or participant
    from app.models.chat import ChatParticipant
    
    # Get room IDs where user is a participant
    participant_rooms = db.query(ChatParticipant.room_id).filter(
        ChatParticipant.user_id == current_user.id,
        ChatParticipant.is_active == True
    ).all()
    participant_room_ids = [room_id[0] for room_id in participant_rooms]
    print(f"DEBUG: User {current_user.id} is participant in rooms: {participant_room_ids}")
    
    # Also check all participants for debugging
    all_participants = db.query(ChatParticipant).filter(ChatParticipant.is_active == True).all()
    print(f"DEBUG: All active participants: {[(p.user_id, p.room_id) for p in all_participants]}")
    
    # Get chat rooms where user is creator OR participant
    chat_rooms = db.query(ChatRoom).filter(
        (ChatRoom.created_by == current_user.id) | 
        (ChatRoom.id.in_(participant_room_ids))
    ).offset(skip).limit(limit).all()
    print(f"DEBUG: Found {len(chat_rooms)} chat rooms for user {current_user.id}")
    for room in chat_rooms:
        print(f"DEBUG: Room {room.id} - created_by: {room.created_by}, property_id: {room.property_id}")
    
    # Get property IDs for efficient loading
    property_ids = [str(room.property_id) for room in chat_rooms if room.property_id is not None]
    
    # Load properties in a single query
    from app.models.property import Property
    properties = {}
    if property_ids:
        property_list = db.query(Property).filter(Property.id.in_(property_ids)).all()
        properties = {str(p.id): {
            'id': str(p.id),
            'title': p.title,
            'price': float(p.price) if p.price else None,
            'location': p.location,
            'type': p.type.value if p.type else None,
            'status': p.status.value if p.status else None,
            'agent_name': p.agent_name,
            'agent_phone': p.agent_phone,
            'agent_email': p.agent_email,
            'owner_id': str(p.owner_id) if p.owner_id else None,
            'agent_rating': float(p.agent_rating) if p.agent_rating else None,
            'agent_avatar': ''.join([name[0].upper() for name in p.agent_name.split()[:2]]) if p.agent_name else None,
        } for p in property_list}
    
    # Get last messages for each chat room
    from app.models.chat import ChatMessage
    from app.models.user import User
    last_messages = {}
    if chat_rooms:
        room_ids = [str(room.id) for room in chat_rooms]
        # Get the most recent message for each room
        for room_id in room_ids:
            last_message = db.query(ChatMessage).filter(
                ChatMessage.room_id == room_id,
                ChatMessage.is_deleted == False
            ).order_by(ChatMessage.created_at.desc()).first()
            
            if last_message:
                # Get sender name from user data
                sender_name = 'User'
                if last_message.sender_id:
                    sender = db.query(User).filter(User.id == last_message.sender_id).first()
                    if sender:
                        sender_name = sender.name or sender.email or 'User'
                    
                    # If the sender is the current user, show "You" instead of their name
                    if str(last_message.sender_id) == str(current_user.id):
                        sender_name = "You"
                
                # Generate avatar initials for sender
                sender_avatar = None
                if sender and sender.name:
                    initials = ''.join([name[0].upper() for name in sender.name.split()[:2]])
                    sender_avatar = initials
                
                last_messages[room_id] = {
                    'id': str(last_message.id),
                    'content': last_message.content,
                    'sender_name': sender_name,
                    'sender_avatar': sender_avatar,
                    'created_at': last_message.created_at.isoformat() if last_message.created_at else None,
                    'is_edited': last_message.is_edited
                }
    
    # Serialize chat rooms with property data and last message
    # Include all chat rooms, even those without messages
    result = []
    for room in chat_rooms:
        property_data = properties.get(str(room.property_id)) if room.property_id else None
        last_message_data = last_messages.get(str(room.id))
        
        # Include all chat rooms, with or without messages
        room_data = serialize_chat_room(room, property_data, last_message_data)
        result.append(room_data)
    
    return result

@router.post("/rooms", response_model=Dict[str, Any])
async def create_fast_chat_room(
    room_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a chat room with raw JSON serialization for speed."""
    try:
        # Create new chat room
        new_room = ChatRoom(
            id=str(uuid.uuid4()),
            name=room_data.get('name', 'Property Chat'),
            room_type=room_data.get('room_type', 'property'),
            property_id=room_data.get('property_id'),
            created_by=current_user.id,  # Use authenticated user ID
            is_active=True
        )
        
        db.add(new_room)
        db.commit()
        db.refresh(new_room)
        
        # Add the creator as a participant
        participant = ChatParticipant(
            id=str(uuid.uuid4()),
            room_id=new_room.id,
            user_id=current_user.id,
            is_active=True,
            joined_at=datetime.utcnow()
        )
        db.add(participant)
        
        # Add the property owner as a participant if this is a property chat
        if new_room.property_id:
            from app.models.property import Property
            property = db.query(Property).filter(Property.id == new_room.property_id).first()
            if property:
                print(f"DEBUG: Property owner: {property.owner_id}, Current user: {current_user.id}")
                print(f"DEBUG: Are they different? {property.owner_id != current_user.id}")
                if property.owner_id != current_user.id:  # Don't add if owner is the same as creator
                    print(f"DEBUG: Adding property owner {property.owner_id} as participant")
                    owner_participant = ChatParticipant(
                        id=str(uuid.uuid4()),
                        room_id=new_room.id,
                        user_id=property.owner_id,
                        is_active=True,
                        joined_at=datetime.utcnow()
                    )
                    db.add(owner_participant)
                else:
                    print(f"DEBUG: Not adding - owner is same as creator")
            else:
                print(f"DEBUG: Property not found")
        
        db.commit()
        print(f"DEBUG: Chat room created with ID: {new_room.id}")
        print(f"DEBUG: Creator (buyer) added as participant: {current_user.id}")
        if new_room.property_id:
            print(f"DEBUG: Property owner added as participant: {property.owner_id if property else 'Property not found'}")
        
        # Fetch property data separately since relationships are disabled
        from app.models.property import Property
        property_data = None
        if new_room.property_id:
            property = db.query(Property).filter(Property.id == new_room.property_id).first()
            if property:
                property_data = {
                    'id': str(property.id),
                    'title': property.title,
                    'price': float(property.price) if property.price else None,
                    'location': property.location,
                    'type': property.type.value if property.type else None,
                    'status': property.status.value if property.status else None,
                    'agent_name': property.agent_name,
                    'agent_phone': property.agent_phone,
                    'agent_email': property.agent_email,
                    'owner_id': str(property.owner_id) if property.owner_id else None,
                    'agent_rating': float(property.agent_rating) if property.agent_rating else None,
                }
        
        # Serialize the room data for broadcasting
        room_data = serialize_chat_room(new_room, property_data, None)
        
        # Broadcast room creation to all participants via WebSocket
        await manager.broadcast_to_room(json.dumps({
            "type": "room_created",
            "data": room_data,
            "room_id": new_room.id,
            "sender_id": str(current_user.id),
            "sender_name": current_user.name or current_user.email
        }), new_room.id, str(current_user.id))
        
        return room_data
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating chat room: {str(e)}")

@router.delete("/rooms/{room_id}", status_code=200)
async def delete_fast_chat_room(
    room_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a chat room with fast response."""
    try:
        # Find the room
        room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Chat room not found")
        
        # Check if user is a participant in the room OR the creator
        participant = db.query(ChatParticipant).filter(
            ChatParticipant.room_id == room_id,
            ChatParticipant.user_id == current_user.id,
            ChatParticipant.is_active == True
        ).first()
        
        # Allow deletion if user is creator or participant
        if not participant and room.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="You are not a participant in this chat room")
        
        # Delete related records manually since relationships are commented out
        # Delete all participants first
        participants = db.query(ChatParticipant).filter(ChatParticipant.room_id == room_id).all()
        for participant in participants:
            db.delete(participant)
        
        # Delete all messages
        messages = db.query(ChatMessage).filter(ChatMessage.room_id == room_id).all()
        for message in messages:
            db.delete(message)
        
        # Finally delete the room
        db.delete(room)
        db.commit()
        
        # Broadcast room deletion to all participants via WebSocket
        await manager.broadcast_to_room(json.dumps({
            "type": "room_deleted",
            "data": {
                "room_id": room_id,
                "deleted_by": str(current_user.id),
                "deleted_by_name": current_user.name or current_user.email
            },
            "room_id": room_id,
            "sender_id": str(current_user.id),
            "sender_name": current_user.name or current_user.email
        }), room_id, str(current_user.id))
        
        return {"message": "Chat room deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting chat room: {str(e)}")

@router.post("/rooms/{room_id}/typing")
async def send_typing_indicator(
    room_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send typing indicator to other users in the room"""
    try:
        # Verify user has access to the room
        room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Chat room not found")
        
        # Check if user is a participant
        is_participant = db.query(ChatParticipant).filter(
            ChatParticipant.room_id == room_id,
            ChatParticipant.user_id == current_user.id,
            ChatParticipant.is_active == True
        ).first() is not None
        
        if not is_participant and room.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Broadcast typing indicator
        await manager.broadcast_typing_indicator(
            room_id, 
            str(current_user.id), 
            current_user.name or current_user.email, 
            True
        )
        
        return {"status": "typing_indicator_sent"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending typing indicator: {str(e)}")

@router.post("/rooms/{room_id}/typing/stop")
async def stop_typing_indicator(
    room_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Stop typing indicator"""
    try:
        # Verify user has access to the room
        room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Chat room not found")
        
        # Check if user is a participant
        is_participant = db.query(ChatParticipant).filter(
            ChatParticipant.room_id == room_id,
            ChatParticipant.user_id == current_user.id,
            ChatParticipant.is_active == True
        ).first() is not None
        
        if not is_participant and room.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Broadcast stop typing indicator
        await manager.broadcast_typing_indicator(
            room_id, 
            str(current_user.id), 
            current_user.name or current_user.email, 
            False
        )
        
        return {"status": "typing_indicator_stopped"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error stopping typing indicator: {str(e)}")

@router.get("/rooms/{room_id}", response_model=Dict[str, Any])
async def get_fast_chat_room(
    room_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a single chat room with raw JSON serialization for speed."""
    # Check if this is a temporary chat room ID
    if room_id.startswith('temp_'):
        # For temporary IDs, we need to create a real chat room
        # Extract property ID from temp ID format: temp_{property_id}_{timestamp}
        try:
            # Remove 'temp_' prefix and split by the last underscore to separate property_id and timestamp
            temp_id_without_prefix = room_id[5:]  # Remove 'temp_'
            last_underscore_index = temp_id_without_prefix.rfind('_')
            if last_underscore_index > 0:
                property_id = temp_id_without_prefix[:last_underscore_index]
                # Check if a chat room already exists for this property and user
                existing_room = db.query(ChatRoom).filter(
                    ChatRoom.property_id == property_id,
                    ChatRoom.created_by == current_user.id
                ).first()
                
                if existing_room:
                    # Return the existing room
                    return serialize_chat_room(existing_room)
                else:
                    # Create a new chat room
                    room_data = {
                        "name": "Property Chat",
                        "room_type": "property",
                        "property_id": property_id,
                        "participant_ids": [current_user.id]
                    }
                    return await create_fast_chat_room(
                        room_data,
                        db,
                        current_user
                    )
            else:
                raise HTTPException(status_code=400, detail="Invalid temporary chat room ID format")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error handling temporary chat room ID {room_id}: {e}")
            raise HTTPException(status_code=400, detail="Invalid temporary chat room ID")
    
    # Handle regular UUID chat room IDs
    chat_room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    
    if not chat_room:
        raise HTTPException(status_code=404, detail="Chat room not found")
    
    # Check if user is either creator or participant
    is_creator = chat_room.created_by == current_user.id
    is_participant = db.query(ChatParticipant).filter(
        ChatParticipant.room_id == room_id,
        ChatParticipant.user_id == current_user.id,
        ChatParticipant.is_active == True
    ).first() is not None
    
    if not is_creator and not is_participant:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Fetch property data separately since relationships are disabled
    from app.models.property import Property
    property_data = None
    if chat_room.property_id:
        property = db.query(Property).filter(Property.id == chat_room.property_id).first()
        if property:
            property_data = {
                'id': str(property.id),
                'title': property.title,
                'price': float(property.price) if property.price else None,
                'location': property.location,
                'type': property.type.value if property.type else None,
                'status': property.status.value if property.status else None,
                'agent_name': property.agent_name,
                'agent_phone': property.agent_phone,
                'agent_email': property.agent_email,
                'owner_id': str(property.owner_id) if property.owner_id else None,
                'agent_rating': float(property.agent_rating) if property.agent_rating else None,
            }
    
    # Get last message for this chat room
    from app.models.chat import ChatMessage
    from app.models.user import User
    last_message_data = None
    last_message = db.query(ChatMessage).filter(
        ChatMessage.room_id == chat_room.id,
        ChatMessage.is_deleted == False
    ).order_by(ChatMessage.created_at.desc()).first()
    
    if last_message:
        # Get sender name from user data
        sender_name = 'User'
        if last_message.sender_id:
            sender = db.query(User).filter(User.id == last_message.sender_id).first()
            if sender:
                sender_name = sender.name or sender.email or 'User'
            
            # If the sender is the current user, show "You" instead of their name
            if str(last_message.sender_id) == str(current_user.id):
                sender_name = "You"
        
        last_message_data = {
            'id': str(last_message.id),
            'content': last_message.content,
            'sender_name': sender_name,
            'created_at': last_message.created_at.isoformat() if last_message.created_at else None,
            'is_edited': last_message.is_edited
        }
    
    return serialize_chat_room(chat_room, property_data, last_message_data)

@router.post("/online-status", response_model=Dict[str, Any])
async def update_online_status(
    current_user: User = Depends(get_current_user)
):
    """Update user's online status"""
    try:
        r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        
        # Get current online users
        online_users = r.get('online_users')
        if online_users:
            online_list = json.loads(online_users)
        else:
            online_list = []
        
        # Add current user to online list
        user_id = str(current_user.id)
        if user_id not in online_list:
            online_list.append(user_id)
        
        # Update Redis with expiration (5 minutes)
        r.setex('online_users', 300, json.dumps(online_list))
        
        return {
            'user_id': user_id,
            'status': 'online',
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating online status: {str(e)}")

@router.get("/rooms/{room_id}/online-status", response_model=Dict[str, Any])
async def get_chat_online_status(
    room_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get online status of participants in a chat room"""
    try:
        # Check if this is a temporary chat room ID
        if room_id.startswith('temp_'):
            # For temporary IDs, return default online status
            # The actual chat room will be created when the user sends a message
            return {
                "agent_online": False,
                "current_user_online": True,
                "participants": []
            }
        
        # Get chat room
        chat_room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
        if not chat_room:
            raise HTTPException(status_code=404, detail="Chat room not found")
        
        # Check if user is either creator or participant
        is_creator = chat_room.created_by == current_user.id
        is_participant = db.query(ChatParticipant).filter(
            ChatParticipant.room_id == room_id,
            ChatParticipant.user_id == current_user.id,
            ChatParticipant.is_active == True
        ).first() is not None
        
        if not is_creator and not is_participant:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get property and agent info
        property_data = None
        if chat_room.property_id:
            property_obj = db.query(Property).filter(Property.id == chat_room.property_id).first()
            if property_obj:
                property_data = {
                    'title': property_obj.title,
                    'location': property_obj.location,
                    'agent_name': property_obj.agent_name,
                    'agent_email': property_obj.agent_email,
                    'owner_id': str(property_obj.owner_id) if property_obj.owner_id else None,
                    'agent_rating': float(property_obj.agent_rating) if property_obj.agent_rating else None,
                }
        
        # Check online status
        agent_online = False
        if property_data and property_data.get('owner_id'):
            agent_online = get_online_status(str(property_data.get('owner_id')))
        
        current_user_online = get_online_status(str(current_user.id))
        
        return {
            'room_id': str(room_id),
            'agent_online': agent_online,
            'current_user_online': current_user_online,
            'agent_id': property_data.get('owner_id') if property_data else None,
            'agent_name': property_data.get('agent_name') if property_data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting online status: {str(e)}")

@router.get("/rooms/{room_id}/messages", response_model=List[Dict[str, Any]])
async def get_fast_chat_messages(
    room_id: str,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    """Get chat messages with raw JSON serialization for speed."""
    
    # Check if this is a temporary chat room ID
    if room_id.startswith('temp_'):
        # For temporary IDs, return empty messages list
        # The actual chat room will be created when the user sends a message
        return []
    
    # Check if user has access to this chat room (either creator or participant)
    chat_room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not chat_room:
        raise HTTPException(status_code=404, detail="Chat room not found")
    
    # Check if user is either creator or participant
    is_creator = chat_room.created_by == current_user.id
    is_participant = db.query(ChatParticipant).filter(
        ChatParticipant.room_id == room_id,
        ChatParticipant.user_id == current_user.id,
        ChatParticipant.is_active == True
    ).first() is not None
    
    if not is_creator and not is_participant:
        raise HTTPException(status_code=403, detail="Access denied")
    
    messages = db.query(ChatMessage).filter(
        ChatMessage.room_id == room_id
    ).order_by(ChatMessage.created_at.desc()).offset(skip).limit(limit).all()
    
    return [serialize_chat_message(message, current_user.id) for message in messages]

@router.post("/rooms/{room_id}/messages", response_model=Dict[str, Any])
async def create_fast_chat_message(
    room_id: str,
    message_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a chat message with raw JSON serialization for speed."""
    try:
        # Check if this is a temporary chat room ID
        if room_id.startswith('temp_'):
            # Extract property ID from temp ID format: temp_{property_id}_{timestamp}
            try:
                # Remove 'temp_' prefix and split by the last underscore to separate property_id and timestamp
                temp_id_without_prefix = room_id[5:]  # Remove 'temp_'
                last_underscore_index = temp_id_without_prefix.rfind('_')
                if last_underscore_index > 0:
                    property_id = temp_id_without_prefix[:last_underscore_index]
                    
                    # Check if a chat room already exists for this property and user
                    existing_room = db.query(ChatRoom).filter(
                        ChatRoom.property_id == property_id,
                        ChatRoom.created_by == current_user.id
                    ).first()
                    
                    if existing_room:
                        # Use the existing room
                        chat_room = existing_room
                        room_id = existing_room.id
                    else:
                        # Create a new chat room
                        new_room_response = await create_fast_chat_room(
                            ChatRoomCreate(
                                name=f"Property Chat",
                                room_type="property",
                                property_id=property_id,
                                participant_ids=[current_user.id]
                            ),
                            db,
                            current_user
                        )
                        # Get the created room from the database
                        chat_room = db.query(ChatRoom).filter(ChatRoom.id == new_room_response['id']).first()
                        room_id = new_room_response['id']
                else:
                    raise HTTPException(status_code=400, detail="Invalid temporary chat room ID format")
            except Exception as e:
                print(f"Error handling temporary chat room ID {room_id}: {e}")
                raise HTTPException(status_code=400, detail="Invalid temporary chat room ID")
        else:
            # Handle regular UUID chat room IDs
            chat_room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
            if not chat_room:
                raise HTTPException(status_code=404, detail="Chat room not found")
        
        # Check if user is either the creator or a participant
        is_creator = chat_room.created_by == current_user.id
        
        # Check if user is a participant
        is_participant = db.query(ChatParticipant).filter(
            ChatParticipant.room_id == room_id,
            ChatParticipant.user_id == current_user.id,
            ChatParticipant.is_active == True
        ).first() is not None
        
        if not is_creator and not is_participant:
            raise HTTPException(status_code=403, detail="You are not authorized to send messages in this chat room")
        
        # Create and save message
        new_message = ChatMessage(
            id=str(uuid.uuid4()),
            room_id=room_id,
            sender_id=current_user.id,
            content=message_data.get('content'),
            message_type=message_data.get('message_type', 'text'),
            is_edited=False,
            is_deleted=False
        )
        
        db.add(new_message)
        db.commit()
        db.refresh(new_message)
        
        # Broadcast message via WebSocket to all participants in the room
        message_dict = {
            "id": str(new_message.id),
            "room_id": str(new_message.room_id),
            "sender_id": str(new_message.sender_id),
            "sender_name": current_user.name or current_user.email,
            "content": new_message.content,
            "message_type": new_message.message_type,
            "file_url": new_message.file_url,
            "file_name": new_message.file_name,
            "created_at": new_message.created_at.isoformat() if new_message.created_at else None,
            "is_edited": new_message.is_edited,
            "is_deleted": new_message.is_deleted
        }
        
        # Broadcast to WebSocket connections in the room
        await manager.broadcast_to_room(json.dumps({
            "type": "message",
            "data": message_dict,
            "room_id": room_id,
            "sender_id": str(current_user.id),
            "sender_name": current_user.name or current_user.email
        }), room_id, str(current_user.id))
        
        return serialize_chat_message(new_message, current_user.id)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating message: {str(e)}")
