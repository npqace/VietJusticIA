from pymongo import MongoClient, ASCENDING, DESCENDING
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from bson import ObjectId
import os
import logging

logger = logging.getLogger(__name__)

# MongoDB Connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongodb:27017/")
MONGO_DB_NAME = "vietjusticia"
MONGO_COLLECTION_NAME = "service_request_conversations"

client = MongoClient(MONGO_URL)
db = client[MONGO_DB_NAME]
collection = db[MONGO_COLLECTION_NAME]


def _ensure_indexes():
    """
    Creates indexes for efficient querying.
    Called once when the module loads.
    """
    try:
        # Unique index on service_request_id (one conversation per request)
        collection.create_index("service_request_id", unique=True)
        
        # Composite indexes for listing conversations
        collection.create_index([("user_id", ASCENDING), ("updated_at", DESCENDING)])
        collection.create_index([("lawyer_id", ASCENDING), ("updated_at", DESCENDING)])
        
        logger.info("Conversation repository indexes created successfully")
    except Exception as e:
        logger.warning(f"Index creation failed (may already exist): {e}")


# Create indexes when module is imported
_ensure_indexes()


def create_conversation(
    service_request_id: int,
    user_id: int,
    lawyer_id: int
) -> Optional[Dict[str, Any]]:
    """
    Creates a new conversation for a service request.
    This should be called when a lawyer accepts a service request.

    Args:
        service_request_id: PostgreSQL service_requests.id
        user_id: PostgreSQL users.id (client)
        lawyer_id: PostgreSQL lawyers.id (legal professional)

    Returns:
        Created conversation document with _id converted to string
    """
    now = datetime.now(timezone.utc)

    conversation = {
        "service_request_id": service_request_id,
        "user_id": user_id,
        "lawyer_id": lawyer_id,
        "messages": [],
        "created_at": now,
        "updated_at": now,
        "is_active": True
    }

    try:
        result = collection.insert_one(conversation)
        conversation["_id"] = str(result.inserted_id)
        conversation["conversation_id"] = str(result.inserted_id)
        
        logger.info(
            f"Conversation created: id={conversation['_id']}, "
            f"service_request_id={service_request_id}"
        )
        
        return conversation
    except Exception as e:
        logger.error(f"Failed to create conversation: {e}")
        return None


def get_conversation_by_service_request_id(
    service_request_id: int,
    user_id: Optional[int] = None,
    lawyer_id: Optional[int] = None
) -> Optional[Dict[str, Any]]:
    """
    Retrieves a conversation by service request ID.
    Includes authorization check - must provide either user_id or lawyer_id.

    Args:
        service_request_id: PostgreSQL service_requests.id
        user_id: Optional user ID for authorization check
        lawyer_id: Optional lawyer ID for authorization check

    Returns:
        Conversation document with all messages, or None if not found/unauthorized
    """
    try:
        # Build query with authorization check
        query = {"service_request_id": service_request_id}
        
        if user_id is not None:
            query["user_id"] = user_id
        elif lawyer_id is not None:
            query["lawyer_id"] = lawyer_id
        else:
            logger.warning("No authorization parameter provided to get_conversation")
            return None

        conversation = collection.find_one(query)

        if conversation:
            conversation["_id"] = str(conversation["_id"])
            conversation["conversation_id"] = str(conversation["_id"])
            return conversation

        return None
    except Exception as e:
        logger.error(f"Failed to get conversation: {e}")
        return None


def get_conversation_by_id(
    conversation_id: str,
    user_id: Optional[int] = None,
    lawyer_id: Optional[int] = None
) -> Optional[Dict[str, Any]]:
    """
    Retrieves a conversation by its MongoDB ID.
    Includes authorization check - must provide either user_id or lawyer_id.

    Args:
        conversation_id: MongoDB ObjectId as string
        user_id: Optional user ID for authorization check
        lawyer_id: Optional lawyer ID for authorization check

    Returns:
        Conversation document with all messages, or None if not found/unauthorized
    """
    try:
        # Build query with authorization check
        query = {"_id": ObjectId(conversation_id)}
        
        if user_id is not None:
            query["user_id"] = user_id
        elif lawyer_id is not None:
            query["lawyer_id"] = lawyer_id
        else:
            logger.warning("No authorization parameter provided to get_conversation_by_id")
            return None

        conversation = collection.find_one(query)

        if conversation:
            conversation["_id"] = str(conversation["_id"])
            conversation["conversation_id"] = str(conversation["_id"])
            return conversation

        return None
    except Exception as e:
        logger.error(f"Failed to get conversation by id: {e}")
        return None


def add_message(
    conversation_id: str,
    sender_id: int,
    sender_type: str,
    text: str
) -> Optional[Dict[str, Any]]:
    """
    Adds a message to a conversation.

    Args:
        conversation_id: MongoDB ObjectId as string
        sender_id: ID of sender (user_id or lawyer_id)
        sender_type: Either 'user' or 'lawyer'
        text: Message content

    Returns:
        The created message object, or None if failed
    """
    now = datetime.now(timezone.utc)

    message = {
        "message_id": str(ObjectId()),
        "sender_id": sender_id,
        "sender_type": sender_type,
        "text": text,
        "timestamp": now,
        "read_by_user": sender_type == "user",  # Auto-read if sender is user
        "read_by_lawyer": sender_type == "lawyer"  # Auto-read if sender is lawyer
    }

    try:
        result = collection.update_one(
            {"_id": ObjectId(conversation_id)},
            {
                "$push": {"messages": message},
                "$set": {"updated_at": now}
            }
        )

        if result.modified_count > 0:
            logger.info(
                f"Message added to conversation {conversation_id} "
                f"by {sender_type} {sender_id}"
            )
            # Convert timestamp to ISO format string for JSON serialization
            message["timestamp"] = message["timestamp"].isoformat()
            return message
        
        return None
    except Exception as e:
        logger.error(f"Failed to add message: {e}")
        return None


