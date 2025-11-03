from sqlalchemy.orm import Session
from typing import List, Optional
from ..database.models import ConsultationRequest
from ..schemas.consultation import ConsultationRequestCreate, ConsultationRequestUpdate


def create_consultation_request(
    db: Session,
    request_data: ConsultationRequestCreate,
    user_id: Optional[int] = None
) -> ConsultationRequest:
    """
    Create a new consultation request.
    Can be created by authenticated users or guests.
    """
    db_request = ConsultationRequest(
        user_id=user_id,
        **request_data.dict()
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request


def get_consultation_request_by_id(db: Session, request_id: int) -> Optional[ConsultationRequest]:
    """Get consultation request by ID."""
    return db.query(ConsultationRequest).filter(ConsultationRequest.id == request_id).first()


def get_consultation_requests(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    user_id: Optional[int] = None
) -> List[ConsultationRequest]:
    """
    Get list of consultation requests with optional filters.
    Used primarily by admin.
    """
    query = db.query(ConsultationRequest)

    # Filter by status
    if status:
        query = query.filter(ConsultationRequest.status == status)

    # Filter by priority
    if priority:
        query = query.filter(ConsultationRequest.priority == priority)

    # Filter by user
    if user_id:
        query = query.filter(ConsultationRequest.user_id == user_id)

    # Order by created date (newest first)
    query = query.order_by(ConsultationRequest.created_at.desc())

    return query.offset(skip).limit(limit).all()


def update_consultation_request(
    db: Session,
    request_id: int,
    update_data: ConsultationRequestUpdate
) -> Optional[ConsultationRequest]:
    """
    Update consultation request.
    Used by admin to change status, priority, assign lawyer, add notes.
    """
    db_request = db.query(ConsultationRequest).filter(ConsultationRequest.id == request_id).first()
    if not db_request:
        return None

    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(db_request, key, value)

    db.commit()
    db.refresh(db_request)
    return db_request


def get_consultation_requests_count(
    db: Session,
    status: Optional[str] = None
) -> int:
    """Get count of consultation requests, optionally filtered by status."""
    query = db.query(ConsultationRequest)

    if status:
        query = query.filter(ConsultationRequest.status == status)

    return query.count()
