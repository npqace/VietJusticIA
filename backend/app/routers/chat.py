from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List
from ..schemas.chat import (
    ChatSessionCreate,
    ChatSessionRead,
    ChatSessionListItem,
    ChatSessionUpdate,
    AddMessageRequest
)
from ..repository import chat_repository
from ..database.models import User
from ..services.auth import get_current_user
from ..services.ai_service import rag_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/chat", tags=["Chat"])


@router.post("/sessions", response_model=ChatSessionRead, status_code=status.HTTP_201_CREATED)
async def create_chat_session(
    session_data: ChatSessionCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Creates a new chat session.
    The first message is automatically sent and a bot response is generated.

    Args:
        session_data: Contains optional title and the first message
        current_user: Authenticated user

    Returns:
        Created chat session with the first user message and bot response
    """
    try:
        logger.info(f"Creating new chat session for user {current_user.email}")

        # Create the session
        session = chat_repository.create_chat_session(
            user_id=current_user.id,
            user_email=current_user.email,
            title=session_data.title,
            first_message=session_data.first_message
        )

        # Add the first user message
        chat_repository.add_message_to_session(
            session_id=session["_id"],
            message_text=session_data.first_message,
            sender="user"
        )

        # Generate RAG response
        logger.info(f"Generating RAG response for first message in session {session['_id']}")
        rag_result = await rag_service.invoke_chain(session_data.first_message)

        # Add bot response
        chat_repository.add_message_to_session(
            session_id=session["_id"],
            message_text=rag_result["response"],
            sender="bot",
            sources=rag_result.get("sources", [])
        )

        # Fetch the complete session with messages
        complete_session = chat_repository.get_chat_session_by_id(
            session_id=session["_id"],
            user_id=current_user.id
        )

        logger.info(f"Chat session {session['_id']} created successfully")

        # Ensure session_id is in the response for mobile compatibility
        if complete_session and "_id" in complete_session and "session_id" not in complete_session:
            complete_session["session_id"] = complete_session["_id"]

        return complete_session

    except Exception as e:
        logger.error(f"Failed to create chat session: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create chat session: {str(e)}"
        )


@router.get("/sessions", response_model=List[ChatSessionListItem])
async def get_user_chat_sessions(
    skip: int = Query(0, ge=0, description="Number of sessions to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of sessions to return"),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves all chat sessions for the authenticated user.
    Sessions are sorted by most recent first.

    Args:
        skip: Pagination offset
        limit: Maximum number of sessions to return
        current_user: Authenticated user

    Returns:
        List of chat session summaries (without full message content)
    """
    try:
        logger.info(f"Fetching chat sessions for user {current_user.email}")

        sessions = chat_repository.get_user_chat_sessions(
            user_id=current_user.id,
            skip=skip,
            limit=limit
        )

        logger.info(f"Retrieved {len(sessions)} chat sessions for user {current_user.email}")
        return sessions

    except Exception as e:
        logger.error(f"Failed to fetch chat sessions: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve chat sessions"
        )


@router.get("/sessions/{session_id}", response_model=ChatSessionRead)
async def get_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves a specific chat session with all messages.
    User must own the session.

    Args:
        session_id: MongoDB session ID
        current_user: Authenticated user

    Returns:
        Complete chat session with all messages
    """
    try:
        logger.info(f"Fetching chat session {session_id} for user {current_user.email}")

        session = chat_repository.get_chat_session_by_id(
            session_id=session_id,
            user_id=current_user.id
        )

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found or you don't have permission to access it"
            )

        return session

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch chat session {session_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve chat session"
        )


@router.post("/sessions/{session_id}/messages")
async def add_message_to_session(
    session_id: str,
    message_data: AddMessageRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Adds a new message to an existing chat session.
    Generates a bot response using RAG.

    Args:
        session_id: MongoDB session ID
        message_data: Contains the user's message
        current_user: Authenticated user

    Returns:
        Bot response with sources
    """
    try:
        if not message_data.message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message cannot be empty"
            )

        logger.info(f"Adding message to session {session_id} for user {current_user.email}")

        # Verify session exists and belongs to user
        session = chat_repository.get_chat_session_by_id(
            session_id=session_id,
            user_id=current_user.id
        )

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found or you don't have permission to access it"
            )

        # Add user message
        chat_repository.add_message_to_session(
            session_id=session_id,
            message_text=message_data.message,
            sender="user"
        )

        # Generate RAG response
        logger.info(f"Generating RAG response for message in session {session_id}")
        rag_result = await rag_service.invoke_chain(message_data.message)

        # Add bot response
        chat_repository.add_message_to_session(
            session_id=session_id,
            message_text=rag_result["response"],
            sender="bot",
            sources=rag_result.get("sources", [])
        )

        logger.info(f"Message added successfully to session {session_id}")
        return rag_result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add message to session {session_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add message to session: {str(e)}"
        )


@router.patch("/sessions/{session_id}", response_model=ChatSessionRead)
async def update_chat_session(
    session_id: str,
    update_data: ChatSessionUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Updates a chat session (currently only supports title rename).

    Args:
        session_id: MongoDB session ID
        update_data: Contains the new title
        current_user: Authenticated user

    Returns:
        Updated chat session
    """
    try:
        logger.info(f"Updating chat session {session_id} for user {current_user.email}")

        success = chat_repository.update_chat_session_title(
            session_id=session_id,
            user_id=current_user.id,
            new_title=update_data.title
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found or you don't have permission to update it"
            )

        # Fetch and return updated session
        updated_session = chat_repository.get_chat_session_by_id(
            session_id=session_id,
            user_id=current_user.id
        )

        logger.info(f"Chat session {session_id} updated successfully")
        return updated_session

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update chat session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update chat session"
        )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Deletes a chat session.

    Args:
        session_id: MongoDB session ID
        current_user: Authenticated user

    Returns:
        No content on success
    """
    try:
        logger.info(f"Deleting chat session {session_id} for user {current_user.email}")

        success = chat_repository.delete_chat_session(
            session_id=session_id,
            user_id=current_user.id
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found or you don't have permission to delete it"
            )

        logger.info(f"Chat session {session_id} deleted successfully")
        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete chat session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete chat session"
        )
