from pymongo import MongoClient, ASCENDING, DESCENDING
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime, timezone
from bson import ObjectId
import os
import logging

# Configure logging
logger = logging.getLogger(__name__)

# MongoDB Connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongodb:27017/")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "vietjusticia")
MONGO_COLLECTION_NAME = "chat_sessions"

client = MongoClient(MONGO_URL)
db = client[MONGO_DB_NAME]
collection = db[MONGO_COLLECTION_NAME]

# Constants
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 100
MAX_MESSAGE_LENGTH = 10000  # 10KB max message
MAX_TITLE_LENGTH = 200  # 200 chars max title
VALID_SENDERS = {"user", "bot"}


def _ensure_indexes():
    """Creates indexes for efficient querying."""
    try:
        # Index for user_id queries (most common) - Filter by active sessions
        collection.create_index([("user_id", ASCENDING), ("updated_at", DESCENDING)])
        
        # Index for user_id + _id queries (get specific session)
        collection.create_index([("user_id", ASCENDING), ("_id", ASCENDING)])
        
        logger.info("Chat repository indexes created successfully")
    except Exception as e:
        logger.warning(f"Index creation failed (may already exist): {e}")

# Create indexes on module import
_ensure_indexes()


def _convert_object_id(session: dict) -> dict:
    """Converts ObjectId to string for JSON serialization."""
    if "_id" in session:
        session["_id"] = str(session["_id"])
        # Add session_id alias for mobile compatibility
        session["session_id"] = session["_id"]
    return session


def generate_title_from_message(message: str, max_length: int = 50) -> str:
    """
    Generates a chat title from the first message.
    Takes first 50 characters and adds ellipsis if truncated.
    """
    if not message:
        return "Cuộc trò chuyện mới"
        
    if len(message) <= max_length:
        return message
    return message[:max_length].rsplit(' ', 1)[0] + '...'


def create_chat_session(
    user_id: int, 
    user_email: str, 
    title: Optional[str] = None, 
    first_message: Optional[str] = None
) -> Optional[dict]:
    """
    Creates a new chat session in MongoDB.

    Args:
        user_id: PostgreSQL user ID
        user_email: User's email
        title: Optional custom title (auto-generated if not provided)
        first_message: First message text (used to generate title if not provided)

    Returns:
        Created session document with _id converted to string, or None on failure
    """
    try:
        logger.info(f"Creating chat session for user {user_id}")

        now = datetime.now(timezone.utc)

        # Auto-generate title if not provided
        if not title and first_message:
            title = generate_title_from_message(first_message)
        elif not title:
            title = "Cuộc trò chuyện mới"

        session = {
            "user_id": user_id,
            "user_email": user_email,
            "title": title,
            "created_at": now,
            "updated_at": now,
            "messages": [],
            "is_active": True  # Soft delete flag
        }

        result = collection.insert_one(session)
        
        return _convert_object_id(session)

    except Exception as e:
        logger.error(f"Failed to create chat session for user {user_id}: {e}", exc_info=True)
        return None


def add_message_to_session(
    session_id: str,
    message_text: str,
    sender: Literal["user", "bot"],
    sources: Optional[List[Dict[str, Any]]] = None
) -> bool:
    """
    Adds a message to an existing chat session.

    Args:
        session_id: MongoDB ObjectId as string
        message_text: The message content
        sender: 'user' or 'bot'
        sources: Optional list of RAG sources (for bot messages)

    Returns:
        True if successful, False otherwise
    """
    try:
        # Validate sender
        if sender not in VALID_SENDERS:
            logger.warning(f"Invalid sender: {sender}, must be 'user' or 'bot'")
            return False

        # Validate message not empty
        if not message_text or not message_text.strip():
            logger.warning("Message text is empty")
            return False

        # Validate message length
        if len(message_text) > MAX_MESSAGE_LENGTH:
            logger.warning(f"Message too long: {len(message_text)} chars (max {MAX_MESSAGE_LENGTH})")
            return False

        logger.info(f"Adding message to session {session_id}, sender={sender}")

        now = datetime.now(timezone.utc)

        message = {
            "message_id": str(ObjectId()),  # Generate unique message ID
            "text": message_text.strip(),
            "sender": sender,
            "timestamp": now
        }

        if sources:
            message["sources"] = sources

        result = collection.update_one(
            {"_id": ObjectId(session_id), "is_active": True},
            {
                "$push": {"messages": message},
                "$set": {"updated_at": now}
            }
        )

        success = result.modified_count > 0
        if success:
            logger.info(f"Message added to session {session_id}")
        else:
            logger.warning(f"Session {session_id} not found, inactive, or not modified")

        return success

    except Exception as e:
        logger.error(f"Failed to add message to session {session_id}: {e}", exc_info=True)
        return False


