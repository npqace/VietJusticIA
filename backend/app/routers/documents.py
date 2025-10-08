from fastapi import APIRouter, Query, HTTPException
from pymongo import MongoClient
import os
import math

router = APIRouter()

# --- MongoDB Connection ---
MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongodb:27017/")
MONGO_DB_NAME = "vietjusticia"
MONGO_COLLECTION_NAME = "legal_documents"

client = MongoClient(MONGO_URL)
db = client[MONGO_DB_NAME]
collection = db[MONGO_COLLECTION_NAME]

@router.get("/documents")
async def get_documents(
    search: str = Query(None, description="Search term for document titles"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of documents per page")
):
    """
    Fetches a paginated list of legal documents from MongoDB, with optional search.
    """
    query = {}
    if search:
        # Using regex for a case-insensitive partial match
        query["title"] = {"$regex": search, "$options": "i"}

    try:
        # Get total number of documents matching the query
        total_docs = collection.count_documents(query)
        if total_docs == 0:
            return {
                "total_pages": 0,
                "current_page": page,
                "page_size": page_size,
                "total_docs": 0,
                "documents": []
            }

        # Calculate pagination
        total_pages = math.ceil(total_docs / page_size)
        skip_amount = (page - 1) * page_size

        # Fetch documents for the current page
        documents_cursor = collection.find(query).skip(skip_amount).limit(page_size)
        
        documents_list = []
        for doc in documents_cursor:
            # Convert ObjectId to string for JSON serialization
            doc["_id"] = str(doc["_id"])
            documents_list.append(doc)

        return {
            "total_pages": total_pages,
            "current_page": page,
            "page_size": page_size,
            "total_docs": total_docs,
            "documents": documents_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
