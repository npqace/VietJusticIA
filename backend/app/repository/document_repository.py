"""
Document Repository

Handles all MongoDB operations for legal documents.
Provides methods for searching, filtering, and retrieving documents.
"""
import logging
from pymongo.database import Database
from pymongo.errors import PyMongoError
from typing import Optional, List, Tuple, Dict, Any
import math

logger = logging.getLogger(__name__)

COLLECTION_NAME = "legal_documents"


def find_documents(
    mongo_db: Database,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    document_type: Optional[str] = None,
    category: Optional[str] = None,
    issuer: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    all_filter_value: str = "Tất cả"
) -> Tuple[List[dict], int, int]:
    """
    Find documents with filters and pagination.
    
    Args:
        mongo_db: MongoDB database instance
        search: Search term for document titles
        page: Page number (1-indexed)
        page_size: Number of documents per page
        status: Filter by document status
        document_type: Filter by document type
        category: Filter by category
        issuer: Filter by issuer
        start_date: Filter by start date (dd/mm/yyyy format)
        end_date: Filter by end date (dd/mm/yyyy format)
        all_filter_value: Value that bypasses filter (default "Tất cả")
        
    Returns:
        Tuple of (documents_list, total_docs, total_pages)
    """
    collection = mongo_db[COLLECTION_NAME]
    query = {}
    
    # Search by title
    if search:
        query["title"] = {"$regex": search, "$options": "i"}
    
    # Filter by status - match partial string
    if status and status != all_filter_value:
        query["status"] = {"$regex": status, "$options": "i"}
    
    # Filter by document type
    if document_type and document_type != all_filter_value:
        query["document_type"] = {"$regex": document_type, "$options": "i"}
    
    # Filter by category - handles comma-separated values
    if category and category != all_filter_value:
        query["category"] = {"$regex": category, "$options": "i"}
    
    # Filter by issuer - handles comma-separated values
    if issuer and issuer != all_filter_value:
        query["issuer"] = {"$regex": issuer, "$options": "i"}
    
    # Filter by date range
    # MongoDB stores dates in ISO format (yyyy-mm-dd)
    if start_date or end_date:
        date_query = {}
        if start_date:
            # Convert dd/mm/yyyy to yyyy-mm-dd for comparison
            try:
                day, month, year = start_date.split('/')
                iso_start = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                date_query["$gte"] = iso_start
            except ValueError as e:
                logger.warning(f"Invalid start_date format '{start_date}': {e}")
                # Invalid format - ignore this filter
        
        if end_date:
            try:
                day, month, year = end_date.split('/')
                iso_end = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                date_query["$lte"] = iso_end
            except ValueError as e:
                logger.warning(f"Invalid end_date format '{end_date}': {e}")
                # Invalid format - ignore this filter
        
        if date_query:
            query["issue_date"] = date_query
    
    try:
        total_docs = collection.count_documents(query)
        if total_docs == 0:
            return [], 0, 0
        
        total_pages = math.ceil(total_docs / page_size)
        skip_amount = (page - 1) * page_size
        
        documents_cursor = collection.find(query).skip(skip_amount).limit(page_size)
        documents_list = list(documents_cursor)
        
        return documents_list, total_docs, total_pages
        
    except PyMongoError as e:
        logger.error(f"MongoDB error finding documents: {e}", exc_info=True)
        raise
    except Exception as e:
        logger.error(f"Unexpected error finding documents: {e}", exc_info=True)
        raise


def get_filter_options(mongo_db: Database) -> Dict[str, List[str]]:
    """
    Get available filter options from the database for dropdowns.
    
    Returns normalized and deduplicated filter values:
    - Statuses: Extracted "Còn hiệu lực" or "Hết hiệu lực" from full status text
    - Categories: Split comma-separated values into individual items
    - Issuers: Split comma-separated values into individual items
    - Document types: As-is from database
    
    Args:
        mongo_db: MongoDB database instance
        
    Returns:
        Dictionary with keys: statuses, document_types, categories, issuers
    """
    collection = mongo_db[COLLECTION_NAME]
    
    try:
        # Get distinct values for each filter field
        statuses_raw = collection.distinct("status")
        document_types = collection.distinct("document_type")
        categories_raw = collection.distinct("category")
        issuers_raw = collection.distinct("issuer")
        
        # Normalize statuses - extract only "Còn hiệu lực" or "Hết hiệu lực"
        statuses_set = set()
        for status in statuses_raw:
            if status:
                if "Còn hiệu lực" in status:
                    statuses_set.add("Còn hiệu lực")
                elif "Hết hiệu lực" in status:
                    statuses_set.add("Hết hiệu lực")
        statuses = sorted(list(statuses_set))
        
        # Split comma-separated categories into individual categories
        categories_set = set()
        for category in categories_raw:
            if category:
                # Split by comma and trim whitespace
                parts = [c.strip() for c in category.split(',')]
                categories_set.update(parts)
        categories = sorted([c for c in categories_set if c])
        
        # Split comma-separated issuers into individual issuers
        issuers_set = set()
        for issuer in issuers_raw:
            if issuer:
                # Split by comma and trim whitespace
                parts = [i.strip() for i in issuer.split(',')]
                issuers_set.update(parts)
        issuers = sorted([i for i in issuers_set if i])
        
        # Filter out None/null values for document types
        document_types = sorted([d for d in document_types if d])
        
        return {
            "statuses": statuses,
            "document_types": document_types,
            "categories": categories,
            "issuers": issuers
        }
        
    except PyMongoError as e:
        logger.error(f"MongoDB error getting filter options: {e}", exc_info=True)
        raise
    except Exception as e:
        logger.error(f"Unexpected error getting filter options: {e}", exc_info=True)
        raise


def get_document_by_id(mongo_db: Database, document_id: str) -> Optional[dict]:
    """
    Fetch a single legal document by its ID.
    
    Args:
        mongo_db: MongoDB database instance
        document_id: Document ID (stored as string in MongoDB)
        
    Returns:
        Document dict if found, None otherwise
    """
    collection = mongo_db[COLLECTION_NAME]
    
    try:
        document = collection.find_one({"_id": document_id})
        return document
        
    except PyMongoError as e:
        logger.error(f"MongoDB error fetching document {document_id}: {e}", exc_info=True)
        raise
    except Exception as e:
        logger.error(f"Unexpected error fetching document {document_id}: {e}", exc_info=True)
        raise
