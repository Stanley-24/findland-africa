from sqlalchemy import Column, String, DateTime, Boolean, Enum, Text, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum

from app.database import Base

class PropertyType(str, enum.Enum):
    RENT = "rent"
    SALE = "sale"

class PropertyStatus(str, enum.Enum):
    AVAILABLE = "available"
    PENDING = "pending"
    SOLD = "sold"
    RENTED = "rented"

class Property(Base):
    __tablename__ = "properties"

    id = Column(UUID(as_uuid=False), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(Enum(PropertyType), nullable=False)
    price = Column(Numeric(15, 2), nullable=False)
    location = Column(String(500), nullable=False)
    status = Column(Enum(PropertyStatus), default=PropertyStatus.AVAILABLE, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="properties")
    media = relationship("Media", back_populates="property", cascade="all, delete-orphan")
    escrow_transactions = relationship("Escrow", back_populates="property")

    def __repr__(self):
        return f"<Property(id={self.id}, title={self.title}, type={self.type}, price={self.price})>"
