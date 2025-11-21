"""
Admin-only endpoints for managing users, lawyers, and viewing statistics.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import logging

from ..database.database import get_db
from ..database.models import User, Lawyer, ServiceRequest
from ..services.auth import get_current_user
from ..services.audit_service import audit_service
from ..schemas.user import UserProfile, AdminCreateUser, AdminCreateUserResponse
from ..repository import lawyer_repository, user_repository
from ..core.security import get_password_hash
import secrets
import string

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


from ..core.rbac import verify_admin


@router.get("/stats")
async def get_dashboard_stats(
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics for admin."""
    try:
        logger.info(f"Admin {current_user.email} fetching dashboard stats")

        # Count total users
        total_users = db.query(func.count(User.id)).filter(
            User.role == User.Role.USER
        ).scalar()

        # Count total lawyers
        total_lawyers = db.query(func.count(Lawyer.id)).scalar()

        # Count total admins
        total_admins = db.query(func.count(User.id)).filter(
            User.role == User.Role.ADMIN
        ).scalar()

        # Count total service requests
        total_requests = db.query(func.count(ServiceRequest.id)).scalar()

        stats = {
            "total_users": total_users,
            "total_lawyers": total_lawyers,
            "total_admins": total_admins,
            "total_requests": total_requests
        }

        logger.info(f"Dashboard stats retrieved: {stats}")
        return stats

    except Exception as e:
        logger.error(f"Failed to fetch dashboard stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve dashboard statistics"
        )


@router.get("/users", response_model=List[UserProfile])
async def get_all_users(
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get all users (admin only)."""
    try:
        logger.info(f"Admin {current_user.email} fetching all users")

        users = user_repository.get_all_users(db)
        logger.info(f"Retrieved {len(users)} users")

        return users

    except Exception as e:
        logger.error(f"Failed to fetch users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve users"
        )


@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: int,
    is_active: bool,
    request: Request,
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Activate or deactivate a user account."""
    try:
        logger.info(f"Admin {current_user.email} updating status for user {user_id} to {is_active}")

        # Check if user exists
        user = user_repository.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Prevent admin from deactivating themselves
        if user.id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate your own account"
            )

        # Update status via repository
        updated_user = user_repository.update_user_status(db, user_id, is_active)
        
        # Audit Log
        audit_service.log_action(
            db=db,
            admin_id=current_user.id,
            action="UPDATE_USER_STATUS",
            target_type="USER",
            target_id=str(user_id),
            details=f"Status changed to {'Active' if is_active else 'Inactive'}",
            request=request
        )

        logger.info(f"User {user_id} status updated successfully")
        return {"message": "User status updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update user status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user status"
        )


@router.get("/requests")
async def get_all_service_requests(
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get all service requests (admin only)."""
    try:
        logger.info(f"Admin {current_user.email} fetching all service requests")

        # Get all service requests with user and lawyer info
        requests = db.query(ServiceRequest).order_by(
            ServiceRequest.created_at.desc()
        ).all()

        # Transform to response format
        request_list = []
        for req in requests:
            request_item = {
                "id": req.id,
                "user_id": req.user_id,
                "user_name": req.user.full_name,
                "lawyer_id": req.lawyer_id,
                "lawyer_name": req.lawyer.user.full_name if req.lawyer else None,
                "title": req.title,
                "description": req.description,
                "status": req.status.value,
                "created_at": req.created_at,
                "updated_at": req.updated_at
            }
            request_list.append(request_item)

        logger.info(f"Retrieved {len(request_list)} service requests")
        return request_list

    except Exception as e:
        logger.error(f"Failed to fetch service requests: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve service requests"
        )


def generate_secure_password(length: int = 12) -> str:
    """Generate a secure random password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password


@router.post("/users/create", response_model=AdminCreateUserResponse)
async def create_user_account(
    user_data: AdminCreateUser,
    request: Request,
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Create a new user account (admin only). Can create lawyers or admins only."""
    try:
        logger.info(f"Admin {current_user.email} creating new {user_data.role} account: {user_data.email}")

        # Validate role - only lawyer and admin allowed
        valid_roles = ['lawyer', 'admin']
        if user_data.role not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Admins can only create 'lawyer' or 'admin' accounts."
            )

        # If role is lawyer, lawyer_profile is required
        if user_data.role == 'lawyer' and not user_data.lawyer_profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Lawyer profile data is required when creating a lawyer account"
            )

        # Check if email already exists
        existing_user_email = user_repository.get_user_by_email(db, user_data.email)
        if existing_user_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Check if phone already exists
        existing_user_phone = user_repository.get_user_by_phone(db, user_data.phone)
        if existing_user_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number already registered"
            )

        # If lawyer, check if bar license number already exists
        if user_data.role == 'lawyer':
            existing_lawyer = db.query(Lawyer).filter(
                Lawyer.bar_license_number == user_data.lawyer_profile.bar_license_number
            ).first()
            if existing_lawyer:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Bar license number already registered"
                )

        # Generate secure random password
        generated_password = generate_secure_password()

        # Create user account
        hashed_password = get_password_hash(generated_password)
        new_user = User(
            full_name=user_data.full_name,
            email=user_data.email,
            phone=user_data.phone,
            hashed_password=hashed_password,
            role=User.Role[user_data.role.upper()],
            is_verified=True,  # Admin-created accounts are pre-verified
            is_active=True
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # If lawyer, create lawyer profile
        if user_data.role == 'lawyer':
            lawyer_profile = Lawyer(
                user_id=new_user.id,
                specialization=user_data.lawyer_profile.specialization,
                bar_license_number=user_data.lawyer_profile.bar_license_number,
                years_of_experience=user_data.lawyer_profile.years_of_experience,
                city=user_data.lawyer_profile.city,
                province=user_data.lawyer_profile.province,
                bio=user_data.lawyer_profile.bio,
                consultation_fee=user_data.lawyer_profile.consultation_fee,
                languages=user_data.lawyer_profile.languages,
                verification_status=Lawyer.VerificationStatus.APPROVED,  # Pre-approved by admin
                is_available=True
            )
            db.add(lawyer_profile)
            db.commit()
            db.refresh(lawyer_profile)
            logger.info(f"Lawyer profile created for user {new_user.id}")

        # Audit Log
        audit_service.log_action(
            db=db,
            admin_id=current_user.id,
            action="CREATE_USER",
            target_type="USER",
            target_id=str(new_user.id),
            details=f"Created {user_data.role} account: {user_data.email}",
            request=request
        )

        logger.info(f"User account created successfully: {new_user.id} ({user_data.role})")

        # Return user info with generated password
        return AdminCreateUserResponse(
            user=new_user,
            generated_password=generated_password
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create user account: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user account"
        )



