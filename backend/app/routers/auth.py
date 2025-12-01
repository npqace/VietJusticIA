
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timezone

from app.database import models
from app.model.userModel import SignUpModel, LoginModel
from app.core.security import create_access_token, create_refresh_token, verify_refresh_token
from app.core.security import get_password_hash
from app.database.database import get_db
from app.repository import user_repository
from app.services import brevo_email_service as otp_service
from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest

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
    user = user_repository.verify_signup_otp(db, email=request.email, otp=request.otp)
    
    token_claims = {"sub": user.email, "role": user.role.value}
    access_token = create_access_token(data=token_claims)
    refresh_token = create_refresh_token(data=token_claims)
    
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

class ResendOTPRequest(BaseModel):
    email: str

@router.post("/resend-otp", response_model=dict)
async def resend_otp(request: ResendOTPRequest, db: Session = Depends(get_db)):
    user = user_repository.resend_signup_otp(db, email=request.email)
    
    if not user:
        # This prevents user enumeration. If the user doesn't exist or is already verified,
        # we return a generic success message. The actual email is only sent if a valid,
        # unverified user is found.
        return {"message": "If an account with this email exists and is not verified, a new OTP has been sent."}
        
    new_otp = otp_service.generate_otp()
    user.otp = new_otp
    user.otp_expires_at = otp_service.get_otp_expiry_time()
    db.commit()

    await otp_service.send_otp_email(email=user.email, otp=new_otp)

    return {"message": "A new OTP has been sent to your email address."}

@router.post("/forgot-password", response_model=dict)
async def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = user_repository.get_user_by_email(db, request.email)
    if user:
        await otp_service.send_password_reset_otp(db, user)
    # Always return a generic message to prevent user enumeration
    return {"message": "If an account with that email exists, a password reset OTP has been sent."}

@router.post("/resend-password-reset-otp", response_model=dict)
async def resend_password_reset_otp(request: ResendOTPRequest, db: Session = Depends(get_db)):
    """Resend OTP for password reset."""
    user = user_repository.get_user_by_email(db, request.email)
    if user:
        await otp_service.send_password_reset_otp(db, user)
    # Always return a generic message to prevent user enumeration
    return {"message": "If an account with that email exists, a new password reset OTP has been sent."}


@router.post("/reset-password", response_model=dict)
async def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = user_repository.get_user_by_email(db, request.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP or email.",
        )

    if not user_repository.verify_otp(db, user, request.otp):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP.",
        )

    # Hash the new password and update the user
    user.hashed_password = get_password_hash(request.new_password)
    # Clear the OTP fields
    user.otp = None
    user.otp_expires_at = None
    db.commit()

    return {"message": "Password has been reset successfully."}

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
