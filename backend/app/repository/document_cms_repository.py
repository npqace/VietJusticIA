"""
Repository for Document CMS operations on MongoDB.
Handles CRUD operations for legal_documents collection.
"""
from pymongo import MongoClient, ASCENDING, DESCENDING
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from bson import ObjectId
import os
import logging

logger = logging.getLogger(__name__)

# MongoDB Connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongodb:27017/")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "vietjusticia")
LEGAL_DOCUMENTS_COLLECTION = "legal_documents"

client = MongoClient(MONGO_URL)
db = client[MONGO_DB_NAME]
legal_docs_collection = db[LEGAL_DOCUMENTS_COLLECTION]


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
        result = legal_docs_collection.insert_one(document_data)
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
        document = legal_docs_collection.find_one({"_id": document_id})
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
) -> tuple[List[Dict[str, Any]], int]:
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
        total = legal_docs_collection.count_documents(filter_query)

        # Calculate pagination
        skip = (page - 1) * limit

        # Determine sort order
        sort_direction = DESCENDING if sort_order == "desc" else ASCENDING

        # Query documents
        documents = list(
            legal_docs_collection
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
        # Add updated timestamp
        update_data["updated_at"] = datetime.now(timezone.utc)

        result = legal_docs_collection.update_one(
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
        result = legal_docs_collection.delete_one({"_id": document_id})

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
        count = legal_docs_collection.count_documents({"_id": document_id})
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
        documents = list(legal_docs_collection.find({"_id": {"$in": document_ids}}))
        logger.info(f"Retrieved {len(documents)} documents")
        return documents
    except Exception as e:
        logger.error(f"Failed to get documents by IDs: {e}")
        raise


def get_categories() -> List[str]:
    """
    Get list of unique categories.

    Returns:
        List of category names
    """
    try:
        categories = legal_docs_collection.distinct("category")
        return [cat for cat in categories if cat]  # Filter out None/empty
    except Exception as e:
        logger.error(f"Failed to get categories: {e}")
        raise


def get_document_statistics() -> Dict[str, Any]:
    """
    Get overall document statistics.

    Returns:
        Dictionary with statistics
    """
    try:
        total_docs = legal_docs_collection.count_documents({})

        # Count by status
        completed = legal_docs_collection.count_documents({"document_status": "completed"})
        processing = legal_docs_collection.count_documents({"document_status": "processing"})
        failed = legal_docs_collection.count_documents({"document_status": "failed"})

        # Count by category
        categories = legal_docs_collection.aggregate([
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
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
