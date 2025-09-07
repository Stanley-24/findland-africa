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
    ChatRoomCreate, ChatRoomUpdate, ChatRoomBatchDelete, ChatRoomWithDetails,
    ChatParticipantCreate, ChatMessageCreate, ChatMessageSend, ChatMessageUpdate,
    ChatMessageWithDetails
)

def convert_property_room_id_to_uuid(room_id: str) -> str:
    """Convert property-based room ID to proper UUID format"""
    if room_id.startswith('property_'):
        property_id = room_id.replace('property_', '')
        # Generate a consistent UUID based on property ID
        import hashlib
        hash_obj = hashlib.md5(f"property_chat_{property_id}".encode())
        return str(uuid.UUID(hash_obj.hexdigest()))
    elif room_id.startswith('temp_'):
        # Handle temporary room IDs - extract property ID and generate consistent UUID
        # Format: temp_{property_id}_{timestamp}
        parts = room_id.split('_')
        if len(parts) >= 3:
            property_id = parts[1]  # Get the property ID from temp_{property_id}_{timestamp}
            import hashlib
            hash_obj = hashlib.md5(f"property_chat_{property_id}".encode())
            return str(uuid.UUID(hash_obj.hexdigest()))
    return room_id

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
    
    # Get sender name for last message
    last_message_sender_name = None
    if last_message:
        sender = db.query(User).filter(User.id == last_message.sender_id).first()
        last_message_sender_name = sender.name if sender else "Unknown User"
    
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
    
    # Serialize last message with sender_name
    last_message_dict = None
    if last_message:
        last_message_dict = {
            'id': str(last_message.id),
            'room_id': str(last_message.room_id),
            'sender_id': str(last_message.sender_id),
            'sender_name': last_message_sender_name,
            'content': last_message.content,
            'message_type': last_message.message_type,
            'is_edited': last_message.is_edited,
            'is_deleted': last_message.is_deleted,
            'created_at': last_message.created_at,
            'updated_at': last_message.updated_at
        }
    room_dict['last_message'] = last_message_dict
    
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
    
    async def broadcast_typing_indicator(self, room_id: str, user_id: str, user_name: str, is_typing: bool):
        """Broadcast typing indicator to all users in the room except the sender"""
        if room_id in self.room_connections:
            message = json.dumps({
                "type": "typing",
                "data": {
                    "type": "typing_start" if is_typing else "typing_stop",
                    "user_id": user_id,
                    "user_name": user_name,
                    "room_id": room_id
                }
            })
            
            for room_user_id in self.room_connections[room_id]:
                if room_user_id != user_id and room_user_id in self.active_connections:
                    await self.active_connections[room_user_id].send_text(message)
    
    async def broadcast_to_all(self, message: str, exclude_user: Optional[str] = None):
        """Broadcast message to all connected users"""
        for user_id, websocket in self.active_connections.items():
            if user_id != exclude_user:
                try:
                    await websocket.send_text(message)
                except Exception as e:
                    print(f"Error sending message to user {user_id}: {e}")
                    # Remove disconnected user
                    del self.active_connections[user_id]

manager = ConnectionManager()

