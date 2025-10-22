from sqlalchemy.orm import Session
from ..database import models
from ..core.security import get_password_hash, verify_password
from ..model.userModel import SignUpModel
from ..schemas.user import UserUpdate
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

def authenticate_user(db: Session, identifier: str, password: str):
    # Check if user exists with email or phone
    user = db.query(models.User).filter(models.User.email == identifier).first()
    if not user:
        user = db.query(models.User).filter(models.User.phone == identifier).first()

    # If still not found, return None
    if not user:
        return None

    if not verify_password(password, user.hashed_password):
        return None
    
    return user

def verify_otp(db: Session, user: models.User, otp: str) -> bool:
    """
    Verifies the OTP for a user.
    """
    if not user.otp or not user.otp_expires_at:
        return False
    
    if user.otp != otp:
        return False
        
    if user.otp_expires_at < datetime.now(timezone.utc):
        return False
        
    return True

def update_user(db: Session, user: models.User, user_update: dict) -> models.User:
    """
    Updates a user's profile.
    Accepts a dictionary of updates to apply to the user model.
    """
    update_data = user_update.copy()
    for key, value in update_data.items():
        setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    return user