from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List
import uuid

from app.database import get_db
from app.models.like import Like
from app.models.property import Property
from app.models.media import Media
from app.models.user import User
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/likes", tags=["likes"])


def serialize_liked_property(property_obj, media_list):
    """Serialize property with media for likes"""
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
async def add_to_likes(
    property_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a property to user's likes"""
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
    
    # Check if already liked
    existing_like = db.query(Like).filter(
        and_(
            Like.user_id == current_user.id,
            Like.property_id == property_uuid
        )
    ).first()
    
    if existing_like:
        return {
            "message": "Property already liked",
            "like_id": str(existing_like.id)
        }
    
    # Create new like
    like = Like(
        user_id=current_user.id,
        property_id=property_uuid
    )
    
    db.add(like)
    db.commit()
    db.refresh(like)
    
    return {
        "message": "Property liked",
        "like_id": str(like.id)
    }


@router.delete("/{property_id}")
async def remove_from_likes(
    property_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a property from user's likes"""
    try:
        # Validate property_id
        property_uuid = uuid.UUID(property_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid property ID format"
        )
    
    # Find the like
    like = db.query(Like).filter(
        and_(
            Like.user_id == current_user.id,
            Like.property_id == property_uuid
        )
    ).first()
    
    if not like:
        return {
            "message": "Property not found in likes"
        }
    
    # Remove the like
    db.delete(like)
    db.commit()
    
    return {
        "message": "Property unliked"
    }


@router.get("/")
async def get_user_likes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all user's liked properties"""
    # Get user's liked property IDs
    likes = db.query(Like).filter(Like.user_id == current_user.id).all()
    
    if not likes:
        return {
            "likes": [],
            "count": 0
        }
    
    # Get property IDs
    property_ids = [like.property_id for like in likes]
    
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
        result.append(serialize_liked_property(property_obj, prop_media))
    
    return {
        "likes": result,
        "count": len(result)
    }


@router.get("/{property_id}/status")
async def check_like_status(
    property_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if a property is liked by user"""
    try:
        # Validate property_id
        property_uuid = uuid.UUID(property_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid property ID format"
        )
    
    # Check if property is liked
    like = db.query(Like).filter(
        and_(
            Like.user_id == current_user.id,
            Like.property_id == property_uuid
        )
    ).first()
    
    return {
        "is_liked": like is not None,
        "like_id": str(like.id) if like else None
    }
