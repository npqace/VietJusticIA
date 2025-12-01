from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from typing import List, Optional, Dict, Any, Literal
import logging

from ..database.models import ServiceRequest, Lawyer
from ..schemas.service_request import ServiceRequestCreate, ServiceRequestUpdate, ServiceRequestFilterParams
from ..schemas.common import PaginationParams

logger = logging.getLogger(__name__)

# Constants
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 100


def _service_request_eager_load():
    """
    Common eager loading options for service requests.

    Loads user and lawyer (with user) relationships to prevent N+1 queries.
    """
    return [
        joinedload(ServiceRequest.user),
        joinedload(ServiceRequest.lawyer).joinedload(Lawyer.user)
    ]


def create_service_request(
    db: Session,
    user_id: int,
    request_data: ServiceRequestCreate
) -> ServiceRequest:
    """
    Create a new service request.

    Args:
        db: Database session
        user_id: ID of the requesting user
        request_data: Validated service request data (lawyer_id, title, description)

    Returns:
        Created ServiceRequest instance

    Raises:
        ValueError: If user_id or lawyer_id not found
        RuntimeError: Database error
    """
    try:
        logger.info(f"Creating service request for user {user_id} to lawyer {request_data.lawyer_id}")

        db_request = ServiceRequest(
            user_id=user_id,
            **request_data.model_dump()
        )
        db.add(db_request)
        db.commit()
        db.refresh(db_request)

        logger.info(f"Created service request {db_request.id}")
        return db_request

    except IntegrityError as e:
        db.rollback()
        logger.error(f"Integrity error creating service request: {e}")
        if "user_id" in str(e):
            raise ValueError(f"User {user_id} not found")
        elif "lawyer_id" in str(e):
            raise ValueError(f"Lawyer {request_data.lawyer_id} not found")
        raise ValueError("Failed to create service request")

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error creating service request: {e}")
        raise RuntimeError("Database error occurred")


def get_service_request_by_id(db: Session, request_id: int) -> Optional[ServiceRequest]:
    """
    Get a single service request by its ID with user and lawyer relationships loaded.
    
    Args:
        db: Database session
        request_id: ID of the service request
        
    Returns:
        ServiceRequest object or None if not found
    """
    try:
        logger.debug(f"Fetching service request {request_id}")
        return db.query(ServiceRequest).options(
            *_service_request_eager_load()
        ).filter(ServiceRequest.id == request_id).first()
    except SQLAlchemyError as e:
        logger.error(f"Failed to fetch service request {request_id}: {e}")
        return None


def get_service_requests_by_user_id(
    db: Session, 
    user_id: int,
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE
) -> List[ServiceRequest]:
    """
    Get all service requests made by a specific user.

    Eagerly loads user and lawyer relationships to prevent N+1 queries.

    Args:
        db: Database session
        user_id: ID of the user
        skip: Pagination offset (default 0)
        limit: Max results (default 50, max 100)

    Returns:
        List of ServiceRequest objects with relationships loaded, ordered by created_at desc
    """
    # Validate pagination
    if skip < 0:
        logger.warning(f"Invalid skip value: {skip}, using 0")
        skip = 0
        
    if limit < 1:
        logger.warning(f"Invalid limit value: {limit}, using default {DEFAULT_PAGE_SIZE}")
        limit = DEFAULT_PAGE_SIZE
    elif limit > MAX_PAGE_SIZE:
        logger.warning(f"Limit {limit} exceeds max {MAX_PAGE_SIZE}, using max")
        limit = MAX_PAGE_SIZE

    try:
        logger.info(f"Fetching service requests for user {user_id} (skip={skip}, limit={limit})")

        requests = db.query(ServiceRequest).options(
            *_service_request_eager_load()
        ).filter(
            ServiceRequest.user_id == user_id
        ).order_by(
            ServiceRequest.created_at.desc()
        ).offset(skip).limit(limit).all()

        logger.info(f"Found {len(requests)} service requests for user {user_id}")
        return requests

    except SQLAlchemyError as e:
        logger.error(f"Failed to fetch service requests for user {user_id}: {e}")
        raise RuntimeError("Database error occurred")


