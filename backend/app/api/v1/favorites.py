from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List
import uuid

from app.database import get_db
from app.models.favorite import Favorite
from app.models.property import Property
from app.models.media import Media
from app.models.user import User
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/favorites", tags=["favorites"])


def serialize_favorite_property(property_obj, media_list):
    """Serialize property with media for favorites"""
    return {
        'id': str(property_obj.id),
        'title': property_obj.title,
        'description': property_obj.description,
        'type': property_obj.type.value if property_obj.type else None,
        'price': float(property_obj.price) if property_obj.price else 0,
        'location': property_obj.location,
        'status': property_obj.status.value if property_obj.status else None,
        'agent_name': property_obj.agent_name,
        'agent_rating': float(property_obj.agent_rating) if property_obj.agent_rating else None,
        'agent_phone': property_obj.agent_phone,
        'agent_email': property_obj.agent_email,
        'created_at': property_obj.created_at.isoformat() if property_obj.created_at else None,
        'updated_at': property_obj.updated_at.isoformat() if property_obj.updated_at else None,
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


@router.post("/{property_id}")
async def add_to_favorites(
    property_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a property to user's favorites"""
    try:
        # Validate property_id
        property_uuid = uuid.UUID(property_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid property ID format"
        )
    
    # Check if property exists
    property_obj = db.query(Property).filter(Property.id == property_uuid).first()
    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    
    # Check if already favorited
    existing_favorite = db.query(Favorite).filter(
        and_(
            Favorite.user_id == current_user.id,
            Favorite.property_id == property_uuid
        )
    ).first()
    
    if existing_favorite:
        return {
            "message": "Property already in favorites",
            "favorite_id": str(existing_favorite.id)
        }
    
    # Create new favorite
    favorite = Favorite(
        user_id=current_user.id,
        property_id=property_uuid
    )
    
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    
    return {
        "message": "Property added to favorites",
        "favorite_id": str(favorite.id)
    }


@router.delete("/{property_id}")
async def remove_from_favorites(
    property_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a property from user's favorites"""
    try:
        # Validate property_id
        property_uuid = uuid.UUID(property_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid property ID format"
        )
    
    # Find the favorite
    favorite = db.query(Favorite).filter(
        and_(
            Favorite.user_id == current_user.id,
            Favorite.property_id == property_uuid
        )
    ).first()
    
    if not favorite:
        return {
            "message": "Property not found in favorites"
        }
    
    # Remove the favorite
    db.delete(favorite)
    db.commit()
    
    return {
        "message": "Property removed from favorites"
    }


@router.get("/")
async def get_user_favorites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all user's favorite properties"""
    # Get user's favorite property IDs
    favorites = db.query(Favorite).filter(Favorite.user_id == current_user.id).all()
    
    if not favorites:
        return {
            "favorites": [],
            "count": 0
        }
    
    # Get property IDs
    property_ids = [fav.property_id for fav in favorites]
    
    # Get properties with their media
    properties = db.query(Property).filter(Property.id.in_(property_ids)).all()
    media_objects = db.query(Media).filter(Media.property_id.in_(property_ids)).all()
    
    # Group media by property_id
    media_by_property = {}
    for media in media_objects:
        prop_id = str(media.property_id)
        if prop_id not in media_by_property:
            media_by_property[prop_id] = []
        media_by_property[prop_id].append(media)
    
    # Serialize properties
    result = []
    for property_obj in properties:
        prop_id = str(property_obj.id)
        prop_media = media_by_property.get(prop_id, [])
        result.append(serialize_favorite_property(property_obj, prop_media))
    
    return {
        "favorites": result,
        "count": len(result)
    }


@router.get("/{property_id}/status")
async def check_favorite_status(
    property_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if a property is in user's favorites"""
    try:
        # Validate property_id
        property_uuid = uuid.UUID(property_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid property ID format"
        )
    
    # Check if property is favorited
    favorite = db.query(Favorite).filter(
        and_(
            Favorite.user_id == current_user.id,
            Favorite.property_id == property_uuid
        )
    ).first()
    
    return {
        "is_favorited": favorite is not None,
        "favorite_id": str(favorite.id) if favorite else None
    }
