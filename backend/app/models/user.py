from sqlalchemy import Column, String, DateTime, Boolean, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum

from app.database import Base

class UserRole(str, enum.Enum):
    BUYER = "buyer"
    SELLER = "seller"
    AGENT = "agent"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone_number = Column(String(20), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.BUYER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    properties = relationship("Property", back_populates="owner")
    escrow_as_buyer = relationship("Escrow", foreign_keys="Escrow.buyer_id", back_populates="buyer")
    escrow_as_seller = relationship("Escrow", foreign_keys="Escrow.seller_id", back_populates="seller")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"
