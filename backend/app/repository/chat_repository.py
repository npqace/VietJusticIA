from pymongo import MongoClient
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
import os

# MongoDB Connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongodb:27017/")
MONGO_DB_NAME = "vietjusticia"
MONGO_COLLECTION_NAME = "chat_sessions"

client = MongoClient(MONGO_URL)
db = client[MONGO_DB_NAME]
collection = db[MONGO_COLLECTION_NAME]


def generate_title_from_message(message: str, max_length: int = 50) -> str:
    """
    Generates a chat title from the first message.
    Takes first 50 characters and adds ellipsis if truncated.
    """
    if len(message) <= max_length:
        return message
    return message[:max_length].rsplit(' ', 1)[0] + '...'


def create_chat_session(user_id: int, user_email: str, title: Optional[str] = None, first_message: Optional[str] = None) -> dict:
    """
    Creates a new chat session in MongoDB.

    Args:
        user_id: PostgreSQL user ID
        user_email: User's email
        title: Optional custom title (auto-generated if not provided)
        first_message: First message text (used to generate title if title not provided)

    Returns:
        Created session document with _id converted to string
    """
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
        "messages": []
    }

    result = collection.insert_one(session)
    session["_id"] = str(result.inserted_id)
    session["session_id"] = str(result.inserted_id)  # Add session_id for mobile compatibility

    return session


def add_message_to_session(session_id: str, message_text: str, sender: str, sources: Optional[List[dict]] = None) -> bool:
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
    now = datetime.now(timezone.utc)

    message = {
        "message_id": str(ObjectId()),  # Generate unique message ID
        "text": message_text,
        "sender": sender,
        "timestamp": now
    }

    if sources:
        message["sources"] = sources

    result = collection.update_one(
        {"_id": ObjectId(session_id)},
        {
            "$push": {"messages": message},
            "$set": {"updated_at": now}
        }
    )

    return result.modified_count > 0


def get_user_chat_sessions(user_id: int, skip: int = 0, limit: int = 50) -> List[dict]:
    """
    Retrieves all chat sessions for a user, sorted by most recent first.
    Returns session metadata without full message content.

    Args:
        user_id: PostgreSQL user ID
        skip: Number of records to skip (for pagination)
        limit: Maximum number of records to return

    Returns:
        List of session documents with message count
    """
    sessions = collection.find(
        {"user_id": user_id},
        {
            "user_id": 1,
            "title": 1,
            "created_at": 1,
            "updated_at": 1,
            "messages": {"$slice": 0}  # Exclude messages from list view
        }
    ).sort("updated_at", -1).skip(skip).limit(limit)

    sessions_list = []
    for session in sessions:
        session["_id"] = str(session["_id"])
        session["session_id"] = str(session["_id"])  # Add session_id for mobile compatibility
        # Count messages separately
        full_session = collection.find_one({"_id": ObjectId(session["_id"])}, {"messages": 1})
        session["message_count"] = len(full_session.get("messages", [])) if full_session else 0
        sessions_list.append(session)

    return sessions_list


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
            "user_id": user_id  # Ensure user owns this session
        })

        if session:
            session["_id"] = str(session["_id"])
            session["session_id"] = str(session["_id"])  # Add session_id for mobile compatibility
            return session

        return None
    except Exception:
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
    result = collection.update_one(
        {
            "_id": ObjectId(session_id),
            "user_id": user_id  # Ensure user owns this session
        },
        {
            "$set": {
                "title": new_title,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    return result.modified_count > 0


def delete_chat_session(session_id: str, user_id: int) -> bool:
    """
    Deletes a chat session.

    Args:
        session_id: MongoDB ObjectId as string
        user_id: PostgreSQL user ID (for authorization check)

    Returns:
        True if successful, False otherwise
    """
    result = collection.delete_one({
        "_id": ObjectId(session_id),
        "user_id": user_id  # Ensure user owns this session
    })

    return result.deleted_count > 0


def delete_all_user_chat_sessions(user_id: int) -> int:
    """
    Deletes all chat sessions for a user.
    Used when user deletes their account.

    Args:
        user_id: PostgreSQL user ID

    Returns:
        Number of sessions deleted
    """
    result = collection.delete_many({"user_id": user_id})
    return result.deleted_count
