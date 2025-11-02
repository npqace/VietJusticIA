from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from ..database.models import Lawyer, ServiceRequest, User
from ..schemas.lawyer import LawyerCreate, LawyerUpdate, ServiceRequestCreate, ServiceRequestUpdate


def create_lawyer(db: Session, lawyer_data: LawyerCreate) -> Lawyer:
    """Create a new lawyer profile."""
    db_lawyer = Lawyer(**lawyer_data.dict())
    db.add(db_lawyer)
    db.commit()
    db.refresh(db_lawyer)
    return db_lawyer


def get_lawyer_by_id(db: Session, lawyer_id: int) -> Optional[Lawyer]:
    """Get lawyer by ID with user relationship."""
    return db.query(Lawyer).options(joinedload(Lawyer.user)).filter(Lawyer.id == lawyer_id).first()


def get_lawyer_by_user_id(db: Session, user_id: int) -> Optional[Lawyer]:
    """Get lawyer profile by user ID."""
    return db.query(Lawyer).filter(Lawyer.user_id == user_id).first()


def get_lawyers(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    specialization: Optional[str] = None,
    city: Optional[str] = None,
    province: Optional[str] = None,
    min_rating: Optional[float] = None,
    is_available: Optional[bool] = None
) -> List[Lawyer]:
    """
    Get list of lawyers with filters.
    Only returns approved lawyers.
    """
    query = db.query(Lawyer).options(joinedload(Lawyer.user)).filter(
        Lawyer.verification_status == Lawyer.VerificationStatus.APPROVED
    )

    # Search by name (join with User table)
    if search:
        query = query.join(User).filter(
            User.full_name.ilike(f"%{search}%")
        )

    # Filter by specialization
    if specialization:
        query = query.filter(Lawyer.specialization.ilike(f"%{specialization}%"))

    # Filter by location
    if city:
        query = query.filter(Lawyer.city.ilike(f"%{city}%"))
    if province:
        query = query.filter(Lawyer.province.ilike(f"%{province}%"))

    # Filter by minimum rating
    if min_rating is not None:
        query = query.filter(Lawyer.rating >= min_rating)

    # Filter by availability
    if is_available is not None:
        query = query.filter(Lawyer.is_available == is_available)

    # Order by rating (highest first)
    query = query.order_by(Lawyer.rating.desc())

    return query.offset(skip).limit(limit).all()


def update_lawyer(db: Session, lawyer_id: int, lawyer_data: LawyerUpdate) -> Optional[Lawyer]:
    """Update lawyer profile."""
    db_lawyer = db.query(Lawyer).filter(Lawyer.id == lawyer_id).first()
    if not db_lawyer:
        return None

    update_data = lawyer_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_lawyer, key, value)

    db.commit()
    db.refresh(db_lawyer)
    return db_lawyer


def update_lawyer_rating(db: Session, lawyer_id: int, new_rating: float, total_reviews: int):
    """Update lawyer's rating and review count."""
    db_lawyer = db.query(Lawyer).filter(Lawyer.id == lawyer_id).first()
    if db_lawyer:
        db_lawyer.rating = new_rating
        db_lawyer.total_reviews = total_reviews
        db.commit()
        db.refresh(db_lawyer)
    return db_lawyer


# ServiceRequest operations

def create_service_request(db: Session, user_id: int, request_data: ServiceRequestCreate) -> ServiceRequest:
    """Create a new service request."""
    db_request = ServiceRequest(
        user_id=user_id,
        **request_data.dict()
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request


def get_service_request_by_id(db: Session, request_id: int) -> Optional[ServiceRequest]:
    """Get service request by ID."""
    return db.query(ServiceRequest).options(
        joinedload(ServiceRequest.user),
        joinedload(ServiceRequest.lawyer).joinedload(Lawyer.user)
    ).filter(ServiceRequest.id == request_id).first()


def get_user_service_requests(db: Session, user_id: int, skip: int = 0, limit: int = 50) -> List[ServiceRequest]:
    """Get all service requests made by a user."""
    return db.query(ServiceRequest).options(
        joinedload(ServiceRequest.lawyer).joinedload(Lawyer.user)
    ).filter(
        ServiceRequest.user_id == user_id
    ).order_by(
        ServiceRequest.created_at.desc()
    ).offset(skip).limit(limit).all()


def get_lawyer_service_requests(
    db: Session,
    lawyer_id: int,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
) -> List[ServiceRequest]:
    """Get all service requests for a lawyer, optionally filtered by status."""
    query = db.query(ServiceRequest).options(
        joinedload(ServiceRequest.user)
    ).filter(
        ServiceRequest.lawyer_id == lawyer_id
    )

    if status:
        query = query.filter(ServiceRequest.status == status)

    return query.order_by(ServiceRequest.created_at.desc()).offset(skip).limit(limit).all()


def update_service_request(
    db: Session,
    request_id: int,
    update_data: ServiceRequestUpdate
) -> Optional[ServiceRequest]:
    """Update service request (typically by lawyer)."""
    db_request = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()
    if not db_request:
        return None

    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(db_request, key, value)

    db.commit()
    db.refresh(db_request)
    return db_request


def cancel_service_request(db: Session, request_id: int, user_id: int) -> Optional[ServiceRequest]:
    """Cancel a service request (user only)."""
    db_request = db.query(ServiceRequest).filter(
        ServiceRequest.id == request_id,
        ServiceRequest.user_id == user_id
    ).first()

    if db_request and db_request.status == ServiceRequest.RequestStatus.PENDING:
        db_request.status = ServiceRequest.RequestStatus.CANCELLED
        db.commit()
        db.refresh(db_request)
        return db_request

    return None


def get_filter_options(db: Session) -> dict:
    """Get unique filter options for lawyers."""
    # Get all specializations (non-null, non-empty)
    specialization_rows = db.query(Lawyer.specialization).filter(
        Lawyer.verification_status == Lawyer.VerificationStatus.APPROVED,
        Lawyer.specialization.isnot(None),
        Lawyer.specialization != ''
    ).all()

    # Split comma-separated specializations and collect unique values
    specializations_set = set()
    for row in specialization_rows:
        # Split by comma and strip whitespace
        specs = [s.strip() for s in row[0].split(',')]
        specializations_set.update(specs)

    # Get all cities (non-null, non-empty)
    city_rows = db.query(Lawyer.city).filter(
        Lawyer.verification_status == Lawyer.VerificationStatus.APPROVED,
        Lawyer.city.isnot(None),
        Lawyer.city != ''
    ).all()

    # Split comma-separated cities and collect unique values
    cities_set = set()
    for row in city_rows:
        # Split by comma and strip whitespace
        city_list = [c.strip() for c in row[0].split(',')]
        cities_set.update(city_list)

    return {
        "specializations": sorted(list(specializations_set)),
        "cities": sorted(list(cities_set))
    }
