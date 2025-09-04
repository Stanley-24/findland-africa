from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.models.escrow import Escrow, EscrowStatus, EscrowType
from app.models.user import User
from app.models.property import Property
from app.schemas.escrow import (
    EscrowCreate, EscrowUpdate, EscrowFund, EscrowRelease, 
    EscrowCancel, EscrowDispute, Escrow as EscrowSchema, EscrowWithDetails
)
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/escrow", tags=["escrow"])

@router.post("/", response_model=EscrowSchema, status_code=status.HTTP_201_CREATED)
def create_escrow(
    escrow: EscrowCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new escrow transaction"""
    # Verify seller exists
    seller = db.query(User).filter(User.id == escrow.seller_id).first()
    if not seller:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seller not found"
        )
    
    # Verify property exists if provided
    if escrow.property_id:
        property = db.query(Property).filter(Property.id == escrow.property_id).first()
        if not property:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )
    
    # Set default expiration (30 days from now)
    expires_at = escrow.expires_at or datetime.utcnow() + timedelta(days=30)
    
    db_escrow = Escrow(
        property_id=escrow.property_id,
        buyer_id=current_user.id,
        seller_id=escrow.seller_id,
        amount=escrow.amount,
        currency=escrow.currency,
        escrow_type=escrow.escrow_type,
        description=escrow.description,
        expires_at=expires_at
    )
    
    db.add(db_escrow)
    db.commit()
    db.refresh(db_escrow)
    
    return db_escrow

@router.get("/", response_model=List[EscrowWithDetails])
def list_escrow_transactions(
    status: Optional[EscrowStatus] = Query(None, description="Filter by escrow status"),
    escrow_type: Optional[EscrowType] = Query(None, description="Filter by escrow type"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=100, description="Number of records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List escrow transactions for the current user"""
    query = db.query(Escrow).filter(
        (Escrow.buyer_id == current_user.id) | (Escrow.seller_id == current_user.id)
    )
    
    # Apply filters
    if status:
        query = query.filter(Escrow.status == status)
    if escrow_type:
        query = query.filter(Escrow.escrow_type == escrow_type)
    
    # Apply pagination
    escrow_transactions = query.offset(skip).limit(limit).all()
    
    # Add user and property details
    result = []
    for escrow in escrow_transactions:
        escrow_dict = escrow.__dict__.copy()
        
        # Get buyer and seller names
        buyer = db.query(User).filter(User.id == escrow.buyer_id).first()
        seller = db.query(User).filter(User.id == escrow.seller_id).first()
        escrow_dict['buyer_name'] = buyer.name if buyer else "Unknown"
        escrow_dict['seller_name'] = seller.name if seller else "Unknown"
        
        # Get property title if exists
        if escrow.property_id:
            property = db.query(Property).filter(Property.id == escrow.property_id).first()
            escrow_dict['property_title'] = property.title if property else None
        
        result.append(EscrowWithDetails(**escrow_dict))
    
    return result

@router.get("/my-applications", response_model=List[EscrowWithDetails])
def get_my_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get applications submitted by the current user"""
    # Get all escrow transactions where current user is the buyer
    applications = db.query(Escrow).filter(Escrow.buyer_id == current_user.id).all()
    
    # Add user and property details
    result = []
    for escrow in applications:
        escrow_dict = escrow.__dict__.copy()
        
        # Get buyer and seller names
        buyer = db.query(User).filter(User.id == escrow.buyer_id).first()
        seller = db.query(User).filter(User.id == escrow.seller_id).first()
        escrow_dict['buyer_name'] = buyer.name if buyer else "Unknown"
        escrow_dict['seller_name'] = seller.name if seller else "Unknown"
        
        # Get property details if exists
        if escrow.property_id:
            property = db.query(Property).filter(Property.id == escrow.property_id).first()
            escrow_dict['property_title'] = property.title if property else None
            escrow_dict['property_location'] = property.location if property else None
        
        result.append(EscrowWithDetails(**escrow_dict))
    
    return result

@router.get("/{escrow_id}", response_model=EscrowWithDetails)
def get_escrow(
    escrow_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific escrow transaction"""
    escrow = db.query(Escrow).filter(Escrow.id == escrow_id).first()
    
    if not escrow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escrow transaction not found"
        )
    
    # Check if user is involved in this escrow
    if escrow.buyer_id != current_user.id and escrow.seller_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own escrow transactions"
        )
    
    # Add user and property details
    escrow_dict = escrow.__dict__.copy()
    
    buyer = db.query(User).filter(User.id == escrow.buyer_id).first()
    seller = db.query(User).filter(User.id == escrow.seller_id).first()
    escrow_dict['buyer_name'] = buyer.name if buyer else "Unknown"
    escrow_dict['seller_name'] = seller.name if seller else "Unknown"
    
    if escrow.property_id:
        property = db.query(Property).filter(Property.id == escrow.property_id).first()
        escrow_dict['property_title'] = property.title if property else None
    
    return EscrowWithDetails(**escrow_dict)