def get_user_chat_sessions(
    user_id: int, 
    skip: int = 0, 
    limit: int = DEFAULT_PAGE_SIZE
) -> List[dict]:
    """
    Retrieves all chat sessions for a user, sorted by most recent first.
    Returns session metadata without full message content.

    Uses aggregation pipeline to calculate message count in single query.

    Args:
        user_id: PostgreSQL user ID
        skip: Number of records to skip (for pagination)
        limit: Maximum number of records to return

    Returns:
        List of session documents with message count
    """
    try:
        # Validate page size
        if limit > MAX_PAGE_SIZE:
            logger.warning(f"Page size {limit} exceeds max {MAX_PAGE_SIZE}, using max")
            limit = MAX_PAGE_SIZE

        logger.info(f"Fetching chat sessions for user {user_id}")

        pipeline = [
            # Filter by user and active status
            {
                "$match": {"user_id": user_id, "is_active": True}
            },
            # Sort by most recent
            {
                "$sort": {"updated_at": -1}
            },
            # Pagination
            {
                "$skip": skip
            },
            {
                "$limit": limit
            },
            # Calculate message count and get last message
            {
                "$project": {
                    "user_id": 1,
                    "user_email": 1,
                    "title": 1,
                    "created_at": 1,
                    "updated_at": 1,
                    "message_count": {"$size": "$messages"},
                    "last_message": {"$arrayElemAt": ["$messages", -1]}
                }
            }
        ]

        sessions = list(collection.aggregate(pipeline))

        # Convert ObjectId to string
        for session in sessions:
            _convert_object_id(session)

        logger.info(f"Found {len(sessions)} chat sessions for user {user_id}")
        return sessions

    except Exception as e:
        logger.error(f"Failed to get user chat sessions: {e}", exc_info=True)
        return []


def get_chat_session_by_id(session_id: str, user_id: int) -> Optional[dict]:
    """
    Retrieves a specific chat session with all messages.
    Verifies the session belongs to the requesting user.

    Args:
        session_id: MongoDB ObjectId as string
        user_id: PostgreSQL user ID (for authorization check)

    Returns:
        Session document with all messages, or None if not found/unauthorized
    """
    try:
        session = collection.find_one({
            "_id": ObjectId(session_id),
            "user_id": user_id,
            "is_active": True  # Only get active sessions
        })

        if session:
            return _convert_object_id(session)

        logger.warning(f"Session {session_id} not found or access denied for user {user_id}")
        return None
    except Exception as e:
        logger.error(f"Failed to get chat session {session_id}: {e}", exc_info=True)
        return None


def update_chat_session_title(session_id: str, user_id: int, new_title: str) -> bool:
    """
    Updates the title of a chat session.

    Args:
        session_id: MongoDB ObjectId as string
        user_id: PostgreSQL user ID (for authorization check)
        new_title: New title for the session

    Returns:
        True if successful, False otherwise
    """
    try:
        # Validate title not empty
        if not new_title or not new_title.strip():
            logger.warning("Title is empty")
            return False

        # Validate title length
        if len(new_title) > MAX_TITLE_LENGTH:
            logger.warning(f"Title too long: {len(new_title)} chars (max {MAX_TITLE_LENGTH})")
            return False

        logger.info(f"Updating title for session {session_id}")

        result = collection.update_one(
            {
                "_id": ObjectId(session_id),
                "user_id": user_id,
                "is_active": True
            },
            {
                "$set": {
                    "title": new_title.strip(),
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )

        return result.modified_count > 0

    except Exception as e:
        logger.error(f"Failed to update session title {session_id}: {e}", exc_info=True)
        return False


def delete_chat_session(session_id: str, user_id: int) -> bool:
    """
    Soft deletes a chat session (sets is_active=False).

    Args:
        session_id: MongoDB ObjectId as string
        user_id: PostgreSQL user ID (for authorization check)

    Returns:
        True if successful, False otherwise
    """
    try:
        logger.info(f"Soft deleting chat session {session_id} for user {user_id}")

        result = collection.update_one(
            {"_id": ObjectId(session_id), "user_id": user_id},
            {
                "$set": {
                    "is_active": False, 
                    "deleted_at": datetime.now(timezone.utc)
                }
            }
        )

        success = result.modified_count > 0
        if success:
            logger.info(f"Chat session {session_id} soft deleted")
        else:
            logger.warning(f"Session {session_id} not found or user {user_id} not authorized")

        return success

    except Exception as e:
        logger.error(f"Failed to delete chat session {session_id}: {e}", exc_info=True)
        return False


def delete_all_user_chat_sessions(user_id: int) -> int:
    """
    Deletes all chat sessions for a user.
    Used when user deletes their account.
    This performs a hard delete to comply with data deletion requests.

    Args:
        user_id: PostgreSQL user ID

    Returns:
        Number of sessions deleted
    """
    try:
        logger.warning(f"Deleting ALL chat sessions for user {user_id}")

        # Get count before deletion for logging
        count = collection.count_documents({"user_id": user_id})

        if count == 0:
            logger.info(f"No chat sessions to delete for user {user_id}")
            return 0

        result = collection.delete_many({"user_id": user_id})
        deleted = result.deleted_count

        logger.warning(f"Deleted {deleted} chat sessions for user {user_id}")
        return deleted

    except Exception as e:
        logger.error(f"Failed to delete all sessions for user {user_id}: {e}", exc_info=True)
        return 0