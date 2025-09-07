from sqlalchemy import Column, String, DateTime, Boolean, Text, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum
import json

from app.database import Base

class ApplicationStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    UNDER_REVIEW = "under_review"

class AgentApplication(Base):
    __tablename__ = "agent_applications"

    id = Column(UUID(as_uuid=False), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    
    # Application details
    company_name = Column(String(255), nullable=True)
    license_number = Column(String(100), nullable=True)
    years_experience = Column(String(50), nullable=True)
    specializations = Column(Text, nullable=True)  # JSON string of specializations
    portfolio_url = Column(String(500), nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    motivation = Column(Text, nullable=False)
    references = Column(Text, nullable=True)  # JSON string of references
    
    # Application status
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.PENDING, nullable=False)
    reviewed_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    review_notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    # Temporarily disable for local development
    # user = relationship("User", foreign_keys=[user_id], back_populates="agent_application")
    # Temporarily disable for local development
    # reviewer = relationship("User", foreign_keys=[reviewed_by])

    @property
    def specializations_list(self):
        """Convert specializations JSON string to list"""
        if self.specializations:
            try:
                return json.loads(self.specializations)
            except (json.JSONDecodeError, TypeError):
                return []
        return []
    
    @specializations_list.setter
    def specializations_list(self, value):
        """Convert list to JSON string for storage"""
        if value:
            self.specializations = json.dumps(value)
        else:
            self.specializations = None
    
    @property
    def references_list(self):
        """Convert references JSON string to list"""
        if self.references:
            try:
                return json.loads(self.references)
            except (json.JSONDecodeError, TypeError):
                return []
        return []
    
    @references_list.setter
    def references_list(self, value):
        """Convert list to JSON string for storage"""
        if value:
            self.references = json.dumps(value)
        else:
            self.references = None

    def __repr__(self):
        return f"<AgentApplication(id={self.id}, user_id={self.user_id}, status={self.status})>"