@router.patch("/{escrow_id}/fund", response_model=EscrowSchema)
def fund_escrow(
    escrow_id: str,
    fund_data: EscrowFund,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fund an escrow transaction (buyer only)"""
    escrow = db.query(Escrow).filter(Escrow.id == escrow_id).first()
    
    if not escrow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escrow transaction not found"
        )
    
    # Only buyer can fund
    if escrow.buyer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the buyer can fund this escrow"
        )
    
    # Check if escrow can be funded
    if escrow.status != EscrowStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot fund escrow with status: {escrow.status}"
        )
    
    # Check if escrow has expired
    if escrow.expires_at and escrow.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Escrow has expired"
        )
    
    # Update escrow status
    escrow.status = EscrowStatus.FUNDED
    escrow.payment_reference = fund_data.payment_reference
    escrow.payment_gateway = fund_data.payment_gateway
    escrow.funded_at = datetime.utcnow()
    
    db.commit()
    db.refresh(escrow)
    
    return escrow

@router.patch("/{escrow_id}/release", response_model=EscrowSchema)
def release_escrow(
    escrow_id: str,
    release_data: EscrowRelease,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Release escrow funds (seller or admin only)"""
    escrow = db.query(Escrow).filter(Escrow.id == escrow_id).first()
    
    if not escrow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escrow transaction not found"
        )
    
    # Only seller or admin can release
    if escrow.seller_id != current_user.id and current_user.role not in ["admin", "agent"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the seller or admin can release this escrow"
        )
    
    # Check if escrow can be released
    if escrow.status != EscrowStatus.FUNDED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot release escrow with status: {escrow.status}"
        )
    
    # Update escrow status
    escrow.status = EscrowStatus.RELEASED
    escrow.released_at = datetime.utcnow()
    
    db.commit()
    db.refresh(escrow)
    
    return escrow

@router.patch("/{escrow_id}/cancel", response_model=EscrowSchema)
def cancel_escrow(
    escrow_id: str,
    cancel_data: EscrowCancel,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel an escrow transaction"""
    escrow = db.query(Escrow).filter(Escrow.id == escrow_id).first()
    
    if not escrow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escrow transaction not found"
        )
    
    # Only buyer, seller, or admin can cancel
    if (escrow.buyer_id != current_user.id and 
        escrow.seller_id != current_user.id and 
        current_user.role not in ["admin", "agent"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only cancel your own escrow transactions"
        )
    
    # Check if escrow can be cancelled
    if escrow.status in [EscrowStatus.RELEASED, EscrowStatus.CANCELLED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel escrow with status: {escrow.status}"
        )
    
    # Update escrow status
    escrow.status = EscrowStatus.CANCELLED
    escrow.cancelled_at = datetime.utcnow()
    
    db.commit()
    db.refresh(escrow)
    
    return escrow

@router.patch("/{escrow_id}/dispute", response_model=EscrowSchema)
def dispute_escrow(
    escrow_id: str,
    dispute_data: EscrowDispute,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a dispute for an escrow transaction"""
    escrow = db.query(Escrow).filter(Escrow.id == escrow_id).first()
    
    if not escrow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escrow transaction not found"
        )
    
    # Only buyer or seller can create dispute
    if escrow.buyer_id != current_user.id and escrow.seller_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only dispute your own escrow transactions"
        )
    
    # Check if escrow can be disputed
    if escrow.status not in [EscrowStatus.FUNDED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot dispute escrow with status: {escrow.status}"
        )
    
    # Update escrow status
    escrow.status = EscrowStatus.DISPUTED
    escrow.dispute_reason = dispute_data.dispute_reason
    
    db.commit()
    db.refresh(escrow)
    
    return escrow
