"""
WebSocket router for real-time conversations.

Handles WebSocket connections for lawyer-user conversations.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, status as http_status
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from typing import Optional
from bson import ObjectId
import logging
import json

from ..database.database import get_db
from ..database.models import User, Lawyer
from ..services.websocket_manager import manager
from ..repository import conversation_repository, service_request_repository, user_repository, lawyer_repository
from ..core.security import SECRET_KEY, ALGORITHM

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/ws",
    tags=["WebSocket"],
)


async def verify_token(token: str) -> Optional[dict]:
    """
    Verify JWT token and extract user info.

    Args:
        token: JWT token string

    Returns:
        Decoded token payload or None if invalid
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_email: str = payload.get("sub")
        if user_email is None:
            return None
        return payload
    except JWTError as e:
        logger.error(f"JWT verification failed: {e}")
        return None


async def get_user_from_db(email: str, db: Session) -> Optional[User]:
    """
    Get user from database by email.

    Args:
        email: User email
        db: Database session

    Returns:
        User object or None
    """
    return user_repository.get_user_by_email(db, email)


async def verify_conversation_access(
    conversation_id: str,
    user: User,
    db: Session
) -> tuple[bool, Optional[int], Optional[str]]:
    """
    Verify user has access to conversation and get their details.

    Args:
        conversation_id: ID of the conversation
        user: User object
        db: Database session

    Returns:
        Tuple of (has_access, user_id, user_type)
    """
    # Determine user type and ID for authorization
    if user.role == User.Role.USER:
        # Get conversation and check if user has access
        conversation = conversation_repository.get_conversation_by_id(
            conversation_id=conversation_id,
            user_id=user.id
        )
        if conversation:
            return True, user.id, "user"
        return False, None, None

    elif user.role == User.Role.LAWYER:
        # Get lawyer profile
        lawyer = lawyer_repository.get_lawyer_by_user_id(db, user.id)
        if not lawyer:
            return False, None, None

        # Get conversation and check if lawyer has access
        conversation = conversation_repository.get_conversation_by_id(
            conversation_id=conversation_id,
            lawyer_id=lawyer.id
        )
        if conversation:
            return True, lawyer.id, "lawyer"
        return False, None, None

    elif user.role == User.Role.ADMIN:
        # Admin has access to all conversations
        # Fetch using repository method (assuming it handles admin access or we pass None for user/lawyer)
        # Since get_conversation_by_id filters by user/lawyer if provided, we can try fetching by ID only
        # But the current implementation of get_conversation_by_id might require at least one ID or handle it.
        # Let's check if we can use get_conversation_by_id without user/lawyer IDs or if we need a specific method.
        # Looking at previous code, it used direct collection access.
        # Ideally, repository should have a method for admin or generic get by ID.
        # If get_conversation_by_id allows optional user/lawyer, we can use it.
        # Let's assume for now we can use it with just conversation_id, or we might need to add a method.
        # Given the instruction "Replace direct collection.find_one with conversation_repository.get_conversation_by_id",
        # I will use that. If it fails because of missing args, I'll need to check the repo.
        # However, the previous code passed user_id/lawyer_id.
        # Let's try passing None for both if the repo supports it, or just conversation_id.
        
        conversation = conversation_repository.get_conversation_by_id(
            conversation_id=conversation_id
        )
        if conversation:
            return True, user.id, "admin"
        return False, None, None

    return False, None, None


