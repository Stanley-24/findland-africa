from pydantic import BaseModel, EmailStr, Field
from typing import Optional, TYPE_CHECKING
from datetime import datetime
from app.models.user import UserRole
from app.schemas.agent_application import AgentApplicationCreate

if TYPE_CHECKING:
    from app.schemas.user import User as UserSchema

class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone_number: Optional[str] = None
    role: UserRole = UserRole.BUYER

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None
    role: Optional[UserRole] = None

class UserInDB(UserBase):
    id: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class User(UserInDB):
    pass

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class AgentRegistrationRequest(BaseModel):
    """Unified request for agent account creation + application submission"""
    # User account fields
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    phone_number: Optional[str] = Field(None, max_length=50)
    password: str = Field(..., min_length=8)
    
    # Agent application fields
    company_name: Optional[str] = None
    license_number: Optional[str] = None
    years_experience: Optional[str] = None
    specializations: Optional[list] = None
    portfolio_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    motivation: str = Field(..., min_length=50, description="Explain why you want to become an agent")
    references: Optional[list] = None

class AgentRegistrationResponse(BaseModel):
    """Response for agent registration"""
    user_id: str
    user_name: str
    user_email: str
    application_id: str
    message: str
