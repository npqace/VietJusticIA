import logging
from pymongo import MongoClient, ASCENDING, DESCENDING
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime, timezone
from bson import ObjectId
from bson.errors import InvalidId
import os

# Configure logging
logger = logging.getLogger(__name__)

# MongoDB Connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongodb:27017/")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "vietjusticia")
MONGO_COLLECTION_NAME = "service_request_conversations"

client = MongoClient(MONGO_URL)
db = client[MONGO_DB_NAME]
collection = db[MONGO_COLLECTION_NAME]

# Constants
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 100
MAX_MESSAGE_LENGTH = 10000  # 10KB max message
VALID_SENDERS = {"user", "lawyer"}


def _ensure_indexes():
    """Creates indexes for efficient querying."""
    try:
        # Unique index on service_request_id
        collection.create_index("service_request_id", unique=True)
        
        # Composite indexes for listing conversations
        collection.create_index([("user_id", ASCENDING), ("updated_at", DESCENDING)])
        collection.create_index([("lawyer_id", ASCENDING), ("updated_at", DESCENDING)])
        
        logger.info("Conversation repository indexes created successfully")
    except Exception as e:
        logger.warning(f"Index creation failed (may already exist): {e}")

# Create indexes on module import
_ensure_indexes()


def _convert_object_id(conversation: dict) -> dict:
    """Converts ObjectId to string for JSON serialization."""
    if "_id" in conversation:
        conversation["_id"] = str(conversation["_id"])
        conversation["conversation_id"] = conversation["_id"]
    return conversation


