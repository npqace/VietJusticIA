import logging
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from ..database.models import HelpRequest
from ..schemas.help_request import HelpRequestCreate, HelpRequestUpdate

logger = logging.getLogger(__name__)

# Constants
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 100

def create_help_request(
    db: Session,
    request_data: HelpRequestCreate,
    user_id: Optional[int] = None
) -> Optional[HelpRequest]:
    """
    Create a new help request.

    Args:
        db: Database session
        request_data: Help request data
        user_id: Optional user ID (None for guest requests)

    Returns:
        Created help request or None on failure
    """
    try:
        logger.info(f"Creating help request: subject='{request_data.subject}', user_id={user_id}")

        help_request = HelpRequest(
            user_id=user_id,
            **request_data.model_dump()
        )

        db.add(help_request)
        db.commit()
        db.refresh(help_request)

        logger.info(f"Help request created: id={help_request.id}, email={help_request.email}")
        return help_request

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create help request: {e}", exc_info=True)
        return None


def get_help_requests(
    db: Session,
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    user_id: Optional[int] = None,
    status: Optional[str] = None
) -> List[HelpRequest]:
    """
    Get list of help requests with optional filters.

    Args:
        db: Database session
        skip: Number of records to skip (for pagination)
        limit: Maximum number of records to return (max 100)
        user_id: Optional user ID filter
        status: Optional status filter

    Returns:
        List of help requests
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

        logger.info(f"Fetching help requests: skip={skip}, limit={limit}, user_id={user_id}, status={status}")

        query = db.query(HelpRequest)

        if user_id is not None:
            query = query.filter(HelpRequest.user_id == user_id)

        if status:
            try:
                status_enum = HelpRequest.HelpStatus(status)
                query = query.filter(HelpRequest.status == status_enum)
            except ValueError:
                logger.warning(f"Invalid status filter: {status}, ignoring")

        results = query.order_by(HelpRequest.created_at.desc()).offset(skip).limit(limit).all()
        logger.info(f"Found {len(results)} help requests")
        return results

    except Exception as e:
        logger.error(f"Failed to get help requests: {e}", exc_info=True)
        return []


def get_help_request_by_id(db: Session, request_id: int) -> Optional[HelpRequest]:
    """
    Get help request by ID.
    
    Args:
        db: Database session
        request_id: Help request ID
        
    Returns:
        Help request or None if not found/error
    """
    try:
        return db.query(HelpRequest).filter(HelpRequest.id == request_id).first()
    except Exception as e:
        logger.error(f"Failed to get help request {request_id}: {e}", exc_info=True)
        return None


def update_help_request(
    db: Session,
    request_id: int,
    update_data: HelpRequestUpdate,
    admin_id: Optional[int] = None
) -> Optional[HelpRequest]:
    """
    Update help request (admin only).

    Args:
        db: Database session
        request_id: Help request ID
        update_data: Update data
        admin_id: Optional admin ID performing the update

    Returns:
        Updated help request or None on failure
    """
    try:
        logger.info(f"Updating help request {request_id} by admin {admin_id}")

        help_request = get_help_request_by_id(db, request_id)
        if not help_request:
            logger.warning(f"Help request {request_id} not found")
            return None

        # Handle status separately (needs enum validation)
        if update_data.status:
            try:
                status_enum = HelpRequest.HelpStatus(update_data.status)
                help_request.status = status_enum
                logger.info(f"Status updated to {status_enum}")
            except ValueError:
                logger.warning(f"Invalid status: {update_data.status}, skipping")

        # Update other fields automatically
        update_dict = update_data.model_dump(
            exclude_unset=True,
            exclude={'status'}  # Already handled above
        )
        for key, value in update_dict.items():
            setattr(help_request, key, value)

        # Track which admin handled this
        if admin_id is not None:
            help_request.admin_id = admin_id

        db.commit()
        db.refresh(help_request)

        logger.info(f"Help request {request_id} updated successfully")
        return help_request

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update help request {request_id}: {e}", exc_info=True)
        return None


def delete_help_request(db: Session, request_id: int) -> bool:
    """
    Delete a help request.
    Admin only.

    Args:
        db: Database session
        request_id: Help request ID

    Returns:
        True if deleted, False if not found or on failure
    """
    try:
        logger.warning(f"Deleting help request {request_id}")

        help_request = db.query(HelpRequest).filter(
            HelpRequest.id == request_id
        ).first()

        if not help_request:
            logger.warning(f"Help request {request_id} not found")
            return False

        db.delete(help_request)
        db.commit()

        logger.warning(f"Help request {request_id} deleted")
        return True

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete help request {request_id}: {e}", exc_info=True)
        return False