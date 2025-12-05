"""
Repository for Document CMS operations on MongoDB.
Handles CRUD operations for legal_documents collection.
"""
from pymongo import MongoClient, ASCENDING, DESCENDING
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone
from bson import ObjectId
import os
import logging

logger = logging.getLogger(__name__)

# MongoDB Connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongodb:27017/")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "vietjusticia")
LEGAL_DOCUMENTS_COLLECTION = "legal_documents"

_client = None
_db = None
_legal_docs_collection = None

def get_collection():
    """Get or create MongoDB collection (lazy initialization)."""
    global _client, _db, _legal_docs_collection

    if _legal_docs_collection is None:
        _client = MongoClient(MONGO_URL)
        _db = _client[MONGO_DB_NAME]
        _legal_docs_collection = _db[LEGAL_DOCUMENTS_COLLECTION]

    return _legal_docs_collection


def create_document_record(document_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a new document record in MongoDB.

    Args:
        document_data: Document data including metadata, content, etc.

    Returns:
        Created document with _id
    """
    try:
        # Ensure timestamps
        now = datetime.now(timezone.utc)
        document_data.setdefault("created_at", now)
        document_data.setdefault("updated_at", now)

        # Set default status if not provided
        document_data.setdefault("document_status", "processing")

        # Insert document
        collection = get_collection()
        result = collection.insert_one(document_data)
        document_data["_id"] = str(result.inserted_id) if isinstance(result.inserted_id, ObjectId) else result.inserted_id

        logger.info(f"Document created: {document_data['_id']}")
        return document_data

    except Exception as e:
        logger.error(f"Failed to create document: {e}")
        raise


def get_document_by_id(document_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a document by its ID.

    Args:
        document_id: Document ID

    Returns:
        Document data or None if not found
    """
    try:
        collection = get_collection()
        document = collection.find_one({"_id": document_id})
        return document
    except Exception as e:
        logger.error(f"Failed to get document {document_id}: {e}")
        raise


def list_documents(
    page: int = 1,
    limit: int = 20,
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc"
) -> Tuple[List[Dict[str, Any]], int]:
    """
    List documents with filtering and pagination.

    Args:
        page: Page number (1-indexed)
        limit: Items per page
        category: Filter by category
        status: Filter by status
        search: Search in title and document_number
        sort_by: Field to sort by
        sort_order: 'asc' or 'desc'

    Returns:
        Tuple of (documents list, total count)
    """
    try:
        collection = get_collection()
        
        # Build filter query
        filter_query = {}

        if category:
            # Use regex to match category even if it's part of comma-separated list
            # Match "Giáo dục" in both "Giáo dục" and "Giao thông - Vận tải, Giáo dục"
            filter_query["category"] = {"$regex": f"(^|, ){category}($|,)", "$options": "i"}

        if status:
            # Use regex to match status even with additional info (e.g., expiration date)
            # Match "Còn hiệu lực" in both "Còn hiệu lực" and "Còn hiệu lực đến: 31/12/2025"
            filter_query["status"] = {"$regex": f"^{status}", "$options": "i"}

        if search:
            filter_query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"document_number": {"$regex": search, "$options": "i"}}
            ]

        # Get total count
        total = collection.count_documents(filter_query)

        # Calculate pagination
        skip = (page - 1) * limit

        # Determine sort order
        sort_direction = DESCENDING if sort_order == "desc" else ASCENDING

        # Query documents
        documents = list(
            collection
            .find(filter_query)
            .sort(sort_by, sort_direction)
            .skip(skip)
            .limit(limit)
        )

        logger.info(f"Listed {len(documents)} documents (page {page}/{(total + limit - 1) // limit})")
        return documents, total

    except Exception as e:
        logger.error(f"Failed to list documents: {e}")
        raise


