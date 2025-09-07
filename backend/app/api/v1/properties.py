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

@router.get("/", response_model=List[PropertyWithMedia])
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
    from sqlalchemy.orm import joinedload
    
    query = db.query(Property)
    # Note: media relationship is temporarily commented out for local development
    
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

@router.get("/my-properties", response_model=List[PropertyWithMedia])
def get_my_properties(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get properties owned by the current user"""
    properties = db.query(Property).filter(Property.owner_id == current_user.id).all()
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

@router.get("/agent/{agent_name}", response_model=dict)
def get_agent_properties(
    agent_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all properties by a specific agent"""
    # Find properties by agent name
    properties = db.query(Property).filter(
        Property.agent_name == agent_name
    ).all()
    
    if not properties:
        # Return empty result if no properties found
        return {
            "name": agent_name,
            "email": "",
            "phone_number": "",
            "rating": 0.0,
            "total_properties": 0,
            "properties": []
        }
    
    # Get agent details from the first property
    first_property = properties[0]
    
    # Calculate average rating
    total_rating = sum(float(p.agent_rating) for p in properties if p.agent_rating)
    avg_rating = total_rating / len(properties) if properties else 0.0
    
    # Format properties for response
    properties_data = []
    for prop in properties:
        property_data = {
            "id": str(prop.id),
            "title": prop.title,
            "location": prop.location,
            "price": float(prop.price),
            "description": prop.description or "",
            "property_type": prop.type.value if prop.type else "sale",
            "status": prop.status.value if prop.status else "available",
            "images": [],  # We'll add media later if needed
            "created_at": prop.created_at.isoformat() if prop.created_at else None
        }
        properties_data.append(property_data)
    
    return {
        "name": agent_name,
        "email": first_property.agent_email or "",
        "phone_number": first_property.agent_phone or "",
        "rating": round(avg_rating, 1),
        "total_properties": len(properties),
        "properties": properties_data
    }
