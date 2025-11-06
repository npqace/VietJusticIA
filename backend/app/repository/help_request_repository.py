from sqlalchemy.orm import Session
from typing import List, Optional
from ..database.models import HelpRequest
from ..schemas.help_request import HelpRequestCreate, HelpRequestUpdate


def create_help_request(
    db: Session,
    request_data: HelpRequestCreate,
    user_id: Optional[int] = None
) -> HelpRequest:
    """Create a new help request."""
    help_request = HelpRequest(
        user_id=user_id,
        full_name=request_data.full_name,
        email=request_data.email,
        subject=request_data.subject,
        content=request_data.content
    )

    db.add(help_request)
    db.commit()
    db.refresh(help_request)

    return help_request


def get_help_requests(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    user_id: Optional[int] = None,
    status: Optional[str] = None
) -> List[HelpRequest]:
    """Get list of help requests with optional filters."""
    query = db.query(HelpRequest)

    if user_id is not None:
        query = query.filter(HelpRequest.user_id == user_id)

    if status:
        try:
            status_enum = HelpRequest.HelpStatus(status)
            query = query.filter(HelpRequest.status == status_enum)
        except ValueError:
            pass  # Invalid status, ignore filter

    return query.order_by(HelpRequest.created_at.desc()).offset(skip).limit(limit).all()


def get_help_request_by_id(db: Session, request_id: int) -> Optional[HelpRequest]:
    """Get help request by ID."""
    return db.query(HelpRequest).filter(HelpRequest.id == request_id).first()


def update_help_request(
    db: Session,
    request_id: int,
    update_data: HelpRequestUpdate,
    admin_id: Optional[int] = None
) -> Optional[HelpRequest]:
    """Update help request (admin only)."""
    help_request = get_help_request_by_id(db, request_id)

    if not help_request:
        return None

    # Update fields
    if update_data.status:
        try:
            status_enum = HelpRequest.HelpStatus(update_data.status)
            help_request.status = status_enum
        except ValueError:
            pass  # Invalid status, skip

    if update_data.admin_notes is not None:
        help_request.admin_notes = update_data.admin_notes

    if admin_id is not None:
        help_request.admin_id = admin_id

    db.commit()
    db.refresh(help_request)

    return help_request
