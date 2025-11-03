from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from ..database.database import get_db
from ..database.models import User
from ..services.auth import get_current_user, get_current_user_optional
from ..schemas.consultation import (
    ConsultationRequestCreate,
    ConsultationRequestRead,
    ConsultationRequestListItem,
    ConsultationRequestUpdate
)
from ..repository import consultation_repository
from ..services.email_service import send_consultation_request_notification

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/consultations", tags=["Consultations"])


@router.post("", response_model=ConsultationRequestRead, status_code=status.HTTP_201_CREATED)
async def create_consultation_request(
    request_data: ConsultationRequestCreate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Create a new consultation request.
    Can be submitted by authenticated users or guests.
    Sends email notification to admin.
    """
    try:
        user_id = current_user.id if current_user else None
        user_email = current_user.email if current_user else "Guest"

        logger.info(f"User {user_email} creating consultation request")

        # Create consultation request
        consultation_request = consultation_repository.create_consultation_request(
            db=db,
            request_data=request_data,
            user_id=user_id
        )

        # Send email notification to admin
        try:
            await send_consultation_request_notification(consultation_request)
            logger.info(f"Email notification sent for consultation request {consultation_request.id}")
        except Exception as email_error:
            logger.error(f"Failed to send email notification: {email_error}")
            # Continue even if email fails

        logger.info(f"Consultation request {consultation_request.id} created successfully")
        return consultation_request

    except Exception as e:
        logger.error(f"Failed to create consultation request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create consultation request"
        )


@router.get("", response_model=List[ConsultationRequestListItem])
async def get_consultation_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of consultation requests.
    Regular users see only their own requests.
    Admins see all requests with filter options.
    """
    try:
        logger.info(f"User {current_user.email} fetching consultation requests")

        # If admin, show all requests with filters
        if current_user.role == User.Role.ADMIN:
            requests = consultation_repository.get_consultation_requests(
                db=db,
                skip=skip,
                limit=limit,
                status=status_filter,
                priority=priority
            )
        else:
            # Regular users only see their own requests
            requests = consultation_repository.get_consultation_requests(
                db=db,
                skip=skip,
                limit=limit,
                user_id=current_user.id
            )

        logger.info(f"Retrieved {len(requests)} consultation requests")
        return requests

    except Exception as e:
        logger.error(f"Failed to fetch consultation requests: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve consultation requests"
        )


@router.get("/{request_id}", response_model=ConsultationRequestRead)
async def get_consultation_request_detail(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get details of a specific consultation request.
    Users can only view their own requests.
    Admins can view any request.
    """
    try:
        logger.info(f"Fetching consultation request {request_id} for user {current_user.email}")

        request = consultation_repository.get_consultation_request_by_id(db, request_id)
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Consultation request not found"
            )

        # Check authorization
        if current_user.role != User.Role.ADMIN and request.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this request"
            )

        return request

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch consultation request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve consultation request"
        )


@router.patch("/{request_id}", response_model=ConsultationRequestRead)
async def update_consultation_request(
    request_id: int,
    update_data: ConsultationRequestUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update consultation request.
    Admin only - update status, priority, notes, assign lawyer.
    """
    try:
        # Check if user is admin
        if current_user.role != User.Role.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can update consultation requests"
            )

        logger.info(f"Admin {current_user.email} updating consultation request {request_id}")

        updated_request = consultation_repository.update_consultation_request(
            db=db,
            request_id=request_id,
            update_data=update_data
        )

        if not updated_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Consultation request not found"
            )

        logger.info(f"Consultation request {request_id} updated successfully")
        return updated_request

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update consultation request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update consultation request"
        )
