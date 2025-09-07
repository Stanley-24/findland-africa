from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import json
from datetime import datetime

from app.database import get_db
from app.models.property import Property
from app.models.media import Media
# from app.auth import get_current_user
# from app.models.user import User

router = APIRouter(prefix="/fast/properties", tags=["properties-fast"])

def serialize_property(prop, media_list):
    """Convert SQLAlchemy objects to JSON-serializable dictionaries"""
    return {
        'id': str(prop.id),
        'owner_id': str(prop.owner_id),
        'title': prop.title,
        'description': prop.description,
        'type': prop.type.value if prop.type else None,
        'price': float(prop.price) if prop.price else None,
        'location': prop.location,
        'status': prop.status.value if prop.status else None,
        'agent_name': prop.agent_name,
        'agent_rating': float(prop.agent_rating) if prop.agent_rating else None,
        'agent_phone': prop.agent_phone,
        'agent_email': prop.agent_email,
        'created_at': prop.created_at.isoformat() if prop.created_at else None,
        'updated_at': prop.updated_at.isoformat() if prop.updated_at else None,
        'media': [
            {
                'id': str(media.id),
                'property_id': str(media.property_id),
                'url': media.url,
                'type': media.media_type.value if media.media_type else None,
                'created_at': media.uploaded_at.isoformat() if media.uploaded_at else None
            } for media in media_list
        ]
    }

@router.get("/")
async def list_properties_fast(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    db: Session = Depends(get_db)
):
    """Fast property listing endpoint without Pydantic validation"""
    
    # Build query
    query = db.query(Property)
    
    # Apply filters
    if type:
        query = query.filter(Property.type == type)
    if status:
        query = query.filter(Property.status == status)
    if location:
        query = query.filter(Property.location.ilike(f"%{location}%"))
    if min_price:
        query = query.filter(Property.price >= min_price)
    if max_price:
        query = query.filter(Property.price <= max_price)
    
    # Get properties
    properties = query.offset(skip).limit(limit).all()
    
    # Get all property IDs for batch media fetch
    property_ids = [str(prop.id) for prop in properties]
    
    # Fetch all media for these properties in one query
    media_objects = db.query(Media).filter(Media.property_id.in_(property_ids)).all()
    
    # Group media by property_id
    media_by_property = {}
    for media in media_objects:
        prop_id = str(media.property_id)
        if prop_id not in media_by_property:
            media_by_property[prop_id] = []
        media_by_property[prop_id].append(media)
    
    # Serialize results
    result = []
    for prop in properties:
        prop_id = str(prop.id)
        prop_media = media_by_property.get(prop_id, [])
        result.append(serialize_property(prop, prop_media))
    
    return result

@router.get("/{property_id}")
async def get_property_fast(
    property_id: str,
    db: Session = Depends(get_db)
):
    """Fast single property endpoint without Pydantic validation"""
    
    # Get property
    property_obj = db.query(Property).filter(Property.id == property_id).first()
    
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Get media for this property
    media_objects = db.query(Media).filter(Media.property_id == property_id).all()
    
    # Serialize and return
    return serialize_property(property_obj, media_objects)
