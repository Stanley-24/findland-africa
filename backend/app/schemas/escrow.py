from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal
from app.models.escrow import EscrowStatus, EscrowType

class EscrowBase(BaseModel):
    property_id: Optional[str] = None
    seller_id: str = Field(..., description="ID of the seller/recipient")
    amount: Decimal = Field(..., gt=0, description="Escrow amount")
    currency: str = Field(default="NGN", max_length=3, description="Currency code")
    escrow_type: EscrowType = Field(..., description="Type of escrow transaction")
    description: Optional[str] = Field(None, max_length=1000, description="Transaction description")
    expires_at: Optional[datetime] = Field(None, description="Escrow expiration date")

class EscrowCreate(EscrowBase):
    pass

class EscrowUpdate(BaseModel):
    description: Optional[str] = Field(None, max_length=1000)
    expires_at: Optional[datetime] = None

class EscrowFund(BaseModel):
    payment_reference: str = Field(..., description="Payment gateway reference")
    payment_gateway: str = Field(..., description="Payment gateway used")

class EscrowRelease(BaseModel):
    reason: Optional[str] = Field(None, max_length=500, description="Reason for release")

class EscrowCancel(BaseModel):
    reason: str = Field(..., max_length=500, description="Reason for cancellation")

class EscrowDispute(BaseModel):
    dispute_reason: str = Field(..., max_length=1000, description="Reason for dispute")

class EscrowInDB(EscrowBase):
    id: str
    buyer_id: str
    status: EscrowStatus
    payment_reference: Optional[str] = None
    payment_gateway: Optional[str] = None
    created_at: datetime
    funded_at: Optional[datetime] = None
    released_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    dispute_reason: Optional[str] = None
    dispute_resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Escrow(EscrowInDB):
    pass

class EscrowWithDetails(Escrow):
    property_title: Optional[str] = None
    buyer_name: str
    seller_name: str
