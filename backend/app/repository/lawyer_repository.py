from typing import List, Optional, Dict, Any, Annotated
from fastapi import Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy import distinct
import logging

from ..database.models import Lawyer, ServiceRequest, User
from ..schemas.lawyer import LawyerCreate, LawyerUpdate, LawyerSearchParams
from ..schemas.service_request import ServiceRequestCreate, ServiceRequestUpdate, ServiceRequestFilterParams
from ..schemas.common import PaginationParams
from ..database.database import get_db

logger = logging.getLogger(__name__)

# Constants
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
SERVICE_REQUEST_PAGE_SIZE = 50


def _service_request_eager_load():
    """
    Common eager loading options for service requests.

    Loads user and lawyer (with user) relationships to prevent N+1 queries.
    """
    return [
        joinedload(ServiceRequest.user),
        joinedload(ServiceRequest.lawyer).joinedload(Lawyer.user)
    ]


def create_lawyer(
    db: Annotated[Session, Depends(get_db)], 
    lawyer_data: LawyerCreate
) -> Lawyer:
    """
    Create a new lawyer profile.

    Creates a lawyer profile linked to an existing user account.
    The user must not already have a lawyer profile.

    Args:
        db: Database session (injected by FastAPI)
        lawyer_data: Validated lawyer creation data including:
            - user_id: ID of the user account
            - bar_license_number: Unique bar license number
            - specialization: Legal specialization areas
            - years_of_experience: Years of legal practice
            - Other optional profile fields

    Returns:
        Created Lawyer instance

    Raises:
        ValueError: If user_id or bar_license_number already exists
        RuntimeError: For database connection/operation errors
    """
    try:
        logger.info(f"Creating lawyer for user_id={lawyer_data.user_id}")
        db_lawyer = Lawyer(**lawyer_data.model_dump())
        db.add(db_lawyer)
        db.commit()
        db.refresh(db_lawyer)
        logger.info(f"Created lawyer id={db_lawyer.id}")
        return db_lawyer
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Integrity error creating lawyer: {e}")
        if "user_id" in str(e):
            raise ValueError("Lawyer profile already exists for this user")
        elif "bar_license_number" in str(e):
            raise ValueError("Bar license number already in use")
        raise ValueError("Failed to create lawyer: duplicate entry")
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error creating lawyer: {e}")
        raise RuntimeError("Database error occurred")


def get_lawyer_by_id(db: Session, lawyer_id: int) -> Optional[Lawyer]:
    """
    Get lawyer by ID with user relationship.
    
    Args:
        db: Database session
        lawyer_id: ID of the lawyer
        
    Returns:
        Lawyer object or None if not found
    """
    try:
        logger.info(f"Fetching lawyer by ID: {lawyer_id}")
        return db.query(Lawyer).options(joinedload(Lawyer.user)).filter(Lawyer.id == lawyer_id).first()
    except SQLAlchemyError as e:
        logger.error(f"Database error fetching lawyer {lawyer_id}: {e}")
        return None


def get_lawyer_by_user_id(db: Session, user_id: int) -> Optional[Lawyer]:
    """
    Get lawyer profile by user ID.
    
    Args:
        db: Database session
        user_id: ID of the user
        
    Returns:
        Lawyer object or None if not found
    """
    try:
        logger.info(f"Fetching lawyer by user_id: {user_id}")
        return db.query(Lawyer).options(joinedload(Lawyer.user)).filter(Lawyer.user_id == user_id).first()
    except SQLAlchemyError as e:
        logger.error(f"Database error fetching lawyer for user {user_id}: {e}")
        return None


def get_lawyers(db: Session, params: LawyerSearchParams) -> List[Lawyer]:
    """
    Get list of lawyers with optional filters.

    Returns approved lawyers by default. Admin view includes pending/rejected.
    Results are ordered by rating (highest first) and paginated.

    Args:
        db: Database session
        params: Validated search parameters including:
            - search: Partial name match (min 2 chars, max 100)
            - specialization: Filter by specialization (partial match)
            - city: Filter by city (partial match)
            - province: Filter by province (partial match)
            - min_rating: Minimum rating (0.0-5.0)
            - is_available: Filter by availability
            - admin_view: Include unapproved lawyers (admin only)
            - skip: Pagination offset (default 0)
            - limit: Max results (1-100, default 20)

    Returns:
        List of Lawyer objects with user relationships loaded (max params.limit items)
    """
    try:
        logger.info(f"Listing lawyers with params: {params}")
        
        query = db.query(Lawyer).options(joinedload(Lawyer.user))

        # Filter by verification status only if not admin view
        if not params.admin_view:
            query = query.filter(
                Lawyer.verification_status == Lawyer.VerificationStatus.APPROVED
            )

        # Search by name (join with User table)
        if params.search:
            query = query.join(User).filter(
                User.full_name.ilike(f"%{params.search}%")
            )

        # Filter by specialization
        if params.specialization:
            query = query.filter(Lawyer.specialization.ilike(f"%{params.specialization}%"))

        # Filter by location
        if params.city:
            query = query.filter(Lawyer.city.ilike(f"%{params.city}%"))
        if params.province:
            query = query.filter(Lawyer.province.ilike(f"%{params.province}%"))

        # Filter by minimum rating
        if params.min_rating is not None:
            query = query.filter(Lawyer.rating >= params.min_rating)

        # Filter by availability
        if params.is_available is not None:
            query = query.filter(Lawyer.is_available == params.is_available)

        # Order by rating (highest first)
        query = query.order_by(Lawyer.rating.desc())

        return query.offset(params.skip).limit(params.limit).all()
    except SQLAlchemyError as e:
        logger.error(f"Database error listing lawyers: {e}")
        return []


