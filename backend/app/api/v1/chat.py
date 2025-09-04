from fastapi import APIRouter, Depends, HTTPException, status, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import json

from app.database import get_db
from app.models.chat import ChatRoom, ChatParticipant, ChatMessage
from app.models.user import User
from app.models.property import Property
from app.models.escrow import Escrow
from app.schemas.chat import (
    ChatRoomCreate, ChatRoomUpdate, ChatRoomWithDetails,
    ChatParticipantCreate, ChatMessageCreate, ChatMessageUpdate,
    ChatMessageWithDetails
)
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
    # Verify property exists if provided
    if room_data.property_id:
        property = db.query(Property).filter(Property.id == room_data.property_id).first()
        if not property:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )
    
    # Verify escrow exists if provided
    if room_data.escrow_id:
        escrow = db.query(Escrow).filter(Escrow.id == room_data.escrow_id).first()
        if not escrow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Escrow transaction not found"
            )
    
    # Create chat room
    db_room = ChatRoom(
        name=room_data.name,
        room_type=room_data.room_type,
        property_id=room_data.property_id,
        escrow_id=room_data.escrow_id,
        created_by=current_user.id
    )
    
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    
    # Add participants
    participants = []
    for user_id in room_data.participant_ids:
        # Verify user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            continue
        
        participant = ChatParticipant(
            room_id=db_room.id,
            user_id=user_id,
            role="admin" if user_id == current_user.id else "member"
        )
        db.add(participant)
        participants.append(participant)
    
    # Add creator if not already in participants
    if current_user.id not in room_data.participant_ids:
        creator_participant = ChatParticipant(
            room_id=db_room.id,
            user_id=current_user.id,
            role="admin"
        )
        db.add(creator_participant)
        participants.append(creator_participant)
    
    db.commit()
    
    # Return room with details
    room_dict = db_room.__dict__.copy()
    room_dict['participants'] = participants
    room_dict['message_count'] = 0
    room_dict['last_message'] = None
    
    return ChatRoomWithDetails(**room_dict)

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
        
        # Get last message
        last_message = db.query(ChatMessage).filter(
            ChatMessage.room_id == room.id,
            ChatMessage.is_deleted == False
        ).order_by(ChatMessage.created_at.desc()).first()
        
        room_dict = room.__dict__.copy()
        room_dict['participants'] = participants
        room_dict['message_count'] = message_count
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
        message_dict = message.__dict__.copy()
        
        # Get sender name
        sender = db.query(User).filter(User.id == message.sender_id).first()
        message_dict['sender_name'] = sender.name if sender else "Unknown"
        
        # Get room name
        room = db.query(ChatRoom).filter(ChatRoom.id == message.room_id).first()
        message_dict['room_name'] = room.name if room else None
        
        result.append(ChatMessageWithDetails(**message_dict))
    
    return result

@router.post("/rooms/{room_id}/messages", response_model=ChatMessageWithDetails, status_code=status.HTTP_201_CREATED)
def send_message(
    room_id: str,
    message_data: ChatMessageCreate,
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
    
    # This would be handled by WebSocket in real implementation
    # await manager.broadcast_to_room(json.dumps(message_dict), room_id, str(current_user.id))
    
    # Return message with details
    message_dict = db_message.__dict__.copy()
    message_dict['sender_name'] = current_user.name
    
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    message_dict['room_name'] = room.name if room else None
    
    return ChatMessageWithDetails(**message_dict)

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
