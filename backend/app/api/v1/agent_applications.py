from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import json

from app.database import get_db
from app.models.agent_application import AgentApplication, ApplicationStatus
from app.models.user import User
from app.schemas.agent_application import (
    AgentApplicationCreate, 
    AgentApplicationUpdate, 
    AgentApplicationReview,
    AgentApplication as AgentApplicationSchema,
    AgentApplicationWithUser
)
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/agent-applications", tags=["agent-applications"])

@router.post("/", response_model=AgentApplicationSchema, status_code=status.HTTP_201_CREATED)
def create_agent_application(
    application: AgentApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit an agent application"""
    # Check if user already has an application
    existing_application = db.query(AgentApplication).filter(
        AgentApplication.user_id == current_user.id
    ).first()
    
    if existing_application:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a pending agent application"
        )
    
    # Check if user is already an agent or admin
    if current_user.role in ["agent", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have agent or admin privileges"
        )
    
    # Create new application
    db_application = AgentApplication(
        user_id=current_user.id,
        company_name=application.company_name,
        license_number=application.license_number,
        years_experience=application.years_experience,
        portfolio_url=application.portfolio_url,
        linkedin_url=application.linkedin_url,
        motivation=application.motivation,
        status=ApplicationStatus.PENDING
    )
    
    # Set JSON fields using properties
    db_application.specializations_list = application.specializations
    db_application.references_list = application.references
    
    db.add(db_application)
    db.commit()
    db.refresh(db_application)
    
    return AgentApplicationSchema.from_orm(db_application)

@router.get("/my-application", response_model=AgentApplicationSchema)
def get_my_application(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's agent application"""
    application = db.query(AgentApplication).filter(
        AgentApplication.user_id == current_user.id
    ).first()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No agent application found"
        )
    
    return AgentApplicationSchema.from_orm(application)

@router.put("/my-application", response_model=AgentApplicationSchema)
def update_my_application(
    application_update: AgentApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's agent application (only if pending)"""
    application = db.query(AgentApplication).filter(
        AgentApplication.user_id == current_user.id
    ).first()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No agent application found"
        )
    
    if application.status != ApplicationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update application that is not pending"
        )
    
    # Update fields
    for field, value in application_update.dict(exclude_unset=True).items():
        if field == "specializations":
            application.specializations_list = value
        elif field == "references":
            application.references_list = value
        else:
            setattr(application, field, value)
    
    db.commit()
    db.refresh(application)
    
    return AgentApplicationSchema.from_orm(application)

@router.get("/", response_model=List[AgentApplicationWithUser])
def list_agent_applications(
    status_filter: ApplicationStatus = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all agent applications (Admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view all applications"
        )
    
    # Explicitly specify the join condition to avoid ambiguous foreign key error
    query = db.query(AgentApplication).join(User, AgentApplication.user_id == User.id)
    
    if status_filter:
        query = query.filter(AgentApplication.status == status_filter)
    
    applications = query.offset(skip).limit(limit).all()
    
    # Convert to response format with user info
    result = []
    for app in applications:
        app_data = AgentApplicationSchema.from_orm(app).dict()
        app_data["user_name"] = app.user.name
        app_data["user_email"] = app.user.email
        result.append(app_data)
    
    return result

@router.put("/{application_id}/review", response_model=AgentApplicationSchema)
def review_agent_application(
    application_id: str,
    review: AgentApplicationReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Review an agent application (Admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can review applications"
        )
    
    application = db.query(AgentApplication).filter(
        AgentApplication.id == application_id
    ).first()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    # Update application status
    application.status = review.status
    application.reviewed_by = current_user.id
    application.review_notes = review.review_notes
    application.reviewed_at = func.now()
    
    # If approved, update user role to agent
    if review.status == ApplicationStatus.APPROVED:
        user = db.query(User).filter(User.id == application.user_id).first()
        if user:
            user.role = "agent"
    
    db.commit()
    db.refresh(application)
    
    return AgentApplicationSchema.from_orm(application)
