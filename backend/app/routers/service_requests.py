from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database.database import get_db
from ..database.models import User, Lawyer
from ..schemas.service_request import ServiceRequestUpdate, ServiceRequestOut
from ..repository import service_request_repository
from ..services.auth import get_current_active_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/service-requests",
    tags=["Service Requests"],
    responses={404: {"description": "Not found"}},
)

@router.patch("/{request_id}", response_model=ServiceRequestOut)
def update_service_request_status(
    request_id: int,
    update_data: ServiceRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update the status or lawyer response of a service request.
    Only accessible by the assigned lawyer.
    """
    # Verify user is a lawyer
    if current_user.role != User.Role.LAWYER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only lawyers can update service requests"
        )

    # Get the lawyer's profile
    lawyer = db.query(Lawyer).filter(Lawyer.user_id == current_user.id).first()
    if not lawyer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lawyer profile not found"
        )

    # Get the service request
    request = service_request_repository.get_service_request_by_id(db, request_id)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request not found"
        )

    # Verify the request is assigned to this lawyer
    if request.lawyer_id != lawyer.id:
        logger.warning(
            f"Unauthorized update attempt: User {current_user.id} (Lawyer {lawyer.id}) "
            f"tried to update request {request_id} assigned to Lawyer {request.lawyer_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update requests assigned to you"
        )

    # Update the request
    updated_request = service_request_repository.update_service_request(
        db, request_id, update_data.dict(exclude_unset=True)
    )

    if not updated_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request could not be updated"
        )

    logger.info(
        f"Service request {request_id} updated by Lawyer {lawyer.id}: "
        f"status={update_data.status if update_data.status else 'unchanged'}"
    )

    return updated_request