def _validate_object_id(object_id_str: str) -> ObjectId:
    """
    Validates and converts string to ObjectId.

    Args:
        object_id_str: String representation of ObjectId

    Returns:
        Valid ObjectId instance

    Raises:
        ValueError: If ObjectId format invalid
    """
    try:
        return ObjectId(object_id_str)
    except InvalidId:
        raise ValueError(f"Invalid ObjectId format: {object_id_str}")


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
        return _convert_object_id(conversation)
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
            return _convert_object_id(conversation)

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
        obj_id = _validate_object_id(conversation_id)
        
        # Build query with authorization check
        query = {"_id": obj_id}
        
        if user_id is not None:
            query["user_id"] = user_id
        elif lawyer_id is not None:
            query["lawyer_id"] = lawyer_id
        else:
            logger.warning("No authorization parameter provided to get_conversation_by_id")
            return None

        conversation = collection.find_one(query)

        if conversation:
            return _convert_object_id(conversation)

        return None
    except ValueError as e:
        logger.error(f"Invalid conversation ID format: {e}")
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
        
    Raises:
        ValueError: If sender_type invalid or text empty
    """
    try:
        # Validate sender_type
        if sender_type not in VALID_SENDERS:
            logger.error(f"Invalid sender_type: {sender_type}")
            raise ValueError(f"sender_type must be 'user' or 'lawyer', got '{sender_type}'")

        # Validate text
        if not text or not text.strip():
            logger.error("Empty message text provided")
            raise ValueError("Message text cannot be empty")

        # Validate text length
        if len(text) > MAX_MESSAGE_LENGTH:
            logger.error(f"Message text too long: {len(text)} chars")
            raise ValueError(f"Message text too long (max {MAX_MESSAGE_LENGTH} characters)")

        obj_id = _validate_object_id(conversation_id)
        
        now = datetime.now(timezone.utc)

        message = {
            "message_id": str(ObjectId()),
            "sender_id": sender_id,
            "sender_type": sender_type,
            "text": text.strip(),
            "timestamp": now,
            "read_by_user": sender_type == "user",  # Auto-read if sender is user
            "read_by_lawyer": sender_type == "lawyer"  # Auto-read if sender is lawyer
        }

        result = collection.update_one(
            {"_id": obj_id},
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
        
        logger.warning(f"Conversation {conversation_id} not found or no changes made")
        return None
        
    except ValueError as e:
        # Re-raise validation errors
        raise
    except Exception as e:
        logger.error(f"Failed to add message: {e}", exc_info=True)
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
    if reader_type not in VALID_SENDERS:
        logger.error(f"Invalid reader_type: {reader_type}")
        return False

    read_field = f"read_by_{reader_type}"

    try:
        obj_id = _validate_object_id(conversation_id)
        
        # First check if conversation exists
        conversation = collection.find_one({"_id": obj_id})
        if not conversation:
            logger.warning(f"Conversation {conversation_id} not found")
            return False

        messages = conversation.get("messages", [])
        if not messages:
            # No messages to mark as read, but conversation exists
            return True

        # Use simple $[] operator to update all messages
        result = collection.update_one(
            {"_id": obj_id},
            {"$set": {f"messages.$[].{read_field}": True}}
        )

        logger.info(
            f"Messages marked as read in conversation {conversation_id} "
            f"by {reader_type} (modified: {result.modified_count})"
        )

        # Return True if document was found
        return True
    except Exception as e:
        logger.error(f"Failed to mark messages as read: {e}", exc_info=True)
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
    if reader_type not in VALID_SENDERS:
        return 0

    read_field = f"read_by_{reader_type}"

    try:
        obj_id = _validate_object_id(conversation_id)
        
        conversation = collection.find_one(
            {"_id": obj_id},
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


def _get_conversations_for_party(
    party_field: str,
    party_id: int,
    reader_type: str,
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE
) -> List[Dict[str, Any]]:
    """
    Generic function to get conversations for a user or lawyer using aggregation.
    
    Args:
        party_field: Field name ("user_id" or "lawyer_id")
        party_id: ID of the party
        reader_type: "user" or "lawyer"
        skip: Pagination offset
        limit: Max results

    Returns:
        List of conversation documents
    """
    try:
        # Validate pagination
        if skip < 0:
            logger.warning(f"Invalid skip value: {skip}, using 0")
            skip = 0
            
        if limit < 1:
            logger.warning(f"Invalid limit value: {limit}, using default {DEFAULT_PAGE_SIZE}")
            limit = DEFAULT_PAGE_SIZE
        elif limit > MAX_PAGE_SIZE:
            logger.warning(f"Limit {limit} exceeds max {MAX_PAGE_SIZE}, using max")
            limit = MAX_PAGE_SIZE

        logger.info(f"Fetching conversations for {reader_type} {party_id}")

        pipeline = [
            # Filter by party and active status
            {
                "$match": {
                    party_field: party_id,
                    "is_active": True
                }
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
            # Calculate metadata and project fields
            {
                "$project": {
                    "service_request_id": 1,
                    "user_id": 1,
                    "lawyer_id": 1,
                    "created_at": 1,
                    "updated_at": 1,
                    "last_message": {"$arrayElemAt": ["$messages", -1]},
                    "message_count": {"$size": "$messages"},
                    "unread_count": {
                        "$size": {
                            "$filter": {
                                "input": "$messages",
                                "as": "msg",
                                "cond": {"$eq": [f"$$msg.read_by_{reader_type}", False]}
                            }
                        }
                    }
                }
            }
        ]

        conversations = list(collection.aggregate(pipeline))

        # Convert ObjectId to string
        for conv in conversations:
            _convert_object_id(conv)

        logger.info(f"Found {len(conversations)} conversations for {reader_type} {party_id}")
        return conversations

    except Exception as e:
        logger.error(f"Failed to get {reader_type} conversations: {e}", exc_info=True)
        return []


def get_user_conversations(
    user_id: int,
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE
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
    return _get_conversations_for_party("user_id", user_id, "user", skip, limit)


def get_lawyer_conversations(
    lawyer_id: int,
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE
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
    return _get_conversations_for_party("lawyer_id", lawyer_id, "lawyer", skip, limit)


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
        obj_id = _validate_object_id(conversation_id)
        
        result = collection.update_one(
            {"_id": obj_id},
            {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
        )

        if result.modified_count > 0:
            logger.info(f"Conversation {conversation_id} deactivated")
            return True
            
        return False
    except Exception as e:
        logger.error(f"Failed to deactivate conversation: {e}")
        return False