@router.websocket("/conversation/{conversation_id}")
async def websocket_conversation(
    websocket: WebSocket,
    conversation_id: str,
    token: str = Query(..., description="JWT authentication token"),
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for real-time conversation.

    Connection URL: ws://localhost:8000/api/v1/ws/conversation/{id}?token={jwt}

    Message Types:
    - Client → Server:
      - send_message: {"type": "send_message", "text": "..."}
      - typing: {"type": "typing", "is_typing": true/false}
      - mark_read: {"type": "mark_read", "message_ids": [...]}

    - Server → Client:
      - new_message: {"type": "new_message", "message": {...}}
      - typing_indicator: {"type": "typing_indicator", ...}
      - read_receipt: {"type": "read_receipt", ...}
      - connection_established: {"type": "connection_established", ...}
      - error: {"type": "error", "error": "..."}
    """

    # Step 1: Verify JWT token
    token_payload = await verify_token(token)
    if not token_payload:
        await websocket.close(code=http_status.WS_1008_POLICY_VIOLATION)
        logger.warning(f"WebSocket connection rejected: Invalid token")
        return

    user_email = token_payload.get("sub")
    current_user = await get_user_from_db(user_email, db)
    if not current_user or not current_user.is_active:
        await websocket.close(code=http_status.WS_1008_POLICY_VIOLATION)
        logger.warning(f"WebSocket connection rejected: User not found or inactive")
        return

    # Step 2: Verify access to conversation
    has_access, user_id, user_type = await verify_conversation_access(
        conversation_id, current_user, db
    )

    if not has_access:
        await websocket.close(code=http_status.WS_1008_POLICY_VIOLATION)
        logger.warning(
            f"WebSocket connection rejected: User {current_user.email} "
            f"does not have access to conversation {conversation_id}"
        )
        return

    # Step 3: Accept connection and register with manager
    await manager.connect(conversation_id, websocket, user_id, user_type)

    try:
        # Main message loop
        while True:
            # Wait for message from client
            data = await websocket.receive_text()

            try:
                message_data = json.loads(data)
                message_type = message_data.get("type")

                # Handle different message types
                if message_type == "send_message":
                    # Send message to conversation
                    text = message_data.get("text", "").strip()
                    if not text:
                        await manager.send_personal_message(
                            websocket,
                            {
                                "type": "error",
                                "error": "Message text cannot be empty"
                            }
                        )
                        continue

                    # Add message to database
                    new_message = conversation_repository.add_message(
                        conversation_id=conversation_id,
                        sender_id=user_id,
                        sender_type=user_type,
                        text=text
                    )

                    if new_message:
                        # Broadcast to all participants in conversation
                        await manager.broadcast_to_conversation(
                            conversation_id,
                            {
                                "type": "new_message",
                                "message": new_message
                            }
                        )
                        logger.info(
                            f"Message sent in conversation {conversation_id} "
                            f"by {user_type} {user_id}"
                        )
                    else:
                        await manager.send_personal_message(
                            websocket,
                            {
                                "type": "error",
                                "error": "Failed to send message"
                            }
                        )

                elif message_type == "typing":
                    # Broadcast typing indicator
                    is_typing = message_data.get("is_typing", False)
                    await manager.broadcast_typing_indicator(
                        conversation_id,
                        user_id,
                        user_type,
                        is_typing
                    )

                elif message_type == "mark_read":
                    # Mark messages as read
                    try:
                        success = conversation_repository.mark_messages_as_read(
                            conversation_id,
                            user_type
                        )

                        if success:
                            # Get all message IDs from conversation
                            conversation = conversation_repository.get_conversation_by_id(
                                conversation_id,
                                user_id=user_id if user_type == "user" else None,
                                lawyer_id=user_id if user_type == "lawyer" else None
                            )
                            
                            if conversation:
                                message_ids = [
                                    msg["message_id"]
                                    for msg in conversation.get("messages", [])
                                ]

                                # Broadcast read receipt
                                await manager.broadcast_read_receipt(
                                    conversation_id,
                                    user_id,
                                    user_type,
                                    message_ids
                                )
                                logger.info(
                                    f"Messages marked as read in conversation {conversation_id} "
                                    f"by {user_type} {user_id}"
                                )
                            else:
                                logger.warning(
                                    f"Could not retrieve conversation {conversation_id} "
                                    f"after marking as read"
                                )
                        else:
                            await manager.send_personal_message(
                                websocket,
                                {
                                    "type": "error",
                                    "error": "Failed to mark messages as read"
                                }
                            )
                    except Exception as e:
                        logger.error(f"Error marking messages as read: {e}", exc_info=True)
                        await manager.send_personal_message(
                            websocket,
                            {
                                "type": "error",
                                "error": "Internal server error"
                            }
                        )

                else:
                    # Unknown message type
                    await manager.send_personal_message(
                        websocket,
                        {
                            "type": "error",
                            "error": f"Unknown message type: {message_type}"
                        }
                    )

            except json.JSONDecodeError:
                await manager.send_personal_message(
                    websocket,
                    {
                        "type": "error",
                        "error": "Invalid JSON format"
                    }
                )
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}")
                await manager.send_personal_message(
                    websocket,
                    {
                        "type": "error",
                        "error": "Internal server error"
                    }
                )

    except WebSocketDisconnect:
        # Client disconnected
        await manager.disconnect(conversation_id, websocket, user_id)
        logger.info(
            f"WebSocket disconnected normally: conversation={conversation_id}, "
            f"user_id={user_id}"
        )
    except Exception as e:
        # Unexpected error
        logger.error(f"WebSocket error: {e}")
        await manager.disconnect(conversation_id, websocket, user_id)
