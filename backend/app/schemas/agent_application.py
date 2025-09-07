from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.agent_application import ApplicationStatus

class AgentApplicationBase(BaseModel):
    company_name: Optional[str] = None
    license_number: Optional[str] = None
    years_experience: Optional[str] = None
    specializations: Optional[List[str]] = None
    portfolio_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    motivation: str = Field(..., min_length=50, description="Explain why you want to become an agent")
    references: Optional[List[dict]] = None

class AgentApplicationCreate(AgentApplicationBase):
    pass

class AgentApplicationUpdate(BaseModel):
    company_name: Optional[str] = None
    license_number: Optional[str] = None
    years_experience: Optional[str] = None
    specializations: Optional[List[str]] = None
    portfolio_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    motivation: Optional[str] = None
    references: Optional[List[dict]] = None

class AgentApplicationReview(BaseModel):
    status: ApplicationStatus
    review_notes: Optional[str] = None

class AgentApplicationInDB(AgentApplicationBase):
    id: str
    user_id: str
    status: ApplicationStatus
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, obj):
        """Custom from_orm to handle JSON fields"""
        data = {
            'id': obj.id,
            'user_id': obj.user_id,
            'company_name': obj.company_name,
            'license_number': obj.license_number,
            'years_experience': obj.years_experience,
            'specializations': obj.specializations_list,
            'portfolio_url': obj.portfolio_url,
            'linkedin_url': obj.linkedin_url,
            'motivation': obj.motivation,
            'references': obj.references_list,
            'status': obj.status,
            'reviewed_by': obj.reviewed_by,
            'review_notes': obj.review_notes,
            'created_at': obj.created_at,
            'updated_at': obj.updated_at,
            'reviewed_at': obj.reviewed_at
        }
        return cls(**data)

class AgentApplication(AgentApplicationInDB):
    pass

class AgentApplicationWithUser(AgentApplication):
    user_name: str
    user_email: str