@router.post("/rooms", response_model=ChatRoomWithDetails, status_code=status.HTTP_201_CREATED)
async def create_chat_room(
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
        
        # Broadcast room creation to all connected users
        await manager.broadcast_to_all(json.dumps({
            "type": "room_created",
            "data": room_dict
        }))
        
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
        
        # Get sender name for last message
        last_message_sender_name = None
        if last_message:
            sender = db.query(User).filter(User.id == last_message.sender_id).first()
            last_message_sender_name = sender.name if sender else "Unknown User"
        
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
        if last_message_sender_name:
            last_message_sender_avatar = last_message_sender_name[0].upper()
        
        room_dict = room.__dict__.copy()
        room_dict['participants'] = participants
        room_dict['message_count'] = message_count
        room_dict['property_title'] = property_title
        room_dict['property_location'] = property_location
        room_dict['agent_name'] = agent_name
        room_dict['agent_rating'] = agent_rating
        room_dict['agent_avatar'] = agent_avatar
        room_dict['last_message_sender_avatar'] = last_message_sender_avatar
        
        # Serialize last message with sender_name
        last_message_dict = None
        if last_message:
            last_message_dict = {
                'id': str(last_message.id),
                'room_id': str(last_message.room_id),
                'sender_id': str(last_message.sender_id),
                'sender_name': last_message_sender_name,
                'content': last_message.content,
                'message_type': last_message.message_type,
                'is_edited': last_message.is_edited,
                'is_deleted': last_message.is_deleted,
                'created_at': last_message.created_at,
                'updated_at': last_message.updated_at
            }
        room_dict['last_message'] = last_message_dict
        
        result.append(ChatRoomWithDetails(**room_dict))
    
    return result

@router.get("/rooms/{room_id}", response_model=ChatRoomWithDetails)
def get_chat_room(
    room_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific chat room"""
    # Convert property-based room ID to proper UUID format if needed
    actual_room_id = convert_property_room_id_to_uuid(room_id)
    
    room = db.query(ChatRoom).filter(ChatRoom.id == actual_room_id).first()
    
    # If room found and this is a property-based room ID, ensure it has the correct property_id
    if room and room_id.startswith('property_'):
        property_id = room_id.replace('property_', '')
        if not room.property_id:
            room.property_id = property_id
            db.commit()
            db.refresh(room)
    
    # If room found and this is a temporary room ID, ensure it has the correct property_id
    elif room and room_id.startswith('temp_'):
        parts = room_id.split('_')
        if len(parts) >= 3:
            property_id = parts[1]
            if not room.property_id:
                room.property_id = property_id
                db.commit()
                db.refresh(room)
    
    # If room not found and this is a property-based room ID, check for existing rooms for this property
    elif not room and room_id.startswith('property_'):
        property_id = room_id.replace('property_', '')
        # Check if there's an existing room for this property
        existing_room = db.query(ChatRoom).filter(
            ChatRoom.property_id == property_id,
            ChatRoom.room_type == 'property'
        ).first()
        
        if existing_room:
            # Use the existing room
            room = existing_room
        else:
            # Verify the property exists
            property_obj = db.query(Property).filter(Property.id == property_id).first()
            if not property_obj:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Property not found"
                )
            
            try:
                # Create the chat room
                room = ChatRoom(
                    id=actual_room_id,
                    name=f"Chat about {property_obj.title}",
                    room_type="property",
                    property_id=property_id,
                    created_by=current_user.id
                )
                db.add(room)
                db.commit()
                db.refresh(room)
                
                # Add the current user as a participant
                participant = ChatParticipant(
                    room_id=room.id,
                    user_id=current_user.id,
                    role="member",
                    is_active=True
                )
                db.add(participant)
                db.commit()
            except Exception as e:
                db.rollback()
                print(f"Error creating chat room: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create chat room"
                )
    
    # If room not found and this is a temporary room ID, check for existing rooms for this property
    elif not room and room_id.startswith('temp_'):
        parts = room_id.split('_')
        if len(parts) >= 3:
            property_id = parts[1]
            # Check if there's an existing room for this property
            existing_room = db.query(ChatRoom).filter(
                ChatRoom.property_id == property_id,
                ChatRoom.room_type == 'property'
            ).first()
            
            if existing_room:
                # Use the existing room
                room = existing_room
            else:
                # Verify the property exists
                property_obj = db.query(Property).filter(Property.id == property_id).first()
                if not property_obj:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Property not found"
                    )
                
                # Create the chat room
                room = ChatRoom(
                    id=actual_room_id,
                    name=f"Chat about {property_obj.title}",
                    room_type="property",
                    property_id=property_id,
                    created_by=current_user.id
                )
                db.add(room)
                db.commit()
                db.refresh(room)
                
                # Add the current user as a participant
                participant = ChatParticipant(
                    room_id=room.id,
                    user_id=current_user.id,
                    role="member",
                    is_active=True
                )
                db.add(participant)
                db.commit()
    
    elif not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat room not found"
        )
    
    # For property rooms, allow access to any authenticated user
    # For other rooms, check if user is participant
    if room.room_type != 'property':
        participant = db.query(ChatParticipant).filter(
            ChatParticipant.room_id == actual_room_id,
            ChatParticipant.user_id == current_user.id,
            ChatParticipant.is_active == True
        ).first()
        
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a participant in this chat room"
            )
    
    # Use the helper function to get complete room details including property info
    return get_chat_room_details(room, db)

@router.delete("/rooms/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat_room(
    room_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a chat room"""
    # Convert property-based room ID to proper UUID format if needed
    actual_room_id = convert_property_room_id_to_uuid(room_id)
    
    # Find the room
    room = db.query(ChatRoom).filter(ChatRoom.id == actual_room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat room not found"
        )
    
    # Check if user is a participant in the room
    participant = db.query(ChatParticipant).filter(
        ChatParticipant.room_id == actual_room_id,
        ChatParticipant.user_id == current_user.id,
        ChatParticipant.is_active == True
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this chat room"
        )
    
    # For property rooms, only allow deletion by the creator or admin participants
    if room.room_type == 'property':
        if room.created_by != current_user.id and participant.role != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the room creator or admin can delete this chat room"
            )
    
    # Delete all messages in the room first (cascade should handle this, but being explicit)
    db.query(ChatMessage).filter(ChatMessage.room_id == actual_room_id).delete()
    
    # Delete all participants
    db.query(ChatParticipant).filter(ChatParticipant.room_id == actual_room_id).delete()
    
    # Delete the room
    db.delete(room)
    db.commit()
    
    return None

@router.post("/rooms/batch-delete", status_code=status.HTTP_200_OK)
def batch_delete_chat_rooms(
    batch_data: ChatRoomBatchDelete,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Batch delete multiple chat rooms"""
    deleted_rooms = []
    failed_deletions = []
    
    for room_id in batch_data.room_ids:
        try:
            # Convert property-based room ID to proper UUID format if needed
            actual_room_id = convert_property_room_id_to_uuid(room_id)
            
            # Find the room
            room = db.query(ChatRoom).filter(ChatRoom.id == actual_room_id).first()
            if not room:
                failed_deletions.append({
                    "room_id": room_id,
                    "error": "Chat room not found"
                })
                continue
            
            # Check if user is a participant in the room
            participant = db.query(ChatParticipant).filter(
                ChatParticipant.room_id == actual_room_id,
                ChatParticipant.user_id == current_user.id,
                ChatParticipant.is_active == True
            ).first()
            
            if not participant:
                failed_deletions.append({
                    "room_id": room_id,
                    "error": "You are not a participant in this chat room"
                })
                continue
            
            # For property rooms, only allow deletion by the creator or admin participants
            if room.room_type == 'property':
                if room.created_by != current_user.id and participant.role != 'admin':
                    failed_deletions.append({
                        "room_id": room_id,
                        "error": "Only the room creator or admin can delete this chat room"
                    })
                    continue
            
            # Delete all messages in the room first
            db.query(ChatMessage).filter(ChatMessage.room_id == actual_room_id).delete()
            
            # Delete all participants
            db.query(ChatParticipant).filter(ChatParticipant.room_id == actual_room_id).delete()
            
            # Delete the room
            db.delete(room)
            deleted_rooms.append(room_id)
            
        except Exception as e:
            failed_deletions.append({
                "room_id": room_id,
                "error": str(e)
            })
    
    # Commit all successful deletions
    db.commit()
    
    return {
        "deleted_rooms": deleted_rooms,
        "failed_deletions": failed_deletions,
        "summary": {
            "total_requested": len(batch_data.room_ids),
            "successfully_deleted": len(deleted_rooms),
            "failed": len(failed_deletions)
        }
    }

@router.get("/rooms/{room_id}/messages", response_model=List[ChatMessageWithDetails])
def get_chat_messages(
    room_id: str,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Number of records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messages from a chat room"""
    # Convert property-based room ID to proper UUID format if needed
    actual_room_id = convert_property_room_id_to_uuid(room_id)
    
    # Check if user is participant
    participant = db.query(ChatParticipant).filter(
        ChatParticipant.room_id == actual_room_id,
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
        ChatMessage.room_id == actual_room_id,
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
    # Convert property-based room ID to proper UUID format if needed
    actual_room_id = convert_property_room_id_to_uuid(room_id)
    
    # Check if room exists
    room = db.query(ChatRoom).filter(ChatRoom.id == actual_room_id).first()
    
    # If room found and this is a property-based room ID, ensure it has the correct property_id
    if room and room_id.startswith('property_'):
        property_id = room_id.replace('property_', '')
        if not room.property_id:
            room.property_id = property_id
            db.commit()
            db.refresh(room)
    
    # If room found and this is a temporary room ID, ensure it has the correct property_id
    elif room and room_id.startswith('temp_'):
        parts = room_id.split('_')
        if len(parts) >= 3:
            property_id = parts[1]
            if not room.property_id:
                room.property_id = property_id
                db.commit()
                db.refresh(room)
    
    # If room not found and this is a property-based room ID, check for existing rooms for this property
    elif not room and room_id.startswith('property_'):
        property_id = room_id.replace('property_', '')
        # Check if there's an existing room for this property
        existing_room = db.query(ChatRoom).filter(
            ChatRoom.property_id == property_id,
            ChatRoom.room_type == 'property'
        ).first()
        
        if existing_room:
            # Use the existing room
            room = existing_room
        else:
            # Verify the property exists
            property_obj = db.query(Property).filter(Property.id == property_id).first()
            if not property_obj:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Property not found"
                )
            
            # Create the chat room
            room = ChatRoom(
                id=actual_room_id,
                name=f"Chat about {property_obj.title}",
                room_type="property",
                property_id=property_id,
                created_by=current_user.id
            )
            db.add(room)
            db.commit()
            db.refresh(room)
            
            # Broadcast room_created event
            room_dict = {
                "id": str(room.id),
                "name": room.name,
                "room_type": room.room_type,
                "property_id": room.property_id,
                "property_title": property_obj.title,
                "property_location": property_obj.location,
                "agent_id": property_obj.owner_id,
                "agent_name": property_obj.agent_name or "Unknown",
                "agent_avatar": None,  # No avatar available in current model
                "agent_rating": float(property_obj.agent_rating) if property_obj.agent_rating else None,
                "status": "active",
                "created_at": room.created_at.isoformat(),
                "created_by": str(room.created_by),
                "last_message": None,
                "last_message_sender_avatar": None
            }
            
            await manager.broadcast_to_all(json.dumps({
                "type": "room_created",
                "data": room_dict
            }))
            
            # Add the current user as a participant
            participant = ChatParticipant(
                room_id=room.id,
                user_id=current_user.id,
                role="member",
                is_active=True
            )
            db.add(participant)
            db.commit()
    
    # If room not found and this is a temporary room ID, check for existing rooms for this property
    elif not room and room_id.startswith('temp_'):
        parts = room_id.split('_')
        if len(parts) >= 3:
            property_id = parts[1]
            # Check if there's an existing room for this property
            existing_room = db.query(ChatRoom).filter(
                ChatRoom.property_id == property_id,
                ChatRoom.room_type == 'property'
            ).first()
            
            if existing_room:
                # Use the existing room
                room = existing_room
            else:
                # Verify the property exists
                property_obj = db.query(Property).filter(Property.id == property_id).first()
                if not property_obj:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Property not found"
                    )
                
                # Create the chat room
                room = ChatRoom(
                    id=actual_room_id,
                    name=f"Chat about {property_obj.title}",
                    room_type="property",
                    property_id=property_id,
                    created_by=current_user.id
                )
                db.add(room)
                db.commit()
                db.refresh(room)
                
                # Broadcast room_created event
                room_dict = {
                    "id": str(room.id),
                    "name": room.name,
                    "room_type": room.room_type,
                    "property_id": room.property_id,
                    "property_title": property_obj.title,
                    "property_location": property_obj.location,
                    "agent_id": property_obj.owner_id,
                "agent_name": property_obj.agent_name or "Unknown",
                "agent_avatar": None,  # No avatar available in current model
                "agent_rating": float(property_obj.agent_rating) if property_obj.agent_rating else None,
                    "status": "active",
                    "created_at": room.created_at.isoformat(),
                    "created_by": str(room.created_by),
                    "last_message": None,
                    "last_message_sender_avatar": None
                }
                
                await manager.broadcast_to_all(json.dumps({
                    "type": "room_created",
                    "data": room_dict
                }))
                
                # Add the current user as a participant
                participant = ChatParticipant(
                    room_id=room.id,
                    user_id=current_user.id,
                    role="member",
                    is_active=True
                )
                db.add(participant)
                db.commit()
    
    elif not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat room not found"
        )
    
    # For property rooms, allow access to any authenticated user
    # For other rooms, check if user is participant
    if room.room_type != 'property':
        participant = db.query(ChatParticipant).filter(
            ChatParticipant.room_id == actual_room_id,
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
        room_id=actual_room_id,
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
    room = db.query(ChatRoom).filter(ChatRoom.id == actual_room_id).first()
    
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
        "room_id": actual_room_id,
        "sender_id": str(current_user.id),
        "sender_name": current_user.name
    }), actual_room_id, str(current_user.id))
    
    # Also broadcast to all connected users for notifications
    await manager.broadcast_to_all(json.dumps({
        "type": "message",
        "data": message_dict,
        "room_id": actual_room_id,
        "sender_id": str(current_user.id),
        "sender_name": current_user.name
    }), str(current_user.id))
    
    # Send notification to all participants in the room (except sender)
    participants = db.query(ChatParticipant).filter(
        ChatParticipant.room_id == actual_room_id,
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
            current_user.name, 
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
            current_user.name, 
            False
        )
        
        return {"status": "typing_indicator_stopped"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error stopping typing indicator: {str(e)}")
