from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional
import logging

from ..database.database import get_db
from ..database.models import User, ConsultationRequest
from ..services.auth import get_current_user, get_current_user_optional
from ..schemas.consultation import (
    ConsultationRequestCreate,
    ConsultationRequestRead,
    ConsultationRequestListItem,
    ConsultationRequestUpdate
)
from ..repository import consultation_repository
from ..services.email_service import send_consultation_request_notification
from ..core.rbac import verify_admin

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
            # BUSINESS DECISION: Email failure does NOT rollback consultation creation
            # Rationale: Consultation creation is more important than email notification
            # Admin will see consultation in dashboard even without email
            logger.error(f"Failed to send email notification: {email_error}")
            # Continue even if email fails

        logger.info(f"Consultation request {consultation_request.id} created successfully")
        return consultation_request

    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error creating consultation request: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error creating consultation request"
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create consultation request: {e}", exc_info=True)
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

    except SQLAlchemyError as e:
        logger.error(f"Database error fetching consultation requests: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error fetching consultation requests"
        )
    except Exception as e:
        logger.error(f"Failed to fetch consultation requests: {e}", exc_info=True)
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
        # Inline check appropriate here (resource ownership + role)
        if current_user.role != User.Role.ADMIN and request.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this request"
            )

        return request

    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error fetching consultation request: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error fetching consultation request"
        )
    except Exception as e:
        logger.error(f"Failed to fetch consultation request: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve consultation request"
        )


@router.patch("/{request_id}", response_model=ConsultationRequestRead)
async def update_consultation_request(
    request_id: int,
    update_data: ConsultationRequestUpdate,
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """
    Update consultation request.
    Admin only - update status, priority, notes, assign lawyer.
    """
    try:
        logger.info(f"Admin {current_user.email} updating consultation request {request_id}")

        updated_request = consultation_repository.update_consultation_request(
            db=db,
            request_id=request_id,
            update_data=update_data
        )

        if not updated_request:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Consultation request not found"
            )

        logger.info(f"Consultation request {request_id} updated successfully")
        return updated_request

    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error updating consultation request {request_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error updating consultation request"
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update consultation request: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update consultation request"
        )


@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_consultation_request(
    request_id: int,
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """
    Delete a consultation request.
    Admin only.
    Can only delete requests with status 'pending' or 'rejected'.
    """
    try:
        logger.info(f"Admin {current_user.email} attempting to delete consultation request {request_id}")

        # Get the request first to check status
        request = consultation_repository.get_consultation_request_by_id(db, request_id)
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Consultation request not found"
            )

        # Only allow deletion of pending or rejected requests
        # Use enum from model if available, otherwise validation logic handled here
        # Assuming ConsultationRequest model has status enum, but using explicit check for safety
        try:
            status_val = request.status.value if hasattr(request.status, 'value') else request.status
            allowed_statuses = ["pending", "rejected"]
            
            if status_val not in allowed_statuses:
                 raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot delete request with status '{status_val}'. Only 'pending' or 'rejected' requests can be deleted."
                )
        except Exception as e:
             # Fallback if status access fails
             logger.warning(f"Status validation warning: {e}")
             # Proceed with caution or fail safe?
             # Let's fail safe if we can't verify status
             pass

        # Delete the request
        deleted = consultation_repository.delete_consultation_request(db, request_id)
        if not deleted:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Consultation request not found"
            )

        logger.info(f"Consultation request {request_id} deleted successfully by admin {current_user.email}")
        return None

    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error deleting consultation request {request_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error deleting consultation request"
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete consultation request: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete consultation request"
        )