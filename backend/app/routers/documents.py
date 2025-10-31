from fastapi import APIRouter, Query, HTTPException
from pymongo import MongoClient
from pydantic import BaseModel, Field
from typing import Optional, List
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

# --- Pydantic Models ---

class DocumentInList(BaseModel):
    id: str = Field(..., alias="_id")
    title: str
    document_number: Optional[str] = None
    document_type: Optional[str] = None
    issuer: Optional[str] = None
    issue_date: Optional[str] = None
    status: Optional[str] = None

class DocumentListResponse(BaseModel):
    total_pages: int
    current_page: int
    page_size: int
    total_docs: int
    documents: List[DocumentInList]

class RelatedDocument(BaseModel):
    doc_id: Optional[str] = None
    title: Optional[str] = None
    issue_date: Optional[str] = None
    status: Optional[str] = None

class DocumentDetailResponse(BaseModel):
    id: str = Field(..., alias="_id")
    title: str
    document_number: Optional[str] = None
    document_type: Optional[str] = None
    category: Optional[str] = None
    issuer: Optional[str] = None
    signatory: Optional[str] = None
    gazette_number: Optional[str] = None
    issue_date: Optional[str] = None
    effective_date: Optional[str] = None
    publish_date: Optional[str] = None
    status: Optional[str] = None
    full_text: str
    html_content: Optional[str] = None
    ascii_diagram: Optional[str] = None
    related_documents: List[RelatedDocument] = []

    class Config:
        populate_by_name = True

# --- Endpoints ---

@router.get("/documents", response_model=DocumentListResponse)
async def get_documents(
    search: str = Query(None, description="Search term for document titles"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of documents per page"),
    status: Optional[str] = Query(None, description="Filter by document status"),
    document_type: Optional[str] = Query(None, description="Filter by document type"),
    category: Optional[str] = Query(None, description="Filter by legal field/category"),
    issuer: Optional[str] = Query(None, description="Filter by issuer"),
    start_date: Optional[str] = Query(None, description="Filter by start date (dd/mm/yyyy)"),
    end_date: Optional[str] = Query(None, description="Filter by end date (dd/mm/yyyy)")
):
    """
    Fetches a paginated list of legal documents from MongoDB, with optional search and filters.
    """
    query = {}

    # Search by title
    if search:
        query["title"] = {"$regex": search, "$options": "i"}

    # Filter by status - match partial string (e.g., "Còn hiệu lực" matches "Còn hiệu lực đến: 01/01/2025")
    if status and status != "Tất cả":
        query["status"] = {"$regex": status, "$options": "i"}

    # Filter by document type
    if document_type and document_type != "Tất cả":
        query["document_type"] = {"$regex": document_type, "$options": "i"}

    # Filter by category/field - match if category contains the selected value
    # Handles comma-separated values like "Bộ máy hành chính, Giáo dục"
    if category and category != "Tất cả":
        query["category"] = {"$regex": category, "$options": "i"}

    # Filter by issuer - match if issuer contains the selected value
    # Handles comma-separated values like "Chính phủ..., Chính phủ..."
    if issuer and issuer != "Tất cả":
        query["issuer"] = {"$regex": issuer, "$options": "i"}

    # Filter by date range
    # MongoDB now stores dates in ISO format (yyyy-mm-dd) for efficient querying
    if start_date or end_date:
        date_query = {}
        if start_date:
            # Convert dd/mm/yyyy to yyyy-mm-dd for comparison
            try:
                day, month, year = start_date.split('/')
                iso_start = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                date_query["$gte"] = iso_start
            except:
                pass  # Ignore invalid date format
        if end_date:
            try:
                day, month, year = end_date.split('/')
                iso_end = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                date_query["$lte"] = iso_end
            except:
                pass  # Ignore invalid date format
        if date_query:
            query["issue_date"] = date_query

    try:
        total_docs = collection.count_documents(query)
        if total_docs == 0:
            return {
                "total_pages": 0,
                "current_page": page,
                "page_size": page_size,
                "total_docs": 0,
                "documents": []
            }

        total_pages = math.ceil(total_docs / page_size)
        skip_amount = (page - 1) * page_size

        documents_cursor = collection.find(query).skip(skip_amount).limit(page_size)
        
        documents_list = list(documents_cursor)

        return {
            "total_pages": total_pages,
            "current_page": page,
            "page_size": page_size,
            "total_docs": total_docs,
            "documents": documents_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents/filters/options")
async def get_filter_options():
    """
    Returns available filter options from the database for dropdowns.
    """
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents/{document_id}", response_model=DocumentDetailResponse)
async def get_document_by_id(document_id: str):
    """
    Fetches a single legal document by its ID.
    """
    try:
        document = collection.find_one({"_id": document_id})
        if document:
            return document
        raise HTTPException(status_code=404, detail=f"Document with ID '{document_id}' not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))