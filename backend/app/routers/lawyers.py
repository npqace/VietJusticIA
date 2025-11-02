from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from ..database.database import get_db
from ..database.models import User
from ..services.auth import get_current_user
from ..schemas.lawyer import (
    LawyerInList,
    LawyerDetail,
    ServiceRequestCreate,
    ServiceRequestRead,
    ServiceRequestListItem,
    ServiceRequestUpdate
)
from ..repository import lawyer_repository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/lawyers", tags=["Lawyers"])


@router.get("/filters/options")
async def get_lawyer_filter_options(db: Session = Depends(get_db)):
    """Get available filter options for lawyers (specializations, cities)."""
    try:
        logger.info("Fetching lawyer filter options")
        options = lawyer_repository.get_filter_options(db)
        logger.info(f"Retrieved {len(options['specializations'])} specializations, {len(options['cities'])} cities")
        return options
    except Exception as e:
        logger.error(f"Failed to fetch lawyer filter options: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve filter options"
        )


@router.get("", response_model=List[LawyerInList])
async def get_lawyers(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by lawyer name"),
    specialization: Optional[str] = Query(None, description="Filter by specialization"),
    city: Optional[str] = Query(None, description="Filter by city"),
    province: Optional[str] = Query(None, description="Filter by province"),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    is_available: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get list of lawyers with optional filters.
    Only returns approved lawyers.
    """
    try:
        logger.info(f"Fetching lawyers with filters: search={search}, specialization={specialization}")

        lawyers = lawyer_repository.get_lawyers(
            db=db,
            skip=skip,
            limit=limit,
            search=search,
            specialization=specialization,
            city=city,
            province=province,
            min_rating=min_rating,
            is_available=is_available
        )

        # Transform to response format with user data
        lawyer_list = []
        for lawyer in lawyers:
            lawyer_dict = {
                "id": lawyer.id,
                "full_name": lawyer.user.full_name,
                "avatar_url": lawyer.user.avatar_url,
                "specialization": lawyer.specialization,
                "city": lawyer.city,
                "province": lawyer.province,
                "rating": lawyer.rating,
                "total_reviews": lawyer.total_reviews,
                "consultation_fee": lawyer.consultation_fee,
                "is_available": lawyer.is_available,
                "years_of_experience": lawyer.years_of_experience
            }
            lawyer_list.append(lawyer_dict)

        logger.info(f"Retrieved {len(lawyer_list)} lawyers")
        return lawyer_list

    except Exception as e:
        logger.error(f"Failed to fetch lawyers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve lawyers"
        )


@router.get("/{lawyer_id}", response_model=LawyerDetail)
async def get_lawyer_detail(
    lawyer_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific lawyer."""
    try:
        logger.info(f"Fetching lawyer detail for ID: {lawyer_id}")

        lawyer = lawyer_repository.get_lawyer_by_id(db, lawyer_id)
        if not lawyer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lawyer not found"
            )

        # Check if approved
        if lawyer.verification_status != lawyer.VerificationStatus.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lawyer profile not available"
            )

        # Transform to response format
        lawyer_detail = {
            "id": lawyer.id,
            "full_name": lawyer.user.full_name,
            "avatar_url": lawyer.user.avatar_url,
            "email": lawyer.user.email,
            "phone": lawyer.user.phone,
            "specialization": lawyer.specialization,
            "bio": lawyer.bio,
            "city": lawyer.city,
            "province": lawyer.province,
            "rating": lawyer.rating,
            "total_reviews": lawyer.total_reviews,
            "consultation_fee": lawyer.consultation_fee,
            "is_available": lawyer.is_available,
            "years_of_experience": lawyer.years_of_experience,
            "bar_license_number": lawyer.bar_license_number,
            "languages": lawyer.languages,
            "verification_status": lawyer.verification_status.value,
            "created_at": lawyer.created_at
        }

        logger.info(f"Lawyer detail retrieved successfully: {lawyer.user.full_name}")
        return lawyer_detail

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch lawyer detail: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve lawyer details"
        )


# Service Request endpoints

@router.post("/requests", response_model=ServiceRequestRead, status_code=status.HTTP_201_CREATED)
async def create_service_request(
    request_data: ServiceRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new service request to a lawyer.
    Requires authentication.
    """
    try:
        logger.info(f"User {current_user.email} creating service request for lawyer {request_data.lawyer_id}")

        # Verify lawyer exists and is available
        lawyer = lawyer_repository.get_lawyer_by_id(db, request_data.lawyer_id)
        if not lawyer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lawyer not found"
            )

        if not lawyer.is_available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Lawyer is not currently accepting requests"
            )

        # Create request
        service_request = lawyer_repository.create_service_request(
            db=db,
            user_id=current_user.id,
            request_data=request_data
        )

        # Fetch full request with relationships
        full_request = lawyer_repository.get_service_request_by_id(db, service_request.id)

        # Transform to response
        request_response = {
            "id": full_request.id,
            "user_id": full_request.user_id,
            "lawyer_id": full_request.lawyer_id,
            "title": full_request.title,
            "description": full_request.description,
            "status": full_request.status.value,
            "lawyer_response": full_request.lawyer_response,
            "rejected_reason": full_request.rejected_reason,
            "created_at": full_request.created_at,
            "updated_at": full_request.updated_at,
            "user_name": full_request.user.full_name,
            "lawyer_name": full_request.lawyer.user.full_name
        }

        logger.info(f"Service request {service_request.id} created successfully")
        return request_response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create service request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create service request"
        )


@router.get("/requests/my-requests", response_model=List[ServiceRequestListItem])
async def get_my_service_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all service requests made by the current user.
    Requires authentication.
    """
    try:
        logger.info(f"Fetching service requests for user {current_user.email}")

        requests = lawyer_repository.get_user_service_requests(
            db=db,
            user_id=current_user.id,
            skip=skip,
            limit=limit
        )

        # Transform to list format
        request_list = []
        for req in requests:
            request_item = {
                "id": req.id,
                "lawyer_id": req.lawyer_id,
                "lawyer_name": req.lawyer.user.full_name,
                "lawyer_avatar": req.lawyer.user.avatar_url,
                "title": req.title,
                "status": req.status.value,
                "created_at": req.created_at
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


@router.get("/requests/{request_id}", response_model=ServiceRequestRead)
async def get_service_request_detail(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get details of a specific service request.
    User can only view their own requests.
    """
    try:
        logger.info(f"Fetching service request {request_id} for user {current_user.email}")

        request = lawyer_repository.get_service_request_by_id(db, request_id)
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Service request not found"
            )

        # Verify ownership
        if request.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this request"
            )

        # Transform to response
        request_response = {
            "id": request.id,
            "user_id": request.user_id,
            "lawyer_id": request.lawyer_id,
            "title": request.title,
            "description": request.description,
            "status": request.status.value,
            "lawyer_response": request.lawyer_response,
            "rejected_reason": request.rejected_reason,
            "created_at": request.created_at,
            "updated_at": request.updated_at,
            "user_name": request.user.full_name,
            "lawyer_name": request.lawyer.user.full_name
        }

        return request_response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch service request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve service request"
        )


@router.delete("/requests/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_service_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel a pending service request.
    Only the user who created it can cancel, and only if it's still pending.
    """
    try:
        logger.info(f"Cancelling service request {request_id} by user {current_user.email}")

        cancelled = lawyer_repository.cancel_service_request(
            db=db,
            request_id=request_id,
            user_id=current_user.id
        )

        if not cancelled:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel this request (not found, not yours, or not in pending status)"
            )

        logger.info(f"Service request {request_id} cancelled successfully")
        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel service request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel service request"
        )
