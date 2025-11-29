from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database.database import get_db
from ..database.models import User, Lawyer, ServiceRequest
from ..schemas.conversation import (
    ConversationRead,
    ConversationListItem,
    SendMessageRequest,
    ConversationWithDetails,
    ConversationCreate
)
from ..repository import conversation_repository, service_request_repository
from ..services.auth import get_current_active_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/conversations",
    tags=["Conversations"],
    responses={404: {"description": "Not found"}},
)


@router.post("/", response_model=ConversationRead, status_code=status.HTTP_201_CREATED)
def create_conversation(
    conversation_data: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new conversation for a service request.
    This should typically be called when a lawyer accepts a service request.
    
    Only the assigned lawyer can create a conversation.
    """
    # Get the service request
    service_request = service_request_repository.get_service_request_by_id(
        db, conversation_data.service_request_id
    )
    
    if not service_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request not found"
        )
    
    # Verify user is the assigned lawyer
    if current_user.role != User.Role.LAWYER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only lawyers can create conversations"
        )
    
    lawyer = db.query(Lawyer).filter(Lawyer.user_id == current_user.id).first()
    if not lawyer or lawyer.id != service_request.lawyer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create conversations for requests assigned to you"
        )
    
    # Check if conversation already exists
    existing_conv = conversation_repository.get_conversation_by_service_request_id(
        service_request_id=conversation_data.service_request_id,
        lawyer_id=lawyer.id
    )
    
    if existing_conv:
        logger.info(
            f"Conversation already exists for service request {conversation_data.service_request_id}"
        )
        return existing_conv
    
    # Create new conversation
    conversation = conversation_repository.create_conversation(
        service_request_id=conversation_data.service_request_id,
        user_id=service_request.user_id,
        lawyer_id=lawyer.id
    )
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create conversation"
        )
    
    logger.info(
        f"Conversation created for service request {conversation_data.service_request_id} "
        f"by lawyer {lawyer.id}"
    )
    
    return conversation


@router.get("/service-request/{service_request_id}", response_model=ConversationWithDetails)
def get_conversation_by_service_request(
    service_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get the conversation for a specific service request.
    
    - Users can only access conversations for their own requests
    - Lawyers can only access conversations for requests assigned to them
    """
    # Get the service request first
    service_request = service_request_repository.get_service_request_by_id(db, service_request_id)
    
    if not service_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request not found"
        )
    
    # Authorization check
    user_id = None
    lawyer_id = None
    
    if current_user.role == User.Role.USER:
        # Regular user - check if they own the request
        if service_request.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access your own conversations"
            )
        user_id = current_user.id
        
    elif current_user.role == User.Role.LAWYER:
        # Lawyer - check if request is assigned to them
        lawyer = db.query(Lawyer).filter(Lawyer.user_id == current_user.id).first()
        if not lawyer or lawyer.id != service_request.lawyer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access conversations for requests assigned to you"
            )
        lawyer_id = lawyer.id
        
    else:
        # Admin can access all
        pass
    
    # Get conversation
    conversation = conversation_repository.get_conversation_by_service_request_id(
        service_request_id=service_request_id,
        user_id=user_id,
        lawyer_id=lawyer_id
    )
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found for this service request"
        )
    
    # Enrich with service request details
    conversation["service_request_title"] = service_request.title
    conversation["service_request_status"] = service_request.status.value
    conversation["user_full_name"] = service_request.user.full_name
    conversation["lawyer_full_name"] = service_request.lawyer.user.full_name if service_request.lawyer and service_request.lawyer.user else None
    
    logger.info(
        f"Conversation retrieved for service request {service_request_id} "
        f"by user {current_user.email}"
    )
    
    return conversation


