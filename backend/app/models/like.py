from sqlalchemy import Column, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.database import Base

class Like(Base):
    __tablename__ = "likes"

    id = Column(UUID(as_uuid=False), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    property_id = Column(UUID(as_uuid=False), ForeignKey("properties.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships - using foreign keys only to avoid circular import issues
    user = relationship("User")
    property = relationship("Property")

    def __repr__(self):
        return f"<Like(user_id={self.user_id}, property_id={self.property_id})>"