def update_lawyer(db: Session, lawyer_id: int, lawyer_data: LawyerUpdate) -> Optional[Lawyer]:
    """
    Update lawyer profile.
    
    Args:
        db: Database session
        lawyer_id: ID of the lawyer
        lawyer_data: Data to update
        
    Returns:
        Updated Lawyer object or None if not found
        
    Raises:
        RuntimeError: For database connection/operation errors
    """
    try:
        db_lawyer = db.query(Lawyer).filter(Lawyer.id == lawyer_id).first()
        if not db_lawyer:
            logger.warning(f"Lawyer {lawyer_id} not found for update")
            return None

        update_data = lawyer_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_lawyer, key, value)

        db.commit()
        db.refresh(db_lawyer)
        logger.info(f"Updated lawyer {lawyer_id}")
        return db_lawyer
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Failed to update lawyer {lawyer_id}: {e}")
        raise RuntimeError(f"Database error updating lawyer")


def update_lawyer_rating(
    db: Session, 
    lawyer_id: int, 
    new_rating: float, 
    total_reviews: int
) -> Optional[Lawyer]:
    """
    Update lawyer's rating and review count.
    
    Args:
        db: Database session
        lawyer_id: ID of the lawyer
        new_rating: New average rating (0.0-5.0)
        total_reviews: Total number of reviews (>= 0)
        
    Returns:
        Updated Lawyer object or None if not found
        
    Raises:
        ValueError: If rating or reviews invalid
        RuntimeError: For database connection/operation errors
    """
    # Validate inputs
    if not (0.0 <= new_rating <= 5.0):
        raise ValueError("Rating must be between 0.0 and 5.0")
    if total_reviews < 0:
        raise ValueError("Total reviews must be non-negative")

    try:
        db_lawyer = db.query(Lawyer).filter(Lawyer.id == lawyer_id).first()
        if not db_lawyer:
            logger.warning(f"Lawyer {lawyer_id} not found for rating update")
            return None
            
        db_lawyer.rating = new_rating
        db_lawyer.total_reviews = total_reviews
        db.commit()
        db.refresh(db_lawyer)
        logger.info(f"Updated rating for lawyer {lawyer_id}: {new_rating} ({total_reviews} reviews)")
        return db_lawyer
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Failed to update rating for lawyer {lawyer_id}: {e}")
        raise RuntimeError(f"Database error updating lawyer rating")


# ServiceRequest operations

def create_service_request(
    db: Session, 
    user_id: int, 
    request_data: ServiceRequestCreate
) -> ServiceRequest:
    """
    Create a new service request.
    
    Args:
        db: Database session
        user_id: ID of the user creating the request
        request_data: Validated request data
        
    Returns:
        Created ServiceRequest object
        
    Raises:
        RuntimeError: For database connection/operation errors
    """
    try:
        logger.info(f"Creating service request for user_id={user_id}")
        db_request = ServiceRequest(
            user_id=user_id,
            **request_data.model_dump()
        )
        db.add(db_request)
        db.commit()
        db.refresh(db_request)
        logger.info(f"Created service request id={db_request.id}")
        return db_request
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Failed to create service request: {e}")
        raise RuntimeError("Database error creating service request")


def get_service_request_by_id(db: Session, request_id: int) -> Optional[ServiceRequest]:
    """
    Get service request by ID.
    
    Args:
        db: Database session
        request_id: ID of the service request
        
    Returns:
        ServiceRequest object or None if not found
    """
    try:
        logger.info(f"Fetching service request {request_id}")
        return db.query(ServiceRequest).options(
            *_service_request_eager_load()
        ).filter(ServiceRequest.id == request_id).first()
    except SQLAlchemyError as e:
        logger.error(f"Database error fetching service request {request_id}: {e}")
        return None


def get_user_service_requests(
    db: Session, 
    user_id: int, 
    params: PaginationParams
) -> List[ServiceRequest]:
    """
    Get all service requests made by a user.
    
    Args:
        db: Database session
        user_id: ID of the user
        params: Pagination parameters (skip, limit)
        
    Returns:
        List of ServiceRequest objects
    """
    try:
        logger.info(f"Fetching service requests for user {user_id}")
        return db.query(ServiceRequest).options(
            *_service_request_eager_load()
        ).filter(
            ServiceRequest.user_id == user_id
        ).order_by(
            ServiceRequest.created_at.desc()
        ).offset(params.skip).limit(params.limit).all()
    except SQLAlchemyError as e:
        logger.error(f"Database error fetching user service requests: {e}")
        return []