def mark_messages_as_read(
    conversation_id: str,
    reader_type: str
) -> bool:
    """
    Marks all messages in a conversation as read by the specified party.

    Args:
        conversation_id: MongoDB ObjectId as string
        reader_type: Either 'user' or 'lawyer'

    Returns:
        True if successful, False otherwise
    """
    if reader_type not in ["user", "lawyer"]:
        logger.error(f"Invalid reader_type: {reader_type}")
        return False

    read_field = f"messages.$[].read_by_{reader_type}"

    try:
        result = collection.update_one(
            {"_id": ObjectId(conversation_id)},
            {"$set": {read_field: True}}
        )

        logger.info(
            f"Messages marked as read in conversation {conversation_id} "
            f"by {reader_type}"
        )

        return result.modified_count > 0
    except Exception as e:
        logger.error(f"Failed to mark messages as read: {e}")
        return False


def get_unread_count(
    conversation_id: str,
    reader_type: str
) -> int:
    """
    Gets the count of unread messages for a specific party.

    Args:
        conversation_id: MongoDB ObjectId as string
        reader_type: Either 'user' or 'lawyer'

    Returns:
        Number of unread messages
    """
    if reader_type not in ["user", "lawyer"]:
        return 0

    read_field = f"read_by_{reader_type}"

    try:
        conversation = collection.find_one(
            {"_id": ObjectId(conversation_id)},
            {"messages": 1}
        )

        if not conversation:
            return 0

        unread_count = sum(
            1 for msg in conversation.get("messages", [])
            if not msg.get(read_field, False)
        )

        return unread_count
    except Exception as e:
        logger.error(f"Failed to get unread count: {e}")
        return 0


def get_user_conversations(
    user_id: int,
    skip: int = 0,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """
    Retrieves all conversations for a user, sorted by most recent first.

    Args:
        user_id: PostgreSQL user ID
        skip: Number of records to skip (for pagination)
        limit: Maximum number of records to return

    Returns:
        List of conversation documents with metadata
    """
    try:
        conversations = collection.find(
            {"user_id": user_id, "is_active": True},
            {
                "service_request_id": 1,
                "user_id": 1,
                "lawyer_id": 1,
                "created_at": 1,
                "updated_at": 1,
                "messages": {"$slice": -1}  # Get only last message for preview
            }
        ).sort("updated_at", -1).skip(skip).limit(limit)

        conversations_list = []
        for conv in conversations:
            conv["_id"] = str(conv["_id"])
            conv["conversation_id"] = str(conv["_id"])
            
            # Get unread count
            conv["unread_count"] = get_unread_count(conv["_id"], "user")
            
            # Get total message count
            full_conv = collection.find_one(
                {"_id": ObjectId(conv["_id"])},
                {"messages": 1}
            )
            conv["message_count"] = len(full_conv.get("messages", [])) if full_conv else 0
            
            conversations_list.append(conv)

        return conversations_list
    except Exception as e:
        logger.error(f"Failed to get user conversations: {e}")
        return []


def get_lawyer_conversations(
    lawyer_id: int,
    skip: int = 0,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """
    Retrieves all conversations for a lawyer, sorted by most recent first.

    Args:
        lawyer_id: PostgreSQL lawyer ID
        skip: Number of records to skip (for pagination)
        limit: Maximum number of records to return

    Returns:
        List of conversation documents with metadata
    """
    try:
        conversations = collection.find(
            {"lawyer_id": lawyer_id, "is_active": True},
            {
                "service_request_id": 1,
                "user_id": 1,
                "lawyer_id": 1,
                "created_at": 1,
                "updated_at": 1,
                "messages": {"$slice": -1}  # Get only last message for preview
            }
        ).sort("updated_at", -1).skip(skip).limit(limit)

        conversations_list = []
        for conv in conversations:
            conv["_id"] = str(conv["_id"])
            conv["conversation_id"] = str(conv["_id"])
            
            # Get unread count
            conv["unread_count"] = get_unread_count(conv["_id"], "lawyer")
            
            # Get total message count
            full_conv = collection.find_one(
                {"_id": ObjectId(conv["_id"])},
                {"messages": 1}
            )
            conv["message_count"] = len(full_conv.get("messages", [])) if full_conv else 0
            
            conversations_list.append(conv)

        return conversations_list
    except Exception as e:
        logger.error(f"Failed to get lawyer conversations: {e}")
        return []


def deactivate_conversation(conversation_id: str) -> bool:
    """
    Marks a conversation as inactive (soft delete).
    Used when a service request is cancelled or completed.

    Args:
        conversation_id: MongoDB ObjectId as string

    Returns:
        True if successful, False otherwise
    """
    try:
        result = collection.update_one(
            {"_id": ObjectId(conversation_id)},
            {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
        )

        logger.info(f"Conversation {conversation_id} deactivated")
        return result.modified_count > 0
    except Exception as e:
        logger.error(f"Failed to deactivate conversation: {e}")
        return False


