
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..schemas.auth import ForgotPasswordRequest, ResetPasswordRequest, VerifyResetOTPRequest
from ..services.auth import AuthService
from ..database.database import get_db

router = APIRouter()

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Handles a forgot password request by sending an OTP to the user's email.
    """
    auth_service = AuthService(db)
    await auth_service.forgot_password(request.email)
    # Always return a generic success message to prevent user enumeration
    return {"message": "If an account with that email exists, a password reset OTP has been sent."}

@router.post("/verify-reset-otp", status_code=status.HTTP_200_OK)
def verify_reset_otp(request: VerifyResetOTPRequest, db: Session = Depends(get_db)):
    """
    Verifies the password reset OTP and returns a short-lived token for resetting the password.
    """
    auth_service = AuthService(db)
    reset_token = auth_service.verify_reset_otp(request.email, request.otp)
    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP.",
        )
    return {"reset_token": reset_token, "message": "OTP verified successfully."}

@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Handles a password reset request with a short-lived token from OTP verification.
    """
    auth_service = AuthService(db)
    success = auth_service.reset_password(request.token, request.new_password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token.",
        )
    return {"message": "Your password has been reset successfully."}
