from sqlalchemy.orm import Session
from ..database import models
from ..core.security import get_password_hash, verify_password
from ..model.userModel import SignUpModel
from fastapi import HTTPException, status

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