def update_document(document_id: str, update_data: Dict[str, Any]) -> bool:
    """
    Update a document.

    Args:
        document_id: Document ID
        update_data: Fields to update

    Returns:
        True if updated successfully
    """
    try:
        collection = get_collection()
        
        # Add updated timestamp
        update_data["updated_at"] = datetime.now(timezone.utc)

        result = collection.update_one(
            {"_id": document_id},
            {"$set": update_data}
        )

        if result.modified_count > 0:
            logger.info(f"Document {document_id} updated successfully")
            return True
        else:
            logger.warning(f"Document {document_id} not found or no changes made")
            return False

    except Exception as e:
        logger.error(f"Failed to update document {document_id}: {e}")
        raise


def delete_document(document_id: str) -> bool:
    """
    Delete a document from MongoDB.

    Args:
        document_id: Document ID

    Returns:
        True if deleted successfully
    """
    try:
        collection = get_collection()
        result = collection.delete_one({"_id": document_id})

        if result.deleted_count > 0:
            logger.info(f"Document {document_id} deleted from MongoDB")
            return True
        else:
            logger.warning(f"Document {document_id} not found in MongoDB")
            return False

    except Exception as e:
        logger.error(f"Failed to delete document {document_id}: {e}")
        raise


def document_exists(document_id: str) -> bool:
    """
    Check if a document exists.

    Args:
        document_id: Document ID

    Returns:
        True if document exists
    """
    try:
        collection = get_collection()
        count = collection.count_documents({"_id": document_id})
        return count > 0
    except Exception as e:
        logger.error(f"Failed to check document existence: {e}")
        raise


def get_documents_by_ids(document_ids: List[str]) -> List[Dict[str, Any]]:
    """
    Get multiple documents by their IDs.

    Args:
        document_ids: List of document IDs

    Returns:
        List of documents
    """
    try:
        collection = get_collection()
        documents = list(collection.find({"_id": {"$in": document_ids}}))
        logger.info(f"Retrieved {len(documents)} documents")
        return documents
    except Exception as e:
        logger.error(f"Failed to get documents by IDs: {e}")
        raise


def get_document_statistics(top_categories_limit: int = 10) -> Dict[str, Any]:
    """
    Get overall document statistics.

    Args:
        top_categories_limit: Number of top categories to return (default: 10)

    Returns:
        Dictionary with statistics
    """
    try:
        collection = get_collection()
        total_docs = collection.count_documents({})

        # Count by status
        completed = collection.count_documents({"document_status": "completed"})
        processing = collection.count_documents({"document_status": "processing"})
        failed = collection.count_documents({"document_status": "failed"})

        # Count by category
        categories = collection.aggregate([
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": top_categories_limit}
        ])

        return {
            "total_documents": total_docs,
            "completed": completed,
            "processing": processing,
            "failed": failed,
            "top_categories": list(categories)
        }
    except Exception as e:
        logger.error(f"Failed to get document statistics: {e}")
        raise


def get_unique_categories() -> List[str]:
    """
    Get list of unique categories from all documents.

    Returns:
        List of unique category names
    """
    try:
        collection = get_collection()
        categories = collection.distinct("category")
        # Filter out None/empty and return sorted list
        unique_categories = sorted([cat for cat in categories if cat])
        logger.info(f"Found {len(unique_categories)} unique categories")
        return unique_categories
    except Exception as e:
        logger.error(f"Failed to get unique categories: {e}")
        raise


def get_total_documents_count() -> int:
    """
    Get total count of documents.

    Returns:
        Total number of documents
    """
    try:
        collection = get_collection()
        return collection.count_documents({})
    except Exception as e:
        logger.error(f"Failed to count documents: {e}")
        return 0


def get_unique_statuses() -> List[str]:
    """
    Get list of unique document statuses from all documents.

    Returns:
        List of unique status values
    """
    try:
        collection = get_collection()
        statuses = collection.distinct("status")
        # Filter out None/empty and return sorted list
        unique_statuses = sorted([status for status in statuses if status])
        logger.info(f"Found {len(unique_statuses)} unique statuses")
        return unique_statuses
    except Exception as e:
        logger.error(f"Failed to get unique statuses: {e}")
        raise