@router.get("/{conversation_id}", response_model=ConversationWithDetails)
def get_conversation_by_id(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a conversation by its ID.
    
    - Users can only access their own conversations
    - Lawyers can only access conversations for requests assigned to them
    """
    # Authorization check
    user_id = None
    lawyer_id = None
    
    if current_user.role == User.Role.USER:
        user_id = current_user.id
    elif current_user.role == User.Role.LAWYER:
        lawyer = db.query(Lawyer).filter(Lawyer.user_id == current_user.id).first()
        if not lawyer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lawyer profile not found"
            )
        lawyer_id = lawyer.id
    
    # Get conversation
    conversation = conversation_repository.get_conversation_by_id(
        conversation_id=conversation_id,
        user_id=user_id,
        lawyer_id=lawyer_id
    )
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or you don't have permission to access it"
        )
    
    # Enrich with service request details
    service_request = service_request_repository.get_service_request_by_id(
        db, conversation["service_request_id"]
    )
    
    if service_request:
        conversation["service_request_title"] = service_request.title
        conversation["service_request_status"] = service_request.status.value
        conversation["user_full_name"] = service_request.user.full_name
        conversation["lawyer_full_name"] = service_request.lawyer.user.full_name if service_request.lawyer and service_request.lawyer.user else None
    
    return conversation


@router.post("/{conversation_id}/messages", status_code=status.HTTP_201_CREATED)
def send_message(
    conversation_id: str,
    message_data: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Send a message in a conversation.
    
    - Users can send messages in their own conversations
    - Lawyers can send messages in conversations for requests assigned to them
    """
    # Determine sender type and ID
    sender_type = None
    sender_id = None
    
    if current_user.role == User.Role.USER:
        sender_type = "user"
        sender_id = current_user.id
        # Verify user has access to this conversation
        conversation = conversation_repository.get_conversation_by_id(
            conversation_id=conversation_id,
            user_id=current_user.id
        )
        
    elif current_user.role == User.Role.LAWYER:
        lawyer = db.query(Lawyer).filter(Lawyer.user_id == current_user.id).first()
        if not lawyer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lawyer profile not found"
            )
        sender_type = "lawyer"
        sender_id = lawyer.id
        # Verify lawyer has access to this conversation
        conversation = conversation_repository.get_conversation_by_id(
            conversation_id=conversation_id,
            lawyer_id=lawyer.id
        )
        
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users and lawyers can send messages"
        )
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or you don't have permission to access it"
        )
    
    # Add message
    message = conversation_repository.add_message(
        conversation_id=conversation_id,
        sender_id=sender_id,
        sender_type=sender_type,
        text=message_data.text
    )
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message"
        )
    
    logger.info(
        f"Message sent in conversation {conversation_id} "
        f"by {sender_type} {sender_id}"
    )
    
    return message


@router.patch("/{conversation_id}/read", status_code=status.HTTP_200_OK)
def mark_conversation_as_read(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Mark all messages in a conversation as read.
    
    - Users mark messages as read when they open the conversation
    - Lawyers mark messages as read when they open the conversation
    """
    # Determine reader type
    reader_type = None
    
    if current_user.role == User.Role.USER:
        reader_type = "user"
        # Verify user has access
        conversation = conversation_repository.get_conversation_by_id(
            conversation_id=conversation_id,
            user_id=current_user.id
        )
        
    elif current_user.role == User.Role.LAWYER:
        lawyer = db.query(Lawyer).filter(Lawyer.user_id == current_user.id).first()
        if not lawyer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lawyer profile not found"
            )
        reader_type = "lawyer"
        # Verify lawyer has access
        conversation = conversation_repository.get_conversation_by_id(
            conversation_id=conversation_id,
            lawyer_id=lawyer.id
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid user type"
        )
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or you don't have permission to access it"
        )
    
    # Mark as read
    success = conversation_repository.mark_messages_as_read(
        conversation_id=conversation_id,
        reader_type=reader_type
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark messages as read"
        )
    
    logger.info(
        f"Messages marked as read in conversation {conversation_id} "
        f"by {reader_type}"
    )
    
    return {"status": "success", "message": "Messages marked as read"}


@router.get("/my/list", response_model=List[ConversationListItem])
def get_my_conversations(
    skip: int = Query(0, ge=0, description="Number of conversations to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of conversations to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all conversations for the current user (either as user or lawyer).

    - Regular users get their conversations with lawyers
    - Lawyers get conversations with their clients
    """
    if current_user.role == User.Role.USER:
        conversations = conversation_repository.get_user_conversations(
            user_id=current_user.id,
            skip=skip,
            limit=limit
        )

    elif current_user.role == User.Role.LAWYER:
        lawyer = db.query(Lawyer).filter(Lawyer.user_id == current_user.id).first()
        if not lawyer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lawyer profile not found"
            )
        conversations = conversation_repository.get_lawyer_conversations(
            lawyer_id=lawyer.id,
            skip=skip,
            limit=limit
        )

    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users and lawyers can access conversations"
        )

    # Enrich conversations with PostgreSQL data (service request title and user names)
    from ..repository import service_request_repository
    for conv in conversations:
        try:
            service_request = service_request_repository.get_service_request_by_id(
                db, conv["service_request_id"]
            )
            if service_request:
                conv["service_request_title"] = service_request.title
                conv["service_request_status"] = service_request.status.value
                conv["user_full_name"] = service_request.user.full_name if service_request.user else None
                if service_request.lawyer and service_request.lawyer.user:
                    conv["lawyer_full_name"] = service_request.lawyer.user.full_name
                else:
                    conv["lawyer_full_name"] = None
        except Exception as e:
            logger.error(f"Failed to enrich conversation {conv.get('_id')}: {e}")
            # Continue even if enrichment fails
            conv["service_request_title"] = f"Request #{conv['service_request_id']}"
            conv["user_full_name"] = f"User #{conv['user_id']}"
            conv["lawyer_full_name"] = None

    logger.info(
        f"Retrieved {len(conversations)} conversations for user {current_user.email}"
    )

    return conversations


