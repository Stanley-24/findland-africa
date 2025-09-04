from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.models.property import PropertyType, PropertyStatus

class PropertyBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    type: PropertyType
    price: Decimal = Field(..., gt=0)
    location: str = Field(..., min_length=1, max_length=500)

class PropertyCreate(PropertyBase):
    pass

class PropertyUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    type: Optional[PropertyType] = None
    price: Optional[Decimal] = Field(None, gt=0)
    location: Optional[str] = Field(None, min_length=1, max_length=500)
    status: Optional[PropertyStatus] = None

class PropertyInDB(PropertyBase):
    id: str
    owner_id: str
    status: PropertyStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Property(PropertyInDB):
    pass

class PropertyWithMedia(Property):
    media: List['Media'] = []

class MediaBase(BaseModel):
    media_type: str
    url: str

class MediaCreate(MediaBase):
    pass

class MediaInDB(MediaBase):
    id: str
    property_id: str
    uploaded_at: datetime

    class Config:
        from_attributes = True

class Media(MediaInDB):
    pass

# Update forward references
PropertyWithMedia.model_rebuild()
