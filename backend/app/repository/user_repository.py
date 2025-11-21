from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import models
from ..core.security import get_password_hash, verify_password
from ..model.userModel import SignUpModel
from ..schemas.user import UserUpdateProfile
from fastapi import HTTPException, status
from datetime import datetime, timezone
from typing import Optional, List, Union, Any, Dict

def create_user(db: Session, user: SignUpModel) -> models.User:
    """
    Create a new user in the database.
    
    Args:
        db: Database session
        user: Signup data model
        
    Returns:
        models.User: The created user
        
    Raises:
        HTTPException: If email or phone already exists
    """
    # Check if email already exists (case-insensitive)
    db_user_email = db.query(models.User).filter(func.lower(models.User.email) == user.email.lower()).first()
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

def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    """Get user by email (case-insensitive)."""
    return db.query(models.User).filter(func.lower(models.User.email) == email.lower()).first()

def get_user_by_phone(db: Session, phone: str) -> Optional[models.User]:
    """Get user by phone number."""
    return db.query(models.User).filter(models.User.phone == phone).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[models.User]:
    """Get user by ID."""
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_all_users(db: Session) -> List[models.User]:
    """Get all users."""
    return db.query(models.User).order_by(models.User.created_at.desc()).all()


def authenticate_user(db: Session, identifier: str, password: str) -> Optional[models.User]:
    """
    Authenticate user by email or phone.
    
    Args:
        db: Database session
        identifier: Email or phone number
        password: Plain text password
        
    Returns:
        models.User or None: Authenticated user or None if failed
    """
    # Check if user exists with email (case-insensitive) or phone
    # Try email first
    user = db.query(models.User).filter(func.lower(models.User.email) == identifier.lower()).first()
    
    # If not found by email, try phone
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
    
    Args:
        db: Database session (unused but kept for signature compatibility)
        user: User model
        otp: OTP string to verify
        
    Returns:
        bool: True if valid, False otherwise
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

def update_user(db: Session, user: models.User, user_update: Union[Dict[str, Any], UserUpdateProfile]) -> models.User:
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


def verify_signup_otp(db: Session, email: str, otp: str) -> models.User:
    """
    Verifies the signup OTP for a user and activates their account.
    Returns the user object on success, otherwise raises HTTPException.
    """
    user = get_user_by_email(db, email)

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    if user.is_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account already verified")

    if not verify_otp(db, user, otp):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP.")
        
    user.is_verified = True
    user.otp = None
    user.otp_expires_at = None
    db.commit()
    db.refresh(user)
    
    return user


def resend_signup_otp(db: Session, email: str) -> Optional[models.User]:
    """
    Generates and sends a new signup OTP for a non-verified user.
    Returns the user object if found and not verified, None otherwise.
    """
    user = get_user_by_email(db, email)
    
    if not user or user.is_verified:
        # Return None to send a generic message and prevent user enumeration
        return None
        
    return user


def update_user_status(db: Session, user_id: int, is_active: bool) -> Optional[models.User]:
    """
    Update user active status.
    
    Args:
        db: Database session
        user_id: ID of the user to update
        is_active: New active status
        
    Returns:
        Optional[models.User]: Updated user or None if not found
    """
    user = get_user_by_id(db, user_id)
    if not user:
        return None
        
    user.is_active = is_active
    db.commit()
    db.refresh(user)
    return user