
from ..services.auth import get_current_active_user, get_current_user
from ..schemas.user import (
    UserProfile,
    UserUpdateProfile,
    ChangePasswordRequest,
    UpdateContactRequest,
    VerifyUpdateContactRequest
)
from ..repository import user_repository
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from ..database.database import get_db
from ..database.models import User
from ..schemas.my_requests import MyRequestsResponse
from ..repository import service_request_repository, consultation_repository, help_request_repository
from ..core.security import verify_password, get_password_hash, create_access_token
from ..services.brevo_email_service import send_verification_otp
from ..utils.file_storage import save_avatar, delete_avatar
import logging

logger = logging.getLogger(__name__)



router = APIRouter(
    prefix="/api/v1/users",
    tags=["Users"],
    responses={404: {"description": "Not found"}},
)


@router.get("/me", response_model=UserProfile)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    Get current user's profile.
    """
    try:
        return current_user
    except Exception as e:
        logger.error(f"Error fetching current user profile: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/me/requests", response_model=MyRequestsResponse)
def get_my_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all requests (service, consultation, help) for the current user.
    """
    try:
        service_requests = service_request_repository.get_service_requests_by_user_id(db, current_user.id)
        consultation_requests = consultation_repository.get_consultation_requests(db, user_id=current_user.id)
        help_requests = help_request_repository.get_help_requests(db, user_id=current_user.id)

        return {
            "service_requests": service_requests,
            "consultation_requests": consultation_requests,
            "help_requests": help_requests,
        }
    except Exception as e:
        logger.error(f"Error fetching user requests: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.patch("/me", response_model=UserProfile)
async def update_user_profile(
    *,
    db: Session = Depends(get_db),
    user_update: UserUpdateProfile,
    current_user: User = Depends(get_current_active_user)
):
    """
    Updates the profile of the currently authenticated user.
    """
    try:
        if isinstance(user_update, dict):
            update_data = user_update
        else:
            update_data = user_update.model_dump(exclude_unset=True)
            
        updated_user = user_repository.update_user(db, current_user, update_data)
        return updated_user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user profile: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/me/avatar", response_model=UserProfile)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Uploads a new avatar for the current user.
    Accepts image files (JPG, PNG, WEBP) up to 5MB.
    Automatically resizes images larger than 2048x2048.
    """
    try:
        # Delete old avatar if exists
        if current_user.avatar_url:
            delete_avatar(current_user.avatar_url)

        # Save new avatar
        avatar_url = await save_avatar(file, current_user.id)

        # Update user record
        updated_user = user_repository.update_user(db, current_user, {"avatar_url": avatar_url})

        return updated_user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading avatar: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.delete("/me/avatar", response_model=UserProfile)
async def delete_user_avatar(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Deletes the current user's avatar.
    """
    try:
        if not current_user.avatar_url:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No avatar to delete"
            )

        # Delete avatar file
        delete_avatar(current_user.avatar_url)

        # Update user record
        updated_user = user_repository.update_user(db, current_user, {"avatar_url": None})

        return updated_user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting avatar: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/me/change-password", response_model=dict)
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Changes the password for the currently authenticated user.
    """
    try:
        if not verify_password(request.current_password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect current password.",
            )
        
        if request.new_password != request.confirm_new_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New passwords do not match.",
            )

        hashed_password = get_password_hash(request.new_password)
        user_repository.update_user(db, current_user, {"hashed_password": hashed_password})

        return {"message": "Password changed successfully."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/me/update-contact")
async def update_contact(
    request: UpdateContactRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Initiates the process of updating a user's email or phone number.
    It saves the new contact info in temporary fields and sends an OTP for verification.
    """
    try:
        otp_sent = False
        target_email = current_user.email # Default to current email

        if request.email:
            if user_repository.get_user_by_email(db, request.email):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email đã được đăng ký",
                )
            current_user.new_email = request.email
            target_email = request.email # Send to new email

        if request.phone:
            if user_repository.get_user_by_phone(db, request.phone):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Số điện thoại đã được đăng ký",
                )
            current_user.new_phone = request.phone

        # If either email or phone is being updated, send the OTP
        if request.email or request.phone:
            logger.info(f"Sending OTP for contact update to: {target_email}, user_id={current_user.id}")
            await send_verification_otp(db, current_user, email=target_email)
            otp_sent = True

        # Save the changes to new_email or new_phone
        user_repository.update_user(db, current_user, {})

        if otp_sent:
            return {"message": "OTP sent for verification."}
        else:
            return {"message": "No changes detected."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating contact info: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/me/verify-contact-update")
async def verify_contact_update(
    request: VerifyUpdateContactRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Verifies the OTP to finalize the contact information update.
    """
    try:
        if not user_repository.verify_otp(db, current_user, request.otp):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP",
            )

        email_changed = False
        if request.email and current_user.new_email == request.email:
            current_user.email = current_user.new_email
            current_user.new_email = None
            email_changed = True
        
        if request.phone and current_user.new_phone == request.phone:
            current_user.phone = current_user.new_phone
            current_user.new_phone = None

        # Clear OTP after successful verification
        current_user.otp = None
        current_user.otp_expires_at = None
        
        updated_user = user_repository.update_user(db, current_user, {})

        access_token = None
        refresh_token = None
        if email_changed:
            # Re-issue a token with the new email
            access_token = create_access_token(data={"sub": updated_user.email})
            refresh_token = create_refresh_token(data={"sub": updated_user.email})

        return {
            "message": "Contact information updated successfully.",
            "user": updated_user,
            "access_token": access_token,
            "refresh_token": refresh_token,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying contact update: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Deactivates the currently authenticated user's account.
    """
    try:
        logger.info(f"Attempting to deactivate user: {current_user.email}, active: {current_user.is_active}")
        if not current_user.is_active:
            logger.info("User is already inactive, raising 400")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account is already inactive.",
            )
        
        user_repository.update_user(db, current_user, {"is_active": False})
        return
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deactivating user: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.delete("/me/permanent", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_me_permanently(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Permanently deletes the currently authenticated user's account.
    """
    try:
        if not user_repository.delete_user_permanently(db, current_user.id):
             raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete account"
            )
        return
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user permanently: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
