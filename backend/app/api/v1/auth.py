from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import uuid

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, User as UserSchema, Token, AgentRegistrationRequest, AgentRegistrationResponse
from app.schemas.agent_application import AgentApplicationCreate
from app.models.agent_application import AgentApplication, ApplicationStatus
from app.auth.security import (
    verify_password, 
    get_password_hash, 
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user already exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Restrict role assignment - only allow public roles
    allowed_roles = ["buyer", "seller"]
    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{user.role}' is not available for public registration. Please contact support to apply for professional roles."
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        name=user.name,
        email=user.email,
        phone_number=user.phone_number,
        password_hash=hashed_password,
        role=user.role
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login user and return access token"""
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserSchema)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@router.put("/users/{user_id}/role", response_model=UserSchema)
def update_user_role(
    user_id: str,
    new_role: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user role (Admin only)"""
    # Check if current user is admin
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update user roles"
        )
    
    # Validate new role
    valid_roles = ["buyer", "seller", "agent", "admin"]
    if new_role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
        )
    
    # Find the user to update
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update the role
    target_user.role = new_role
    db.commit()
    db.refresh(target_user)
    
    return target_user

@router.get("/users", response_model=list[UserSchema])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all users (Admin only)"""
    # Check if current user is admin
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view all users"
        )
    
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.post("/register-agent", response_model=AgentRegistrationResponse, status_code=status.HTTP_201_CREATED)
def register_agent_with_application(
    agent_data: AgentRegistrationRequest,
    db: Session = Depends(get_db)
):
    """Register a new user account and submit agent application in one step"""
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == agent_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user account
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(agent_data.password)
    
    new_user = User(
        id=user_id,
        name=agent_data.name,
        email=agent_data.email,
        phone_number=agent_data.phone_number,
        password_hash=hashed_password,
        role="buyer",  # Start as buyer, will be promoted to agent when approved
        is_active=True,
        is_verified=False
    )
    
    db.add(new_user)
    db.flush()  # Flush to get the user ID
    
    # Create agent application
    application = AgentApplication(
        user_id=user_id,
        company_name=agent_data.company_name,
        license_number=agent_data.license_number,
        years_experience=agent_data.years_experience,
        portfolio_url=agent_data.portfolio_url,
        linkedin_url=agent_data.linkedin_url,
        motivation=agent_data.motivation,
        status=ApplicationStatus.PENDING
    )
    
    # Set JSON fields using properties
    application.specializations_list = agent_data.specializations
    application.references_list = agent_data.references
    
    db.add(application)
    db.commit()
    db.refresh(new_user)
    db.refresh(application)
    
    return AgentRegistrationResponse(
        user_id=new_user.id,
        user_name=new_user.name,
        user_email=new_user.email,
        application_id=application.id,
        message="Account created successfully! Your agent application has been submitted and is pending admin review."
    )
