import logging
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Literal
from datetime import datetime, timezone
from ..database.models import ConsultationRequest
from ..schemas.consultation import ConsultationRequestCreate, ConsultationRequestUpdate

logger = logging.getLogger(__name__)

# Constants
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 100
VALID_STATUSES = {"pending", "in_progress", "resolved", "closed"}
VALID_PRIORITIES = {"low", "medium", "high", "urgent"}

def create_consultation_request(
    db: Session,
    request_data: ConsultationRequestCreate,
    user_id: Optional[int] = None
) -> Optional[ConsultationRequest]:
    """
    Create a new consultation request.
    Can be created by authenticated users or guests.

    Args:
        db: Database session
        request_data: Consultation request data
        user_id: Optional user ID (None for guest requests)

    Returns:
        Created consultation request or None on failure
    """
    try:
        logger.info(f"Creating consultation request for user_id={user_id}")

        db_request = ConsultationRequest(
            user_id=user_id,
            **request_data.model_dump()
        )
        db.add(db_request)
        db.commit()
        db.refresh(db_request)

        logger.info(f"Consultation request created: id={db_request.id}, status={db_request.status}")
        return db_request

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create consultation request: {e}", exc_info=True)
        return None


def get_consultation_request_by_id(db: Session, request_id: int) -> Optional[ConsultationRequest]:
    """
    Get consultation request by ID.
    
    Args:
        db: Database session
        request_id: Consultation request ID
        
    Returns:
        Consultation request or None if not found
    """
    try:
        return db.query(ConsultationRequest).filter(ConsultationRequest.id == request_id).first()
    except Exception as e:
        logger.error(f"Failed to get consultation request {request_id}: {e}", exc_info=True)
        return None


def get_consultation_requests(
    db: Session,
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    status: Optional[Literal["pending", "in_progress", "resolved", "closed"]] = None,
    priority: Optional[Literal["low", "medium", "high", "urgent"]] = None,
    user_id: Optional[int] = None
) -> List[ConsultationRequest]:
    """
    Get list of consultation requests with optional filters.
    Used primarily by admin.

    Args:
        db: Database session
        skip: Number of records to skip (for pagination)
        limit: Maximum number of records to return (max 100)
        status: Optional status filter
        priority: Optional priority filter
        user_id: Optional user ID filter

    Returns:
        List of consultation requests
    """
    try:
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

        logger.info(f"Fetching consultation requests: skip={skip}, limit={limit}, status={status}")

        query = db.query(ConsultationRequest)

        # Filter by status with validation
        if status:
            if status not in VALID_STATUSES:
                logger.warning(f"Invalid status filter: {status}, ignoring")
            else:
                query = query.filter(ConsultationRequest.status == status)

        # Filter by priority with validation
        if priority:
            if priority not in VALID_PRIORITIES:
                logger.warning(f"Invalid priority filter: {priority}, ignoring")
            else:
                query = query.filter(ConsultationRequest.priority == priority)

        # Filter by user
        if user_id:
            query = query.filter(ConsultationRequest.user_id == user_id)

        # Order by created date (newest first)
        query = query.order_by(ConsultationRequest.created_at.desc())

        results = query.offset(skip).limit(limit).all()
        logger.info(f"Found {len(results)} consultation requests")
        return results

    except Exception as e:
        logger.error(f"Failed to get consultation requests: {e}", exc_info=True)
        return []


def update_consultation_request(
    db: Session,
    request_id: int,
    update_data: ConsultationRequestUpdate
) -> Optional[ConsultationRequest]:
    """
    Update consultation request.
    Used by admin to change status, priority, assign lawyer, add notes.

    Args:
        db: Database session
        request_id: Consultation request ID
        update_data: Update data

    Returns:
        Updated consultation request or None on failure
    """
    try:
        logger.info(f"Updating consultation request {request_id}")

        db_request = db.query(ConsultationRequest).filter(ConsultationRequest.id == request_id).first()
        if not db_request:
            logger.warning(f"Consultation request {request_id} not found")
            return None

        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(db_request, key, value)

        db.commit()
        db.refresh(db_request)
        
        logger.info(f"Consultation request {request_id} updated: {list(update_dict.keys())}")
        return db_request

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update consultation request {request_id}: {e}", exc_info=True)
        return None


def get_consultation_requests_count(
    db: Session,
    status: Optional[str] = None
) -> int:
    """
    Get count of consultation requests, optionally filtered by status.
    
    Args:
        db: Database session
        status: Optional status filter
        
    Returns:
        Count of requests
    """
    try:
        query = db.query(ConsultationRequest)

        if status:
            if status in VALID_STATUSES:
                query = query.filter(ConsultationRequest.status == status)
            else:
                logger.warning(f"Invalid status filter for count: {status}, ignoring")

        return query.count()
    except Exception as e:
        logger.error(f"Failed to get consultation requests count: {e}", exc_info=True)
        return 0


def delete_consultation_request(db: Session, request_id: int) -> bool:
    """
    Delete a consultation request.
    Admin only.
    Returns True if deleted, False if not found.
    
    Args:
        db: Database session
        request_id: Consultation request ID
        
    Returns:
        True if deleted, False otherwise
    """
    try:
        logger.warning(f"Deleting consultation request {request_id}")
        
        db_request = db.query(ConsultationRequest).filter(ConsultationRequest.id == request_id).first()
        if not db_request:
            logger.warning(f"Consultation request {request_id} not found")
            return False

        db.delete(db_request)
        db.commit()
        
        logger.warning(f"Consultation request {request_id} deleted")
        return True
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete consultation request {request_id}: {e}", exc_info=True)
        return False