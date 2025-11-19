
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..schemas.auth import ForgotPasswordRequest, ResetPasswordRequest, VerifyResetOTPRequest
from ..services.auth import AuthService
from ..database.database import get_db

router = APIRouter()

class MessageResponse(BaseModel):
    message: str

class VerifyOTPResponse(BaseModel):
    reset_token: str
    message: str

@router.post("/forgot-password", status_code=status.HTTP_200_OK, response_model=MessageResponse)
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Handles a forgot password request by sending an OTP to the user's email.
    
    Args:
        request (ForgotPasswordRequest): The request containing the user's email.
        db (Session): The database session.
        
    Returns:
        MessageResponse: A generic success message to prevent user enumeration.
    """
    auth_service = AuthService(db)
    auth_service.forgot_password(request.email)
    # Always return a generic success message to prevent user enumeration
    return {"message": "If an account with that email exists, a password reset OTP has been sent."}

@router.post("/verify-reset-otp", status_code=status.HTTP_200_OK, response_model=VerifyOTPResponse)
def verify_reset_otp(request: VerifyResetOTPRequest, db: Session = Depends(get_db)):
    """
    Verifies the password reset OTP and returns a short-lived token for resetting the password.
    
    Args:
        request (VerifyResetOTPRequest): The request containing email and OTP.
        db (Session): The database session.
        
    Returns:
        VerifyOTPResponse: The reset token and a success message.
        
    Raises:
        HTTPException: If the OTP is invalid or expired.
    """
    auth_service = AuthService(db)
    reset_token = auth_service.verify_reset_otp(request.email, request.otp)
    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP.",
        )
    return {"reset_token": reset_token, "message": "OTP verified successfully."}

@router.post("/reset-password", status_code=status.HTTP_200_OK, response_model=MessageResponse)
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Handles a password reset request with a short-lived token from OTP verification.
    
    Args:
        request (ResetPasswordRequest): The request containing the reset token and new password.
        db (Session): The database session.
        
    Returns:
        MessageResponse: A success message.
        
    Raises:
        HTTPException: If the token is invalid or expired.
    """
    auth_service = AuthService(db)
    success = auth_service.reset_password(request.token, request.new_password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token.",
        )
    return {"message": "Your password has been reset successfully."}
