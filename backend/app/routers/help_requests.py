from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from ..database.database import get_db
from ..database.models import User
from ..services.auth import get_current_user, get_current_user_optional
from ..schemas.help_request import (
    HelpRequestCreate,
    HelpRequestRead,
    HelpRequestListItem,
    HelpRequestUpdate
)
from ..repository import help_request_repository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/help-requests", tags=["Help Requests"])


@router.post("", response_model=HelpRequestRead, status_code=status.HTTP_201_CREATED)
async def create_help_request(
    request_data: HelpRequestCreate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Create a new help request.
    Can be submitted by authenticated users or guests.
    """
    try:
        user_id = current_user.id if current_user else None
        user_email = current_user.email if current_user else "Guest"

        logger.info(f"User {user_email} creating help request")

        # Create help request
        help_request = help_request_repository.create_help_request(
            db=db,
            request_data=request_data,
            user_id=user_id
        )

        logger.info(f"Help request {help_request.id} created successfully")
        return help_request

    except Exception as e:
        logger.error(f"Failed to create help request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create help request"
        )


@router.get("", response_model=List[HelpRequestListItem])
async def get_help_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of help requests.
    Regular users see only their own requests.
    Admins see all requests with filter options.
    """
    try:
        logger.info(f"User {current_user.email} fetching help requests")

        # If admin, show all requests with filters
        if current_user.role == User.Role.ADMIN:
            requests = help_request_repository.get_help_requests(
                db=db,
                skip=skip,
                limit=limit,
                status=status_filter
            )
        else:
            # Regular users only see their own requests
            requests = help_request_repository.get_help_requests(
                db=db,
                skip=skip,
                limit=limit,
                user_id=current_user.id
            )

        logger.info(f"Retrieved {len(requests)} help requests")
        return requests

    except Exception as e:
        logger.error(f"Failed to fetch help requests: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve help requests"
        )


@router.get("/{request_id}", response_model=HelpRequestRead)
async def get_help_request_detail(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get details of a specific help request.
    Users can only view their own requests.
    Admins can view any request.
    """
    try:
        logger.info(f"Fetching help request {request_id} for user {current_user.email}")

        request = help_request_repository.get_help_request_by_id(db, request_id)
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Help request not found"
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
        logger.error(f"Failed to fetch help request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve help request"
        )


@router.patch("/{request_id}", response_model=HelpRequestRead)
async def update_help_request(
    request_id: int,
    update_data: HelpRequestUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update help request.
    Admin only - update status and notes.
    """
    try:
        # Check if user is admin
        if current_user.role != User.Role.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can update help requests"
            )

        logger.info(f"Admin {current_user.email} updating help request {request_id}")

        updated_request = help_request_repository.update_help_request(
            db=db,
            request_id=request_id,
            update_data=update_data,
            admin_id=current_user.id
        )

        if not updated_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Help request not found"
            )

        logger.info(f"Help request {request_id} updated successfully")
        return updated_request

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update help request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update help request"
        )
