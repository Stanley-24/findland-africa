from fastapi import APIRouter, Depends, HTTPException, status, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import json
import uuid

from app.database import get_db
from app.models.chat import ChatRoom, ChatParticipant, ChatMessage
from app.models.user import User
from app.models.property import Property
from app.models.escrow import Escrow
from app.schemas.chat import (
    ChatRoomCreate, ChatRoomUpdate, ChatRoomWithDetails,
    ChatParticipantCreate, ChatMessageCreate, ChatMessageSend, ChatMessageUpdate,
    ChatMessageWithDetails
)

def get_chat_room_details(room: ChatRoom, db: Session) -> ChatRoomWithDetails:
    """Helper function to get chat room details with property info"""
    # Get participants
    participants = db.query(ChatParticipant).filter(
        ChatParticipant.room_id == room.id,
        ChatParticipant.is_active == True
    ).all()
    
    # Get message count
    message_count = db.query(ChatMessage).filter(
        ChatMessage.room_id == room.id,
        ChatMessage.is_deleted == False
    ).count()
    
    # Get last message
    last_message = db.query(ChatMessage).filter(
        ChatMessage.room_id == room.id,
        ChatMessage.is_deleted == False
    ).order_by(ChatMessage.created_at.desc()).first()
    
    # Add sender_name to last_message if it exists
    if last_message:
        sender = db.query(User).filter(User.id == last_message.sender_id).first()
        last_message.sender_name = sender.name if sender else "Unknown User"
    
    # Get property details if room is associated with a property
    property_title = None
    property_location = None
    agent_name = None
    agent_rating = None
    
    if room.property_id:
        from app.models.property import Property
        property_obj = db.query(Property).filter(Property.id == room.property_id).first()
        if property_obj:
            property_title = property_obj.title
            property_location = property_obj.location
            agent_name = property_obj.agent_name
            agent_rating = float(property_obj.agent_rating) if property_obj.agent_rating else None
    
    room_dict = room.__dict__.copy()
    room_dict['participants'] = participants
    room_dict['message_count'] = message_count
    room_dict['property_title'] = property_title
    room_dict['property_location'] = property_location
    room_dict['agent_name'] = agent_name
    room_dict['agent_rating'] = agent_rating
    room_dict['last_message'] = last_message
    
    return ChatRoomWithDetails(**room_dict)
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
        self.room_connections: dict[str, set[str]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        # Remove from all room connections
        for room_id, users in self.room_connections.items():
            users.discard(user_id)

    async def join_room(self, user_id: str, room_id: str):
        if room_id not in self.room_connections:
            self.room_connections[room_id] = set()
        self.room_connections[room_id].add(user_id)

    async def leave_room(self, user_id: str, room_id: str):
        if room_id in self.room_connections:
            self.room_connections[room_id].discard(user_id)

    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_text(message)

    async def broadcast_to_room(self, message: str, room_id: str, exclude_user: Optional[str] = None):
        if room_id in self.room_connections:
            for user_id in self.room_connections[room_id]:
                if user_id != exclude_user and user_id in self.active_connections:
                    await self.active_connections[user_id].send_text(message)

manager = ConnectionManager()

@router.post("/rooms", response_model=ChatRoomWithDetails, status_code=status.HTTP_201_CREATED)
def create_chat_room(
    room_data: ChatRoomCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new chat room"""
    print(f"Creating chat room with data: {room_data}")
    print(f"Current user: {current_user.id}")
    
    try:
        # Convert and verify property exists if provided
        property_id = None
        if room_data.property_id:
            try:
                property_id = uuid.UUID(room_data.property_id) if isinstance(room_data.property_id, str) else room_data.property_id
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid property ID format"
                )
            
            property = db.query(Property).filter(Property.id == property_id).first()
            if not property:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Property not found"
                )
            
            # Check if chat room already exists for this property
            existing_room = db.query(ChatRoom).filter(
                ChatRoom.property_id == property_id,
                ChatRoom.is_active == True
            ).first()
            
            if existing_room:
                # Check if current user is already a participant
                existing_participant = db.query(ChatParticipant).filter(
                    ChatParticipant.room_id == existing_room.id,
                    ChatParticipant.user_id == current_user.id,
                    ChatParticipant.is_active == True
                ).first()
                
                if existing_participant:
                    # User is already in the room, return existing room
                    return get_chat_room_details(existing_room, db)
                else:
                    # Add user to existing room
                    new_participant = ChatParticipant(
                        room_id=existing_room.id,
                        user_id=current_user.id,
                        role="member"
                    )
                    db.add(new_participant)
                    db.commit()
                    db.refresh(new_participant)
                    return get_chat_room_details(existing_room, db)
        
        # Convert and verify escrow exists if provided
        escrow_id = None
        if room_data.escrow_id:
            try:
                escrow_id = uuid.UUID(room_data.escrow_id) if isinstance(room_data.escrow_id, str) else room_data.escrow_id
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid escrow ID format"
                )
            
            escrow = db.query(Escrow).filter(Escrow.id == escrow_id).first()
            if not escrow:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Escrow transaction not found"
                )
        
        # Create chat room
        db_room = ChatRoom(
            name=room_data.name,
            room_type=room_data.room_type,
            property_id=property_id,
            escrow_id=escrow_id,
            created_by=current_user.id
        )
        
        db.add(db_room)
        db.commit()
        db.refresh(db_room)
        
        # Add participants with individual commits to avoid UUID mismatch
        participants = []
        try:
            for user_id_str in room_data.participant_ids:
                # Convert string to UUID if needed
                try:
                    user_id = uuid.UUID(user_id_str) if isinstance(user_id_str, str) else user_id_str
                except (ValueError, TypeError):
                    print(f"Invalid UUID format: {user_id_str}")
                    continue
                    
                # Verify user exists
                user = db.query(User).filter(User.id == user_id).first()
                if not user:
                    print(f"User not found: {user_id}")
                    continue
                
                participant = ChatParticipant(
                    room_id=db_room.id,
                    user_id=user_id,
                    role="admin" if str(user_id) == str(current_user.id) else "member"
                )
                db.add(participant)
                db.commit()  # Commit each participant individually
                db.refresh(participant)  # Refresh to get the full object
                participants.append(participant)
                print(f"Successfully created participant: {participant.id}")
            
            # Add creator if not already in participants
            creator_id_str = str(current_user.id)
            if creator_id_str not in room_data.participant_ids:
                creator_participant = ChatParticipant(
                    room_id=db_room.id,
                    user_id=current_user.id,
                    role="admin"
                )
                db.add(creator_participant)
                db.commit()  # Commit creator participant individually
                db.refresh(creator_participant)  # Refresh to get the full object
                participants.append(creator_participant)
                print(f"Successfully created creator participant: {creator_participant.id}")
            
        except Exception as e:
            db.rollback()
            print(f"Error creating participants: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create chat room participants"
            )
        
        # Return room with details - clean up SQLAlchemy state
        room_dict = {
            'id': db_room.id,
            'name': db_room.name,
            'room_type': db_room.room_type,
            'property_id': db_room.property_id,
            'escrow_id': db_room.escrow_id,
            'created_by': db_room.created_by,
            'is_active': db_room.is_active,
            'created_at': db_room.created_at,
            'updated_at': db_room.updated_at,
            'participants': [],
            'message_count': 0,
            'last_message': None
        }
        
        # Convert participants to clean dictionaries
        for participant in participants:
            participant_dict = {
                'id': participant.id,
                'room_id': participant.room_id,
                'user_id': participant.user_id,
                'role': participant.role,
                'joined_at': participant.joined_at,
                'is_active': participant.is_active
            }
            room_dict['participants'].append(participant_dict)
        
        return ChatRoomWithDetails(**room_dict)
        
    except Exception as e:
        db.rollback()
        error_msg = str(e) if e else "Unknown error"
        print(f"Error creating chat room: {error_msg}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create chat room: {error_msg}"
        )

@router.get("/rooms", response_model=List[ChatRoomWithDetails])
def list_chat_rooms(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=100, description="Number of records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List chat rooms for the current user"""
    # Get rooms where user is a participant
    rooms = db.query(ChatRoom).join(ChatParticipant).filter(
        ChatParticipant.user_id == current_user.id,
        ChatParticipant.is_active == True,
        ChatRoom.is_active == True
    ).offset(skip).limit(limit).all()
    
    result = []
    for room in rooms:
        # Get participants
        participants = db.query(ChatParticipant).filter(
            ChatParticipant.room_id == room.id,
            ChatParticipant.is_active == True
        ).all()
        
        # Get message count
        message_count = db.query(ChatMessage).filter(
            ChatMessage.room_id == room.id,
            ChatMessage.is_deleted == False
        ).count()
        
        # Skip rooms with no messages
        if message_count == 0:
            continue
        
        # Get last message
        last_message = db.query(ChatMessage).filter(
            ChatMessage.room_id == room.id,
            ChatMessage.is_deleted == False
        ).order_by(ChatMessage.created_at.desc()).first()
        
        # Add sender_name to last_message if it exists
        if last_message:
            sender = db.query(User).filter(User.id == last_message.sender_id).first()
            last_message.sender_name = sender.name if sender else "Unknown User"
        
        # Get property details if room is associated with a property
        property_title = None
        property_location = None
        agent_name = None
        agent_rating = None
        agent_avatar = None
        
        if room.property_id:
            from app.models.property import Property
            property_obj = db.query(Property).filter(Property.id == room.property_id).first()
            if property_obj:
                property_title = property_obj.title
                property_location = property_obj.location
                agent_name = property_obj.agent_name
                agent_rating = float(property_obj.agent_rating) if property_obj.agent_rating else None
                # Generate agent avatar from name
                if agent_name:
                    agent_avatar = agent_name[0].upper()
        
        # Generate last message sender avatar
        last_message_sender_avatar = None
        if last_message and last_message.sender_name:
            last_message_sender_avatar = last_message.sender_name[0].upper()
        
        room_dict = room.__dict__.copy()
        room_dict['participants'] = participants
        room_dict['message_count'] = message_count
        room_dict['property_title'] = property_title
        room_dict['property_location'] = property_location
        room_dict['agent_name'] = agent_name
        room_dict['agent_rating'] = agent_rating
        room_dict['agent_avatar'] = agent_avatar
        room_dict['last_message_sender_avatar'] = last_message_sender_avatar
        room_dict['last_message'] = last_message
        
        result.append(ChatRoomWithDetails(**room_dict))
    
    return result

@router.get("/rooms/{room_id}", response_model=ChatRoomWithDetails)
def get_chat_room(
    room_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific chat room"""
    # Check if user is participant
    participant = db.query(ChatParticipant).filter(
        ChatParticipant.room_id == room_id,
        ChatParticipant.user_id == current_user.id,
        ChatParticipant.is_active == True
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this chat room"
        )
    
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat room not found"
        )
    
    # Get participants
    participants = db.query(ChatParticipant).filter(
        ChatParticipant.room_id == room.id,
        ChatParticipant.is_active == True
    ).all()
    
    # Get message count
    message_count = db.query(ChatMessage).filter(
        ChatMessage.room_id == room.id,
        ChatMessage.is_deleted == False
    ).count()
    
    # Get last message
    last_message = db.query(ChatMessage).filter(
        ChatMessage.room_id == room.id,
        ChatMessage.is_deleted == False
    ).order_by(ChatMessage.created_at.desc()).first()
    
    # Add sender_name to last_message if it exists
    if last_message:
        sender = db.query(User).filter(User.id == last_message.sender_id).first()
        last_message.sender_name = sender.name if sender else "Unknown User"
    
    room_dict = room.__dict__.copy()
    room_dict['participants'] = participants
    room_dict['message_count'] = message_count
    room_dict['last_message'] = last_message
    
    return ChatRoomWithDetails(**room_dict)

@router.get("/rooms/{room_id}/messages", response_model=List[ChatMessageWithDetails])
def get_chat_messages(
    room_id: str,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Number of records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messages from a chat room"""
    # Check if user is participant
    participant = db.query(ChatParticipant).filter(
        ChatParticipant.room_id == room_id,
        ChatParticipant.user_id == current_user.id,
        ChatParticipant.is_active == True
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this chat room"
        )
    
    # Get messages
    messages = db.query(ChatMessage).filter(
        ChatMessage.room_id == room_id,
        ChatMessage.is_deleted == False
    ).order_by(ChatMessage.created_at.desc()).offset(skip).limit(limit).all()
    
    # Update last read timestamp
    participant.last_read_at = datetime.utcnow()
    db.commit()
    
    result = []
    for message in messages:
        # Create clean dictionary without SQLAlchemy state
        message_dict = {
            'id': message.id,
            'room_id': message.room_id,
            'sender_id': message.sender_id,
            'content': message.content,
            'message_type': message.message_type,
            'file_url': message.file_url,
            'file_name': message.file_name,
            'file_size': message.file_size,
            'reply_to_id': message.reply_to_id,
            'is_edited': message.is_edited,
            'is_deleted': message.is_deleted,
            'created_at': message.created_at,
            'updated_at': message.updated_at
        }
        
        # Get sender name
        sender = db.query(User).filter(User.id == message.sender_id).first()
        message_dict['sender_name'] = sender.name if sender else "Unknown"
        
        # Get room name
        room = db.query(ChatRoom).filter(ChatRoom.id == message.room_id).first()
        message_dict['room_name'] = room.name if room else None
        
        result.append(ChatMessageWithDetails(**message_dict))
    
    return result

@router.post("/rooms/{room_id}/messages", response_model=ChatMessageWithDetails, status_code=status.HTTP_201_CREATED)
async def send_message(
    room_id: str,
    message_data: ChatMessageSend,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message to a chat room"""
    # Check if user is participant
    participant = db.query(ChatParticipant).filter(
        ChatParticipant.room_id == room_id,
        ChatParticipant.user_id == current_user.id,
        ChatParticipant.is_active == True
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this chat room"
        )
    
    # Create message
    db_message = ChatMessage(
        room_id=room_id,
        sender_id=current_user.id,
        content=message_data.content,
        message_type=message_data.message_type,
        file_url=message_data.file_url,
        file_name=message_data.file_name,
        file_size=message_data.file_size,
        reply_to_id=message_data.reply_to_id
    )
    
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    # Get room details for notifications
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    
    # Broadcast to WebSocket connections
    message_dict = {
        "id": str(db_message.id),
        "room_id": str(db_message.room_id),
        "sender_id": str(db_message.sender_id),
        "sender_name": current_user.name,
        "content": db_message.content,
        "message_type": db_message.message_type,
        "file_url": db_message.file_url,
        "file_name": db_message.file_name,
        "created_at": db_message.created_at.isoformat()
    }
    
    # Broadcast to WebSocket connections in the room
    await manager.broadcast_to_room(json.dumps({
        "type": "message",
        "data": message_dict,
        "room_id": room_id,
        "sender_id": str(current_user.id),
        "sender_name": current_user.name
    }), room_id, str(current_user.id))
    
    # Send notification to all participants in the room (except sender)
    participants = db.query(ChatParticipant).filter(
        ChatParticipant.room_id == room_id,
        ChatParticipant.is_active == True,
        ChatParticipant.user_id != current_user.id
    ).all()
    
    for participant in participants:
        await manager.send_personal_message(json.dumps({
            "type": "notification",
            "data": {
                "type": "message",
                "title": f"New message from {current_user.name}",
                "message": message_data.content[:50] + "..." if len(message_data.content) > 50 else message_data.content,
                "chatRoomId": room_id,
                "propertyId": room.property_id if room else None
            }
        }), str(participant.user_id))
    
    # Return message with details
    message_dict = db_message.__dict__.copy()
    message_dict['sender_name'] = current_user.name
    message_dict['room_name'] = room.name if room else None
    
    return ChatMessageWithDetails(**message_dict)

@router.put("/rooms/{room_id}/messages/{message_id}", response_model=ChatMessageWithDetails)
def edit_message(
    room_id: str,
    message_id: str,
    message_data: ChatMessageUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Edit a message in a chat room"""
    try:
        # Convert message_id to UUID
        message_uuid = uuid.UUID(message_id) if isinstance(message_id, str) else message_id
        room_uuid = uuid.UUID(room_id) if isinstance(room_id, str) else room_id
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid message or room ID format"
        )
    
    # Get the message
    message = db.query(ChatMessage).filter(
        ChatMessage.id == message_uuid,
        ChatMessage.room_id == room_uuid,
        ChatMessage.sender_id == current_user.id,
        ChatMessage.is_deleted == False
    ).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found or you don't have permission to edit it"
        )
    
    # Update message content
    message.content = message_data.content
    message.is_edited = True
    message.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(message)
    
    # Create response with sender name
    message_dict = {
        'id': message.id,
        'room_id': message.room_id,
        'sender_id': message.sender_id,
        'content': message.content,
        'message_type': message.message_type,
        'file_url': message.file_url,
        'file_name': message.file_name,
        'file_size': message.file_size,
        'reply_to_id': message.reply_to_id,
        'is_edited': message.is_edited,
        'is_deleted': message.is_deleted,
        'created_at': message.created_at,
        'updated_at': message.updated_at
    }
    
    # Get sender name
    sender = db.query(User).filter(User.id == message.sender_id).first()
    message_dict['sender_name'] = sender.name if sender else "Unknown"
    
    # Get room name
    room = db.query(ChatRoom).filter(ChatRoom.id == message.room_id).first()
    message_dict['room_name'] = room.name if room else None
    
    return ChatMessageWithDetails(**message_dict)

@router.delete("/rooms/{room_id}/messages/{message_id}")
def delete_message(
    room_id: str,
    message_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a message in a chat room (soft delete)"""
    try:
        # Convert message_id to UUID
        message_uuid = uuid.UUID(message_id) if isinstance(message_id, str) else message_id
        room_uuid = uuid.UUID(room_id) if isinstance(room_id, str) else room_id
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid message or room ID format"
        )
    
    # Get the message
    message = db.query(ChatMessage).filter(
        ChatMessage.id == message_uuid,
        ChatMessage.room_id == room_uuid,
        ChatMessage.sender_id == current_user.id,
        ChatMessage.is_deleted == False
    ).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found or you don't have permission to delete it"
        )
    
    # Soft delete the message
    message.is_deleted = True
    message.content = "This message was deleted"
    message.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Message deleted successfully"}

@router.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, user_id: str = Query(...)):
    """WebSocket endpoint for real-time chat"""
    await manager.connect(websocket, user_id)
    await manager.join_room(user_id, room_id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Broadcast to all participants in the room
            await manager.broadcast_to_room(data, room_id, user_id)
            
    except WebSocketDisconnect:
        manager.disconnect(user_id)
        await manager.leave_room(user_id, room_id)

@router.websocket("/ws/notifications")
async def notification_websocket_endpoint(websocket: WebSocket, user_id: str = Query(...)):
    """WebSocket endpoint for global notifications"""
    await manager.connect(websocket, user_id)
    
    try:
        while True:
            # Keep connection alive and handle any incoming messages
            data = await websocket.receive_text()
            # For now, just echo back to keep connection alive
            await websocket.send_text(data)
            
    except WebSocketDisconnect:
        manager.disconnect(user_id)
