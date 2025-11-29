from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database.database import get_db
from ..database.models import User, Lawyer, ServiceRequest
from ..schemas.service_request import ServiceRequestUpdate, ServiceRequestOut, ServiceRequestDetail
from ..repository import service_request_repository, conversation_repository
from ..services.auth import get_current_active_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/service-requests",
    tags=["Service Requests"],
    responses={404: {"description": "Not found"}},
)


@router.get("/{request_id}", response_model=ServiceRequestDetail)
def get_service_request_detail(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get detailed information about a service request.
    
    - Users can only view their own requests
    - Lawyers can only view requests assigned to them
    - Admins can view all requests
    """
    # Get the service request
    request = service_request_repository.get_service_request_by_id(db, request_id)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request not found"
        )
    
    # Authorization check
    if current_user.role == User.Role.USER:
        # Users can only view their own requests
        if request.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own service requests"
            )
    elif current_user.role == User.Role.LAWYER:
        # Lawyers can only view requests assigned to them
        lawyer = db.query(Lawyer).filter(Lawyer.user_id == current_user.id).first()
        if not lawyer or lawyer.id != request.lawyer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view requests assigned to you"
            )
    # Admins can view all - no additional check needed
    
    # Build detailed response with user and lawyer info
    request_dict = {
        "id": request.id,
        "user_id": request.user_id,
        "lawyer_id": request.lawyer_id,
        "title": request.title,
        "description": request.description,
        "status": request.status,
        "lawyer_response": request.lawyer_response,
        "rejected_reason": request.rejected_reason,
        "created_at": request.created_at,
        "updated_at": request.updated_at,
        # User info
        "user_full_name": request.user.full_name if request.user else None,
        "user_email": request.user.email if request.user else None,
        "user_phone": request.user.phone if request.user else None,
        # Lawyer info
        "lawyer_full_name": request.lawyer.user.full_name if request.lawyer and request.lawyer.user else None,
        "lawyer_email": request.lawyer.user.email if request.lawyer and request.lawyer.user else None,
        "lawyer_phone": request.lawyer.user.phone if request.lawyer and request.lawyer.user else None,
        "lawyer_specialization": request.lawyer.specialization if request.lawyer else None,
    }
    
    logger.info(
        f"Service request {request_id} details retrieved by user {current_user.email}"
    )
    
    return request_dict


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

    # Check if status is being changed to ACCEPTED
    # Use .value to extract just the string value from the Pydantic enum
    is_accepting = (
        update_data.status and
        update_data.status.value == "ACCEPTED" and
        request.status != ServiceRequest.RequestStatus.ACCEPTED
    )
    logger.info(f"Checking if accepting: update_data.status={update_data.status}, update_data.status.value={update_data.status.value if update_data.status else None}, request.status={request.status}, is_accepting={is_accepting}")

    # Update the request
    updated_request = service_request_repository.update_service_request(
        db, request_id, update_data.dict(exclude_unset=True)
    )

    if not updated_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request could not be updated"
        )

    # Auto-create conversation if request is being accepted
    if is_accepting:
        logger.info(f"Attempting to auto-create conversation for service request {request_id}")
        logger.info(f"Request user_id: {request.user_id}, Lawyer ID: {lawyer.id}")
        try:
            # Check if conversation already exists
            existing_conversation = conversation_repository.get_conversation_by_service_request_id(
                service_request_id=request_id,
                user_id=request.user_id,
                lawyer_id=lawyer.id
            )

            if existing_conversation:
                logger.info(f"Conversation already exists for service request {request_id}: {existing_conversation.get('_id')}")
            else:
                logger.info(f"No existing conversation found, creating new one for service request {request_id}")
                # Create new conversation
                created_conversation = conversation_repository.create_conversation(
                    service_request_id=request_id,
                    user_id=request.user_id,
                    lawyer_id=lawyer.id
                )
                if created_conversation:
                    logger.info(f"Successfully created conversation {created_conversation.get('_id')} for service request {request_id}")
                else:
                    logger.error(f"create_conversation returned None for service request {request_id}")
        except Exception as e:
            logger.error(f"Failed to auto-create conversation for service request {request_id}: {e}", exc_info=True)
            # Don't fail the request update if conversation creation fails

    logger.info(
        f"Service request {request_id} updated by Lawyer {lawyer.id}: "
        f"status={update_data.status if update_data.status else 'unchanged'}"
    )

    return updated_request


@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a service request.
    Admin only.
    Can only delete requests with status 'PENDING' or 'REJECTED'.
    """
    # Check if user is admin
    if current_user.role != User.Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete service requests"
        )

    logger.info(f"Admin {current_user.email} attempting to delete service request {request_id}")

    # Get the request first to check status
    request = service_request_repository.get_service_request_by_id(db, request_id)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request not found"
        )

    # Only allow deletion of PENDING or REJECTED requests
    from ..database.models import ServiceRequest as ServiceRequestModel
    allowed_statuses = [ServiceRequestModel.RequestStatus.PENDING, ServiceRequestModel.RequestStatus.REJECTED]
    if request.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete request with status '{request.status.value}'. Only 'PENDING' or 'REJECTED' requests can be deleted."
        )

    # Delete the request
    deleted = service_request_repository.delete_service_request(db, request_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request not found"
        )

    logger.info(f"Service request {request_id} deleted successfully by admin {current_user.email}")
    return None
