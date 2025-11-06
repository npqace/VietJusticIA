"""
Admin-only endpoints for managing users, lawyers, and viewing statistics.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import logging

from ..database.database import get_db
from ..database.models import User, Lawyer, ServiceRequest
from ..services.auth import get_current_user
from ..schemas.user import UserProfile
from ..repository import lawyer_repository, user_repository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


def verify_admin(current_user: User = Depends(get_current_user)):
    """Dependency to verify user is admin."""
    if current_user.role != User.Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


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

        # Count pending lawyer applications
        pending_lawyers = db.query(func.count(Lawyer.id)).filter(
            Lawyer.verification_status == Lawyer.VerificationStatus.PENDING
        ).scalar()

        # Count total service requests
        total_requests = db.query(func.count(ServiceRequest.id)).scalar()

        stats = {
            "total_users": total_users,
            "total_lawyers": total_lawyers,
            "pending_lawyers": pending_lawyers,
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
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Activate or deactivate a user account."""
    try:
        logger.info(f"Admin {current_user.email} updating status for user {user_id} to {is_active}")

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

        user.is_active = is_active
        db.commit()

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
