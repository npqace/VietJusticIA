from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from ..database.models import ServiceRequest

def get_service_requests_by_user_id(db: Session, user_id: int) -> List[ServiceRequest]:
    """
    Get all service requests made by a specific user.
    """
    return db.query(ServiceRequest).filter(ServiceRequest.user_id == user_id).order_by(ServiceRequest.created_at.desc()).all()

def get_service_request_by_id(db: Session, request_id: int) -> Optional[ServiceRequest]:
    """
    Get a single service request by its ID.
    """
    return db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()

def update_service_request(db: Session, request_id: int, update_data: Dict[str, Any]) -> Optional[ServiceRequest]:
    """
    Update a service request.
    """
    db_request = get_service_request_by_id(db, request_id)
    if db_request:
        for key, value in update_data.items():
            setattr(db_request, key, value)
        db.commit()
        db.refresh(db_request)
    return db_request


def delete_service_request(db: Session, request_id: int) -> bool:
    """
    Delete a service request.
    Admin only.
    Returns True if deleted, False if not found.
    """
    db_request = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()
    if not db_request:
        return False

    db.delete(db_request)
    db.commit()
    return True
