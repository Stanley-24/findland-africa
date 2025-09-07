from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from decimal import Decimal
import uuid

from app.models.property import Property, PropertyType, PropertyStatus
from app.models.user import User
from app.schemas.property import PropertyWithMedia
from app.cache import cache_service
from app.database_optimized import get_optimized_properties_query, get_optimized_property_query

class PropertyService:
    def __init__(self, db: Session):
        self.db = db
    
    async def get_properties(
        self, 
        filters: Dict[str, Any] = None, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[PropertyWithMedia]:
        """Get properties with caching and optimized queries"""
        # Create cache key from filters
        filter_str = ":".join([f"{k}:{v}" for k, v in (filters or {}).items()])
        cache_key = f"properties:{filter_str}:{skip}:{limit}"
        
        # Try cache first (temporarily disabled for testing)
        # cached_result = await cache_service.get("properties", cache_key)
        # if cached_result:
        #     # Handle both serialized and object formats
        #     try:
        #         return [PropertyWithMedia(**prop) for prop in cached_result]
        #     except Exception as e:
        #         print(f"Cache data format error, fetching fresh data: {e}")
        #         # Clear the problematic cache entry
        #         await cache_service.delete("properties", cache_key)
        
        # Optimized database query
        properties = get_optimized_properties_query(self.db, filters, skip, limit).all()
        
        # Get all property IDs for batch media fetch
        property_ids = [str(prop.id) for prop in properties]
        
        # Fetch all media for these properties in one query
        from app.models.media import Media
        media_objects = self.db.query(Media).filter(Media.property_id.in_(property_ids)).all()
        
        # Group media by property_id
        media_by_property = {}
        for media in media_objects:
            prop_id = str(media.property_id)
            if prop_id not in media_by_property:
                media_by_property[prop_id] = []
            media_by_property[prop_id].append(media)
        
        # Convert to Pydantic models directly
        result = []
        for prop in properties:
            prop_id = str(prop.id)
            prop_media = media_by_property.get(prop_id, [])
            
            # Convert SQLAlchemy object to dict first
            prop_dict = {
                'id': prop_id,
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
                    } for media in prop_media
                ]
            }
            result.append(PropertyWithMedia(**prop_dict))
        
        # Cache the serializable format (temporarily disabled for testing)
        # await cache_service.set("properties", cache_key, [prop.dict() for prop in result])
        
        return result
    
    async def get_property(self, property_id: str) -> Optional[PropertyWithMedia]:
        """Get single property with caching"""
        cache_key = f"property:{property_id}"
        
        # Try cache first (temporarily disabled for testing)
        # cached_result = await cache_service.get("property_details", cache_key)
        # if cached_result:
        #     return PropertyWithMedia(**cached_result)
        
        # Optimized database query
        property_obj = get_optimized_property_query(self.db, property_id).first()
        
        if not property_obj:
            return None
        
        # Fetch media separately to avoid string conversion issues
        from app.models.media import Media
        media_objects = self.db.query(Media).filter(Media.property_id == property_id).all()
        
        # Convert SQLAlchemy object to Pydantic model
        prop_dict = {
            'id': str(property_obj.id),
            'owner_id': str(property_obj.owner_id),
            'title': property_obj.title,
            'description': property_obj.description,
            'type': property_obj.type.value if property_obj.type else None,
            'price': float(property_obj.price) if property_obj.price else None,
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
                } for media in media_objects
            ]
        }
        
        result = PropertyWithMedia(**prop_dict)
        
        # Cache the serializable format (temporarily disabled for testing)
        # await cache_service.set("property_details", cache_key, result.dict())
        
        return result
    
    async def get_featured_properties(self, limit: int = 12) -> List[PropertyWithMedia]:
        """Get featured properties with caching"""
        cache_key = f"featured_properties:{limit}"
        
        # Try cache first
        cached_result = await cache_service.get("properties", cache_key)
        if cached_result:
            return [PropertyWithMedia(**prop) for prop in cached_result]
        
        # Get featured properties (high-rated, recent, available)
        properties = self.db.query(Property)\
            .filter(
                Property.status == PropertyStatus.AVAILABLE,
                Property.agent_rating >= 4.0  # High-rated properties
            )\
            .order_by(desc(Property.created_at))\
            .limit(limit)\
            .all()
        
        # Cache the result
        await cache_service.set("properties", cache_key, [prop.__dict__ for prop in properties])
        
        return properties
    
    async def get_agent_properties(self, agent_name: str) -> Dict[str, Any]:
        """Get properties by agent with caching"""
        cache_key = f"agent_properties:{agent_name}"
        
        # Try cache first
        cached_result = await cache_service.get("properties", cache_key)
        if cached_result:
            return cached_result
        
        # Get properties by agent
        properties = self.db.query(Property)\
            .filter(Property.agent_name == agent_name)\
            .all()
        
        if not properties:
            result = {
                "name": agent_name,
                "email": "",
                "phone_number": "",
                "rating": 0.0,
                "total_properties": 0,
                "properties": []
            }
        else:
            # Calculate average rating
            total_rating = sum(float(p.agent_rating) for p in properties if p.agent_rating)
            avg_rating = total_rating / len(properties) if properties else 0.0
            
            # Format properties
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
                    "images": [media.url for media in prop.media] if prop.media else [],
                    "created_at": prop.created_at.isoformat() if prop.created_at else None
                }
                properties_data.append(property_data)
            
            first_property = properties[0]
            result = {
                "name": agent_name,
                "email": first_property.agent_email or "",
                "phone_number": first_property.agent_phone or "",
                "rating": round(avg_rating, 1),
                "total_properties": len(properties),
                "properties": properties_data
            }
        
        # Cache the result
        await cache_service.set("properties", cache_key, result)
        
        return result
    
    async def create_property(self, property_data: dict, owner_id: str) -> PropertyWithMedia:
        """Create property and invalidate cache"""
        property_obj = Property(
            owner_id=owner_id,
            title=property_data['title'],
            description=property_data.get('description'),
            type=property_data['type'],
            price=property_data['price'],
            location=property_data['location'],
            agent_name=property_data.get('agent_name'),
            agent_rating=property_data.get('agent_rating'),
            agent_phone=property_data.get('agent_phone'),
            agent_email=property_data.get('agent_email')
        )
        
        self.db.add(property_obj)
        self.db.commit()
        self.db.refresh(property_obj)
        
        # Invalidate cache
        await cache_service.delete_pattern("properties:*")
        await cache_service.delete_pattern("featured_properties:*")
        
        return property_obj
    
    async def update_property(self, property_id: str, property_data: dict) -> Optional[PropertyWithMedia]:
        """Update property and invalidate cache"""
        property_obj = self.db.query(Property).filter(Property.id == property_id).first()
        
        if not property_obj:
            return None
        
        # Update fields
        for field, value in property_data.items():
            if hasattr(property_obj, field):
                setattr(property_obj, field, value)
        
        self.db.commit()
        self.db.refresh(property_obj)
        
        # Invalidate cache
        await cache_service.delete("property_details", f"property:{property_id}")
        await cache_service.delete_pattern("properties:*")
        await cache_service.delete_pattern("featured_properties:*")
        
        return property_obj
    
    async def delete_property(self, property_id: str) -> bool:
        """Delete property and invalidate cache"""
        property_obj = self.db.query(Property).filter(Property.id == property_id).first()
        
        if not property_obj:
            return False
        
        self.db.delete(property_obj)
        self.db.commit()
        
        # Invalidate cache
        await cache_service.delete("property_details", f"property:{property_id}")
        await cache_service.delete_pattern("properties:*")
        await cache_service.delete_pattern("featured_properties:*")
        
        return True
