from sqlalchemy import Column, String, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum

from app.database import Base

class MediaType(str, enum.Enum):
    IMAGE = "image"
    VIDEO = "video"
    DOCUMENT = "document"

class Media(Base):
    __tablename__ = "media"

    id = Column(UUID(as_uuid=False), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=False), ForeignKey("properties.id"), nullable=False)
    media_type = Column(Enum(MediaType), nullable=False)
    url = Column(String(500), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    # Temporarily disable for local development
    # property = relationship("Property", back_populates="media")

    def __repr__(self):
        return f"<Media(id={self.id}, type={self.media_type}, url={self.url})>"