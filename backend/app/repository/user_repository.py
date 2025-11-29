from sqlalchemy.orm import Session
from ..database import models
from ..core.security import get_password_hash, verify_password
from ..model.userModel import SignUpModel
from ..schemas.user import UserUpdateProfile
from fastapi import HTTPException, status
from datetime import datetime, timezone

def create_user(db: Session, user: SignUpModel):
    # Check if email already exists
    db_user_email = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, 
                           detail="Email already registered")
                           
    # Check if phone already exists
    db_user_phone = db.query(models.User).filter(models.User.phone == user.phone).first()
    if db_user_phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, 
                           detail="Phone number already registered")
    
    # Create new user
    hashed_password = get_password_hash(user.pwd)
    db_user = models.User(
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        hashed_password=hashed_password
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_phone(db: Session, phone: str):
    return db.query(models.User).filter(models.User.phone == phone).first()


def get_user_by_id(db: Session, user_id: int):
    """Get user by ID."""
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_all_users(db: Session):
    """Get all users."""
    return db.query(models.User).order_by(models.User.created_at.desc()).all()


def authenticate_user(db: Session, identifier: str, password: str):
    # Check if user exists with email or phone
    user = db.query(models.User).filter(models.User.email == identifier).first()
    if not user:
        user = db.query(models.User).filter(models.User.phone == identifier).first()

    # If still not found, or password does not match, return None
    if not user or not verify_password(password, user.hashed_password):
        return None

    # Reactivate account if it was inactive
    if not user.is_active:
        user.is_active = True
        db.commit()
        db.refresh(user)
    
    return user

def verify_otp(db: Session, user: models.User, otp: str) -> bool:
    """
    Verifies the OTP for a user.
    """
    if not user.otp or not user.otp_expires_at:
        return False
    
    if user.otp != otp:
        return False
    
    # Handle both timezone-aware and timezone-naive datetimes
    # SQLite returns naive datetimes, but we store aware ones
    now = datetime.now(timezone.utc)
    expires_at = user.otp_expires_at
    
    # If expires_at is naive, assume it's UTC (SQLite behavior)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
        
    if expires_at < now:
        return False
        
    return True

def update_user(db: Session, user: models.User, user_update) -> models.User:
    """
    Updates a user's profile.
    Accepts a dictionary or Pydantic model of updates to apply to the user model.
    """
    # Handle both dict and Pydantic model
    if isinstance(user_update, dict):
        update_data = user_update
    else:
        update_data = user_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    return user