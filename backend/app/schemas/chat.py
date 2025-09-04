from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ChatRoomBase(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    room_type: str = Field(default="private", max_length=50)
    property_id: Optional[str] = None
    escrow_id: Optional[str] = None

class ChatRoomCreate(ChatRoomBase):
    participant_ids: List[str] = Field(..., min_items=1, description="List of user IDs to add to the room")

class ChatRoomUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None

class ChatRoomInDB(ChatRoomBase):
    id: str
    created_by: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ChatRoom(ChatRoomInDB):
    pass

class ChatRoomWithDetails(ChatRoom):
    participants: List['ChatParticipant'] = []
    message_count: int = 0
    last_message: Optional['ChatMessage'] = None
    # Property details for display
    property_title: Optional[str] = None
    property_location: Optional[str] = None
    agent_name: Optional[str] = None
    agent_rating: Optional[float] = None
    # User avatar information
    agent_avatar: Optional[str] = None
    last_message_sender_avatar: Optional[str] = None

class ChatParticipantBase(BaseModel):
    role: str = Field(default="member", max_length=50)

class ChatParticipantCreate(ChatParticipantBase):
    user_id: str

class ChatParticipantInDB(ChatParticipantBase):
    id: str
    room_id: str
    user_id: str
    joined_at: datetime
    last_read_at: Optional[datetime] = None
    is_active: bool

    class Config:
        from_attributes = True

class ChatParticipant(ChatParticipantInDB):
    user_name: Optional[str] = None

class ChatMessageBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    message_type: str = Field(default="text", max_length=50)
    file_url: Optional[str] = Field(None, max_length=500)
    file_name: Optional[str] = Field(None, max_length=255)
    file_size: Optional[str] = Field(None, max_length=50)
    reply_to_id: Optional[str] = None

class ChatMessageCreate(ChatMessageBase):
    room_id: str

class ChatMessageSend(ChatMessageBase):
    """Schema for sending messages (without room_id since it comes from path)"""
    pass

class ChatMessageUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)

class ChatMessageInDB(ChatMessageBase):
    id: str
    room_id: str
    sender_id: str
    is_edited: bool
    is_deleted: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ChatMessage(ChatMessageInDB):
    sender_name: Optional[str] = None
    reply_to_message: Optional['ChatMessage'] = None

class ChatMessageWithDetails(ChatMessage):
    room_name: Optional[str] = None

# Update forward references
ChatRoomWithDetails.model_rebuild()
ChatMessage.model_rebuild()
ChatMessageWithDetails.model_rebuild()
