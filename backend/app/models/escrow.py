from sqlalchemy import Column, String, DateTime, Boolean, Enum, Text, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum

from app.database import Base

class EscrowStatus(str, enum.Enum):
    PENDING = "pending"
    FUNDED = "funded"
    RELEASED = "released"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"

class EscrowType(str, enum.Enum):
    PROPERTY_PURCHASE = "property_purchase"
    RENTAL_DEPOSIT = "rental_deposit"
    BRIDGING_LOAN = "bridging_loan"
    CONTRACT_PAYMENT = "contract_payment"

class Escrow(Base):
    __tablename__ = "escrow"

    id = Column(UUID(as_uuid=False), primary_key=True, default=uuid.uuid4)
    
    # Transaction details
    property_id = Column(UUID(as_uuid=False), ForeignKey("properties.id"), nullable=True)
    buyer_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    seller_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    
    # Financial details
    amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(3), default="NGN", nullable=False)
    escrow_type = Column(Enum(EscrowType), nullable=False)
    
    # Status and metadata
    status = Column(Enum(EscrowStatus), default=EscrowStatus.PENDING, nullable=False)
    description = Column(Text, nullable=True)
    
    # Payment details
    payment_reference = Column(String(255), nullable=True)
    payment_gateway = Column(String(50), nullable=True)  # flutterwave, paystack, etc.
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    funded_at = Column(DateTime(timezone=True), nullable=True)
    released_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Dispute resolution
    dispute_reason = Column(Text, nullable=True)
    dispute_resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    property = relationship("Property", back_populates="escrow_transactions")
    buyer = relationship("User", foreign_keys=[buyer_id], back_populates="escrow_as_buyer")
    seller = relationship("User", foreign_keys=[seller_id], back_populates="escrow_as_seller")

    def __repr__(self):
        return f"<Escrow(id={self.id}, amount={self.amount}, status={self.status})>"