def get_lawyer_service_requests(
    db: Session,
    lawyer_id: int,
    params: ServiceRequestFilterParams
) -> List[ServiceRequest]:
    """
    Get all service requests for a lawyer, optionally filtered by status.
    
    Args:
        db: Database session
        lawyer_id: ID of the lawyer
        params: Filter parameters (status, pagination)
        
    Returns:
        List of ServiceRequest objects
    """
    try:
        logger.info(f"Fetching service requests for lawyer {lawyer_id} with params: {params}")
        query = db.query(ServiceRequest).options(
            *_service_request_eager_load()
        ).filter(
            ServiceRequest.lawyer_id == lawyer_id
        )

        if params.status:
            # Already validated by Pydantic (enum type)
            query = query.filter(ServiceRequest.status == params.status)

        return query.order_by(
            ServiceRequest.created_at.desc()
        ).offset(params.skip).limit(params.limit).all()
    except SQLAlchemyError as e:
        logger.error(f"Database error fetching lawyer service requests: {e}")
        return []


def update_service_request(
    db: Session,
    request_id: int,
    update_data: ServiceRequestUpdate
) -> Optional[ServiceRequest]:
    """
    Update service request (typically by lawyer).
    
    Args:
        db: Database session
        request_id: ID of the request
        update_data: Data to update
        
    Returns:
        Updated ServiceRequest or None if not found
        
    Raises:
        RuntimeError: For database connection/operation errors
    """
    try:
        db_request = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()
        if not db_request:
            logger.warning(f"Service request {request_id} not found for update")
            return None

        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(db_request, key, value)

        db.commit()
        db.refresh(db_request)
        logger.info(f"Updated service request {request_id}")
        return db_request
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Failed to update service request {request_id}: {e}")
        raise RuntimeError("Database error updating service request")


def cancel_service_request(db: Session, request_id: int, user_id: int) -> Optional[ServiceRequest]:
    """
    Cancel a service request (user only).
    Only PENDING requests can be cancelled.
    
    Args:
        db: Database session
        request_id: ID of the request
        user_id: ID of the requesting user (for ownership verification)
        
    Returns:
        Updated ServiceRequest or None if not found/not PENDING
        
    Raises:
        ValueError: If request is not in PENDING status
        RuntimeError: For database connection/operation errors
    """
    try:
        db_request = db.query(ServiceRequest).filter(
            ServiceRequest.id == request_id,
            ServiceRequest.user_id == user_id
        ).first()

        if not db_request:
            logger.warning(f"Service request {request_id} not found for cancellation (user {user_id})")
            return None
            
        # Only allow cancelling PENDING requests
        if db_request.status != ServiceRequest.RequestStatus.PENDING:
            logger.warning(f"Cannot cancel request {request_id}: status is {db_request.status}")
            raise ValueError(
                f"Cannot cancel request in {db_request.status.value} status. Only PENDING requests can be cancelled."
            )

        db_request.status = ServiceRequest.RequestStatus.CANCELLED
        db.commit()
        db.refresh(db_request)
        logger.info(f"Cancelled service request {request_id}")
        return db_request
        
    except ValueError:
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Failed to cancel service request {request_id}: {e}")
        raise RuntimeError("Database error cancelling service request")


def get_filter_options(db: Session) -> dict:
    """
    Get unique filter options for lawyers.
    
    Returns distinct specializations and cities from approved lawyers.
    Handles comma-separated values by splitting in Python.
    
    Returns:
        dict: {
            "specializations": ["Civil Law", "Criminal Law", ...],
            "cities": ["Hanoi", "Ho Chi Minh City", ...]
        }
    """
    try:
        # Get distinct specializations via distinct() on Python side 
        # (SQLAlchemy distinct() works on rows)
        specialization_rows = db.query(
            distinct(Lawyer.specialization)
        ).filter(
            Lawyer.verification_status == Lawyer.VerificationStatus.APPROVED,
            Lawyer.specialization.isnot(None),
            Lawyer.specialization != ''
        ).all()

        # Split comma-separated values
        specializations_set = set()
        for (spec,) in specialization_rows:
            if spec:
                specs = [s.strip() for s in spec.split(',')]
                specializations_set.update(specs)

        # Get distinct cities
        city_rows = db.query(
            distinct(Lawyer.city)
        ).filter(
            Lawyer.verification_status == Lawyer.VerificationStatus.APPROVED,
            Lawyer.city.isnot(None),
            Lawyer.city != ''
        ).all()

        # Split comma-separated values
        cities_set = set()
        for (city,) in city_rows:
            if city:
                city_list = [c.strip() for c in city.split(',')]
                cities_set.update(city_list)

        return {
            "specializations": sorted(list(specializations_set)),
            "cities": sorted(list(cities_set))
        }
    except SQLAlchemyError as e:
        logger.error(f"Database error getting filter options: {e}")
        # Return empty options on error rather than crashing
        return {"specializations": [], "cities": []}