def get_service_requests_by_lawyer_id(
    db: Session,
    lawyer_id: int,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE
) -> List[ServiceRequest]:
    """
    Get service requests for a lawyer with optional filters.

    Args:
        db: Database session
        lawyer_id: ID of the lawyer
        status: Optional status filter (PENDING, ACCEPTED, etc.)
        skip: Pagination offset (default 0)
        limit: Max results (default 50, max 100)

    Returns:
        List of ServiceRequest objects with relationships loaded

    Raises:
        ValueError: If status invalid or pagination params invalid
        RuntimeError: Database error
    """
    # Validate pagination
    if skip < 0:
        logger.warning(f"Invalid skip value: {skip}, using 0")
        skip = 0
        
    if limit < 1:
        logger.warning(f"Invalid limit value: {limit}, using default {DEFAULT_PAGE_SIZE}")
        limit = DEFAULT_PAGE_SIZE
    elif limit > MAX_PAGE_SIZE:
        logger.warning(f"Limit {limit} exceeds max {MAX_PAGE_SIZE}, using max")
        limit = MAX_PAGE_SIZE

    try:
        logger.info(f"Fetching service requests for lawyer {lawyer_id}, status={status}")

        query = db.query(ServiceRequest).options(
            *_service_request_eager_load()
        ).filter(
            ServiceRequest.lawyer_id == lawyer_id
        )

        if status:
            # Parse enum
            try:
                enum_status = ServiceRequest.RequestStatus(status)
            except ValueError:
                try:
                    enum_status = ServiceRequest.RequestStatus[status.upper()]
                except KeyError:
                    valid = [s.value for s in ServiceRequest.RequestStatus]
                    logger.warning(f"Invalid status '{status}'. Valid: {', '.join(valid)}")
                    # If invalid status, maybe return empty list or ignore? 
                    # Raising error might be better for API consumers
                    raise ValueError(f"Invalid status '{status}'. Valid: {', '.join(valid)}")

            query = query.filter(ServiceRequest.status == enum_status)

        requests = query.order_by(
            ServiceRequest.created_at.desc()
        ).offset(skip).limit(limit).all()

        logger.info(f"Found {len(requests)} service requests for lawyer {lawyer_id}")
        return requests

    except SQLAlchemyError as e:
        logger.error(f"Failed to fetch service requests for lawyer {lawyer_id}: {e}")
        raise RuntimeError("Database error occurred")


def update_service_request(
    db: Session,
    request_id: int,
    update_data: ServiceRequestUpdate
) -> Optional[ServiceRequest]:
    """
    Update a service request.

    Only allows updating fields defined in ServiceRequestUpdate schema:
    - status (RequestStatus enum)
    - lawyer_response (optional text)
    - rejected_reason (optional text)

    Protected fields (user_id, lawyer_id, created_at) cannot be modified.

    Args:
        db: Database session
        request_id: ID of the service request
        update_data: Validated update data (Pydantic schema)

    Returns:
        Updated ServiceRequest or None if not found

    Raises:
        ValueError: If update_data contains invalid values
        RuntimeError: Database error
    """
    try:
        logger.info(f"Updating service request {request_id}")

        db_request = get_service_request_by_id(db, request_id)
        if not db_request:
            logger.warning(f"Service request {request_id} not found for update")
            return None

        # Only update fields present in schema (exclude_unset=True)
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
        raise RuntimeError("Database error occurred")


def cancel_service_request(
    db: Session,
    request_id: int,
    user_id: int
) -> Optional[ServiceRequest]:
    """
    Cancel a service request (user only).

    Only PENDING requests can be cancelled.

    Args:
        db: Database session
        request_id: ID of the service request
        user_id: ID of the requesting user (ownership verification)

    Returns:
        Updated ServiceRequest with CANCELLED status, or None if not found

    Raises:
        ValueError: If request is not PENDING
        RuntimeError: Database error
    """
    try:
        logger.info(f"User {user_id} attempting to cancel service request {request_id}")

        db_request = db.query(ServiceRequest).filter(
            ServiceRequest.id == request_id,
            ServiceRequest.user_id == user_id
        ).first()

        if not db_request:
            logger.warning(f"Service request {request_id} not found for user {user_id}")
            return None

        if db_request.status != ServiceRequest.RequestStatus.PENDING:
            raise ValueError(
                f"Cannot cancel request in {db_request.status.value} status. "
                f"Only PENDING requests can be cancelled."
            )

        db_request.status = ServiceRequest.RequestStatus.CANCELLED
        db.commit()
        db.refresh(db_request)

        logger.info(f"Cancelled service request {request_id}")
        return db_request

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Failed to cancel service request {request_id}: {e}")
        raise RuntimeError("Database error occurred")


def delete_service_request(db: Session, request_id: int) -> Optional[ServiceRequest]:
    """
    Delete a service request (admin only).

    Args:
        db: Database session
        request_id: ID of the service request to delete

    Returns:
        Deleted ServiceRequest object, or None if not found

    Raises:
        RuntimeError: Database error
    """
    try:
        logger.info(f"Deleting service request {request_id}")

        db_request = db.query(ServiceRequest).filter(
            ServiceRequest.id == request_id
        ).first()

        if not db_request:
            logger.warning(f"Service request {request_id} not found for deletion")
            return None

        deleted_request = db_request
        
        db.delete(db_request)
        db.commit()
        
        logger.info(f"Deleted service request {request_id}")
        return deleted_request

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Failed to delete service request {request_id}: {e}")
        raise RuntimeError("Database error occurred")