from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
import uuid
from datetime import datetime
import json

from app.models.chat import ChatRoom, ChatParticipant, ChatMessage
from app.models.user import User
from app.models.property import Property
from app.schemas.chat import ChatRoomWithDetails, ChatMessageWithDetails
from app.cache import cache_service
from app.database_optimized import get_optimized_chat_rooms_query, get_optimized_chat_messages_query

class ChatService:
    def __init__(self, db: Session):
        self.db = db
    
    async def get_user_chat_rooms(self, user_id: str, skip: int = 0, limit: int = 100) -> List[ChatRoomWithDetails]:
        """Get chat rooms for user with caching"""
        cache_key = f"user_chat_rooms:{user_id}:{skip}:{limit}"
        
        # Try cache first
        cached_result = await cache_service.get("chat_rooms", cache_key)
        if cached_result:
            return [ChatRoomWithDetails(**room) for room in cached_result]
        
        # Optimized database query
        rooms = get_optimized_chat_rooms_query(self.db, user_id, skip, limit).all()
        
        result = []
        for room in rooms:
            # Get message count efficiently
            message_count = len([m for m in room.messages if not m.is_deleted])
            
            # Skip rooms with no messages
            if message_count == 0:
                continue
            
            # Get last message
            last_message = None
            if room.messages:
                # Messages are already loaded, find the latest
                active_messages = [m for m in room.messages if not m.is_deleted]
                if active_messages:
                    last_message = max(active_messages, key=lambda m: m.created_at)
                    if last_message and last_message.sender:
                        last_message.sender_name = last_message.sender.name
            
            # Build room details
            room_dict = {
                'id': room.id,
                'name': room.name,
                'room_type': room.room_type,
                'property_id': room.property_id,
                'escrow_id': room.escrow_id,
                'created_by': room.created_by,
                'is_active': room.is_active,
                'created_at': room.created_at,
                'updated_at': room.updated_at,
                'participants': [
                    {
                        'id': p.id,
                        'room_id': p.room_id,
                        'user_id': p.user_id,
                        'role': p.role,
                        'joined_at': p.joined_at,
                        'is_active': p.is_active
                    } for p in room.participants if p.is_active
                ],
                'message_count': message_count,
                'last_message': last_message,
                'property_title': room.property.title if room.property else None,
                'property_location': room.property.location if room.property else None,
                'agent_name': room.property.agent_name if room.property else None,
                'agent_rating': float(room.property.agent_rating) if room.property and room.property.agent_rating else None,
                'agent_avatar': room.property.agent_name[0].upper() if room.property and room.property.agent_name else None,
                'last_message_sender_avatar': last_message.sender_name[0].upper() if last_message and last_message.sender_name else None
            }
            
            result.append(ChatRoomWithDetails(**room_dict))
        
        # Cache the result
        await cache_service.set("chat_rooms", cache_key, [room.dict() for room in result])
        
        return result
    
    async def get_chat_room(self, room_id: str, user_id: str) -> Optional[ChatRoomWithDetails]:
        """Get specific chat room with caching"""
        cache_key = f"room:{room_id}:{user_id}"
        
        # Try cache first
        cached_result = await cache_service.get("chat_rooms", cache_key)
        if cached_result:
            return ChatRoomWithDetails(**cached_result)
        
        # Database query with proper joins
        room = self.db.query(ChatRoom)\
            .options(
                joinedload(ChatRoom.participants).joinedload(ChatParticipant.user),
                joinedload(ChatRoom.property),
                joinedload(ChatRoom.messages).joinedload(ChatMessage.sender)
            )\
            .filter(ChatRoom.id == room_id)\
            .first()
        
        if not room:
            return None
        
        # Check if user is participant
        participant = next((p for p in room.participants if p.user_id == user_id and p.is_active), None)
        if not participant and room.room_type != 'property':
            return None
        
        # Build room details
        room_dict = {
            'id': room.id,
            'name': room.name,
            'room_type': room.room_type,
            'property_id': room.property_id,
            'escrow_id': room.escrow_id,
            'created_by': room.created_by,
            'is_active': room.is_active,
            'created_at': room.created_at,
            'updated_at': room.updated_at,
            'participants': [
                {
                    'id': p.id,
                    'room_id': p.room_id,
                    'user_id': p.user_id,
                    'role': p.role,
                    'joined_at': p.joined_at,
                    'is_active': p.is_active
                } for p in room.participants if p.is_active
            ],
            'message_count': len([m for m in room.messages if not m.is_deleted]),
            'last_message': None,
            'property_title': room.property.title if room.property else None,
            'property_location': room.property.location if room.property else None,
            'agent_name': room.property.agent_name if room.property else None,
            'agent_rating': float(room.property.agent_rating) if room.property and room.property.agent_rating else None
        }
        
        # Get last message
        active_messages = [m for m in room.messages if not m.is_deleted]
        if active_messages:
            last_message = max(active_messages, key=lambda m: m.created_at)
            if last_message and last_message.sender:
                last_message.sender_name = last_message.sender.name
            room_dict['last_message'] = last_message
        
        result = ChatRoomWithDetails(**room_dict)
        
        # Cache the result
        await cache_service.set("chat_rooms", cache_key, result.dict())
        
        return result
    
    async def get_chat_messages(self, room_id: str, user_id: str, skip: int = 0, limit: int = 50) -> List[ChatMessageWithDetails]:
        """Get chat messages with caching"""
        cache_key = f"messages:{room_id}:{skip}:{limit}"
        
        # Try cache first
        cached_result = await cache_service.get("messages", cache_key)
        if cached_result:
            return [ChatMessageWithDetails(**msg) for msg in cached_result]
        
        # Check if user is participant
        participant = self.db.query(ChatParticipant).filter(
            ChatParticipant.room_id == room_id,
            ChatParticipant.user_id == user_id,
            ChatParticipant.is_active == True
        ).first()
        
        if not participant:
            return []
        
        # Optimized database query
        messages = get_optimized_chat_messages_query(self.db, room_id, skip, limit).all()
        
        result = []
        for message in messages:
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
                'updated_at': message.updated_at,
                'sender_name': message.sender.name if message.sender else "Unknown",
                'room_name': message.room.name if message.room else None
            }
            result.append(ChatMessageWithDetails(**message_dict))
        
        # Update last read timestamp
        participant.last_read_at = datetime.utcnow()
        self.db.commit()
        
        # Cache the result
        await cache_service.set("messages", cache_key, [msg.dict() for msg in result])
        
        return result
    
    async def create_chat_room(self, room_data: dict, creator_id: str) -> ChatRoomWithDetails:
        """Create chat room and invalidate cache"""
        # Create room
        room = ChatRoom(
            name=room_data.get('name'),
            room_type=room_data.get('room_type', 'private'),
            property_id=room_data.get('property_id'),
            escrow_id=room_data.get('escrow_id'),
            created_by=creator_id
        )
        
        self.db.add(room)
        self.db.commit()
        self.db.refresh(room)
        
        # Add participants
        for user_id_str in room_data.get('participant_ids', []):
            user_id = uuid.UUID(user_id_str) if isinstance(user_id_str, str) else user_id_str
            participant = ChatParticipant(
                room_id=room.id,
                user_id=user_id,
                role="admin" if str(user_id) == str(creator_id) else "member"
            )
            self.db.add(participant)
        
        self.db.commit()
        
        # Invalidate cache
        await cache_service.invalidate_user_cache(creator_id)
        
        # Return room details
        return await self.get_chat_room(str(room.id), creator_id)
    
    async def send_message(self, room_id: str, message_data: dict, sender_id: str) -> ChatMessageWithDetails:
        """Send message and invalidate cache"""
        # Create message
        message = ChatMessage(
            room_id=room_id,
            sender_id=sender_id,
            content=message_data['content'],
            message_type=message_data.get('message_type', 'text'),
            file_url=message_data.get('file_url'),
            file_name=message_data.get('file_name'),
            file_size=message_data.get('file_size'),
            reply_to_id=message_data.get('reply_to_id')
        )
        
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        
        # Invalidate cache
        await cache_service.delete_pattern(f"messages:{room_id}:*")
        await cache_service.delete_pattern(f"chat_rooms:*{sender_id}*")
        
        # Get message with details
        message_with_details = self.db.query(ChatMessage)\
            .options(
                joinedload(ChatMessage.sender),
                joinedload(ChatMessage.room)
            )\
            .filter(ChatMessage.id == message.id)\
            .first()
        
        message_dict = {
            'id': message_with_details.id,
            'room_id': message_with_details.room_id,
            'sender_id': message_with_details.sender_id,
            'content': message_with_details.content,
            'message_type': message_with_details.message_type,
            'file_url': message_with_details.file_url,
            'file_name': message_with_details.file_name,
            'file_size': message_with_details.file_size,
            'reply_to_id': message_with_details.reply_to_id,
            'is_edited': message_with_details.is_edited,
            'is_deleted': message_with_details.is_deleted,
            'created_at': message_with_details.created_at,
            'updated_at': message_with_details.updated_at,
            'sender_name': message_with_details.sender.name if message_with_details.sender else "Unknown",
            'room_name': message_with_details.room.name if message_with_details.room else None
        }
        
        return ChatMessageWithDetails(**message_dict)
