
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.user import UserRead, UserUpdate, UpdateContactRequest, VerifyUpdateContactRequest, ChangePasswordRequest
from app.services.auth import get_current_user, create_access_token
from app.core.security import verify_password, get_password_hash
from app.database.models import User
from app.repository import user_repository
from app.services.otp_service import send_verification_otp

router = APIRouter()

@router.get("/users/me", response_model=UserRead)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """
    Fetches the profile of the currently authenticated user.
    """
    return current_user

@router.patch("/users/me", response_model=UserRead)
async def update_user_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Updates the profile of the currently authenticated user.
    """
    update_data = user_update.model_dump(exclude_unset=True)
    updated_user = user_repository.update_user(db, current_user, update_data)
    return updated_user

@router.post("/users/me/change-password", response_model=dict)
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
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

@router.post("/users/me/update-contact")
async def update_contact(
    request: UpdateContactRequest,
    current_user: User = Depends(get_current_user),
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


@router.post("/users/me/verify-contact-update")
async def verify_contact_update(
    request: VerifyUpdateContactRequest,
    current_user: User = Depends(get_current_user),
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

@router.delete("/users/me", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user_me(
    current_user: User = Depends(get_current_user),
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

@router.delete("/users/me/permanent", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_me_permanently(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permanently deletes the currently authenticated user's account.
    """
    db.delete(current_user)
    db.commit()
    return
