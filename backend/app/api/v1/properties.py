from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal

from app.database import get_db
from app.models.property import Property, PropertyType, PropertyStatus
from app.models.user import User
from app.schemas.property import PropertyCreate, PropertyUpdate, Property as PropertySchema, PropertyWithMedia
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/properties", tags=["properties"])

@router.post("/", response_model=PropertySchema, status_code=status.HTTP_201_CREATED)
def create_property(
    property: PropertyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new property listing"""
    # Only sellers and agents can create properties
    if current_user.role not in ["seller", "agent", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only sellers, agents, and admins can create properties"
        )
    
    db_property = Property(
        owner_id=current_user.id,
        title=property.title,
        description=property.description,
        type=property.type,
        price=property.price,
        location=property.location
    )
    
    db.add(db_property)
    db.commit()
    db.refresh(db_property)
    
    return db_property

@router.get("/", response_model=List[PropertySchema])
def list_properties(
    type: Optional[PropertyType] = Query(None, description="Filter by property type"),
    status: Optional[PropertyStatus] = Query(None, description="Filter by property status"),
    min_price: Optional[Decimal] = Query(None, description="Minimum price filter"),
    max_price: Optional[Decimal] = Query(None, description="Maximum price filter"),
    location: Optional[str] = Query(None, description="Location filter"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=100, description="Number of records to return"),
    db: Session = Depends(get_db)
):
    """List all properties with optional filters"""
    query = db.query(Property)
    
    # Apply filters
    if type:
        query = query.filter(Property.type == type)
    if status:
        query = query.filter(Property.status == status)
    if min_price:
        query = query.filter(Property.price >= min_price)
    if max_price:
        query = query.filter(Property.price <= max_price)
    if location:
        query = query.filter(Property.location.ilike(f"%{location}%"))
    
    # Apply pagination
    properties = query.offset(skip).limit(limit).all()
    
    return properties

@router.get("/{property_id}", response_model=PropertyWithMedia)
def get_property(
    property_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific property by ID"""
    property = db.query(Property).filter(Property.id == property_id).first()
    
    if not property:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    
    return property

@router.patch("/{property_id}", response_model=PropertySchema)
def update_property(
    property_id: str,
    property_update: PropertyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a property (only owner, agents, or admins)"""
    db_property = db.query(Property).filter(Property.id == property_id).first()
    
    if not db_property:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    
    # Check if user can update this property
    if current_user.role not in ["agent", "admin"] and db_property.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own properties"
        )
    
    # Update fields
    update_data = property_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_property, field, value)
    
    db.commit()
    db.refresh(db_property)
    
    return db_property

@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_property(
    property_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a property (only owner, agents, or admins)"""
    db_property = db.query(Property).filter(Property.id == property_id).first()
    
    if not db_property:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    
    # Check if user can delete this property
    if current_user.role not in ["agent", "admin"] and db_property.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own properties"
        )
    
    db.delete(db_property)
    db.commit()
    
    return None
