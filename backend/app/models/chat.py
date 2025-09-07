from sqlalchemy import Column, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.database import Base

class ChatRoom(Base):
    __tablename__ = "chat_rooms"

    id = Column(UUID(as_uuid=False), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=True)  # Optional room name
    room_type = Column(String(50), default="private", nullable=False)  # private, group, property
    property_id = Column(UUID(as_uuid=False), ForeignKey("properties.id"), nullable=True)
    escrow_id = Column(UUID(as_uuid=False), ForeignKey("escrow.id"), nullable=True)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    # Temporarily disable for local development
    # property = relationship("Property", back_populates="chat_rooms")
    # creator = relationship("User", foreign_keys=[created_by], back_populates="created_chat_rooms")
    # participants = relationship("ChatParticipant", back_populates="room", cascade="all, delete-orphan")
    # messages = relationship("ChatMessage", back_populates="room", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ChatRoom(id={self.id}, type={self.room_type}, active={self.is_active})>"

class ChatParticipant(Base):
    __tablename__ = "chat_participants"

    id = Column(UUID(as_uuid=False), primary_key=True, default=uuid.uuid4)
    room_id = Column(UUID(as_uuid=False), ForeignKey("chat_rooms.id"), nullable=False)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    role = Column(String(50), default="member", nullable=False)  # member, admin, agent
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    last_read_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    # Temporarily disable for local development
    # room = relationship("ChatRoom", back_populates="participants")
    # user = relationship("User", back_populates="chat_participations")

    def __repr__(self):
        return f"<ChatParticipant(user_id={self.user_id}, room_id={self.room_id}, role={self.role})>"

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=False), primary_key=True, default=uuid.uuid4)
    room_id = Column(UUID(as_uuid=False), ForeignKey("chat_rooms.id"), nullable=False)
    sender_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    message_type = Column(String(50), default="text", nullable=False)  # text, image, file, voice, video
    content = Column(Text, nullable=False)
    file_url = Column(String(500), nullable=True)  # For media messages
    file_name = Column(String(255), nullable=True)
    file_size = Column(String(50), nullable=True)
    reply_to_id = Column(UUID(as_uuid=False), ForeignKey("chat_messages.id"), nullable=True)
    is_edited = Column(Boolean, default=False, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    # Temporarily disable for local development
    # room = relationship("ChatRoom", back_populates="messages")
    # sender = relationship("User", back_populates="chat_messages")
    # reply_to = relationship("ChatMessage", remote_side=[id])

    def __repr__(self):
        return f"<ChatMessage(id={self.id}, type={self.message_type}, sender={self.sender_id})>"
