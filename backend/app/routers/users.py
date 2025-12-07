
from ..services.auth import get_current_active_user
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
from ..core.security import verify_password, get_password_hash, create_access_token, create_refresh_token
from ..services.brevo_email_service import send_verification_otp
from ..utils.file_storage import save_avatar, delete_avatar



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
    return current_user

@router.get("/me/requests", response_model=MyRequestsResponse)
def get_my_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all requests (service, consultation, help) for the current user.
    """
    service_requests = service_request_repository.get_service_requests_by_user_id(db, current_user.id)
    consultation_requests = consultation_repository.get_consultation_requests(db, user_id=current_user.id)
    help_requests = help_request_repository.get_help_requests(db, user_id=current_user.id)

    return {
        "service_requests": service_requests,
        "consultation_requests": consultation_requests,
        "help_requests": help_requests,
    }


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
    update_data = user_update.model_dump(exclude_unset=True)
    updated_user = user_repository.update_user(db, current_user, update_data)
    return updated_user


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
    # Delete old avatar if exists
    if current_user.avatar_url:
        delete_avatar(current_user.avatar_url)

    # Save new avatar
    avatar_url = await save_avatar(file, current_user.id)

    # Update user record
    updated_user = user_repository.update_user(db, current_user, {"avatar_url": avatar_url})

    return updated_user


@router.delete("/me/avatar", response_model=UserProfile)
async def delete_user_avatar(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Deletes the current user's avatar.
    """
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

@router.post("/me/change-password", response_model=dict)
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Changes the password for the currently authenticated user.
    """
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

    current_user.hashed_password = get_password_hash(request.new_password)
    db.commit()

    return {"message": "Password changed successfully."}

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
    otp_sent = False
    target_email = current_user.email # Default to current email

    if request.email:
        if user_repository.get_user_by_email(db, request.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        current_user.new_email = request.email
        target_email = request.email # Send to new email

    if request.phone:
        if user_repository.get_user_by_phone(db, request.phone):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number already registered",
            )
        current_user.new_phone = request.phone

    # If either email or phone is being updated, send the OTP
    if request.email or request.phone:
        print(f"Sending OTP to: {target_email}") # Logging the target email
        await send_verification_otp(db, current_user, email=target_email)
        otp_sent = True

    # Save the changes to new_email or new_phone
    user_repository.update_user(db, current_user, {})

    if otp_sent:
        return {"message": "OTP sent for verification."}
    else:
        return {"message": "No changes detected."}


@router.post("/me/verify-contact-update")
async def verify_contact_update(
    request: VerifyUpdateContactRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Verifies the OTP to finalize the contact information update.
    """
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
    if email_changed:
        # Re-issue a token with the new email
        access_token = create_access_token(data={"sub": updated_user.email})

    return {
        "message": "Contact information updated successfully.",
        "user": updated_user,
        "access_token": access_token,
    }

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user_me(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Deactivates the currently authenticated user's account.
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is already inactive.",
        )
    
    user_repository.update_user(db, current_user, {"is_active": False})
    return

@router.delete("/me/permanent", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_me_permanently(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Permanently deletes the currently authenticated user's account.
    """
    db.delete(current_user)
    db.commit()
    return
