
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timezone

from app.database import models
from app.model.userModel import SignUpModel, LoginModel
from app.services.auth import create_access_token, create_refresh_token, verify_refresh_token
from app.database.database import get_db
from app.repository import user_repository
from app.services import otp_service

router = APIRouter()

@router.post("/signup", response_model=dict)
async def signup(signup_request: SignUpModel, db: Session = Depends(get_db)):
    if signup_request.pwd != signup_request.confirm_pwd:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    user = user_repository.create_user(db, signup_request)

    otp = otp_service.generate_otp()
    user.otp = otp
    user.otp_expires_at = otp_service.get_otp_expiry_time()
    db.commit()

    await otp_service.send_otp_email(email=user.email, otp=otp)
    
    return {"message": "Signup successful. Please check your email for the verification OTP."}

@router.post("/login", response_model=dict)
async def login(login_request: LoginModel, db: Session = Depends(get_db)):
    user = user_repository.authenticate_user(
        db, login_request.identifier, login_request.pwd
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/phone or password"
        )
    
    token_claims = {"sub": user.email, "role": user.role.value}
    access_token = create_access_token(data=token_claims)
    refresh_token = create_refresh_token(data=token_claims)
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

@router.post("/verify-otp", response_model=dict)
async def verify_otp(request: VerifyOTPRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == request.email).first()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    if user.is_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account already verified")

    if not user.otp or not user.otp_expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP not found. Please request a new one.")

    if user.otp_expires_at < datetime.now(timezone.utc):
        user.otp = None
        user.otp_expires_at = None
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP has expired. Please request a new one.")
        
    if user.otp != request.otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP provided.")
        
    user.is_verified = True
    user.otp = None
    user.otp_expires_at = None
    db.commit()
    
    token_claims = {"sub": user.email, "role": user.role.value}
    access_token = create_access_token(data=token_claims)
    refresh_token = create_refresh_token(data=token_claims)
    
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

class ResendOTPRequest(BaseModel):
    email: str

@router.post("/resend-otp", response_model=dict)
async def resend_otp(request: ResendOTPRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == request.email).first()
    
    if not user or user.is_verified:
        return {"message": "If an account with this email exists and is not verified, a new OTP has been sent."}
        
    otp = otp_service.generate_otp()
    user.otp = otp
    user.otp_expires_at = otp_service.get_otp_expiry_time()
    db.commit()

    await otp_service.send_otp_email(email=user.email, otp=otp)
    
    return {"message": "A new OTP has been sent to your email address."}

class RefreshRequest(BaseModel):
    refresh_token: str

@router.post("/refresh", response_model=dict)
async def refresh_token_endpoint(refresh_request: RefreshRequest):
    payload = verify_refresh_token(refresh_request.refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token_claims = {"sub": payload.get("sub"), "role": payload.get("role")}
    access_token = create_access_token(data=token_claims)
    return {"access_token": access_token, "token_type": "bearer"}
