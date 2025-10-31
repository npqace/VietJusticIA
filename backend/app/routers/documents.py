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
    page_size: int = Query(20, ge=1, le=100, description="Number of documents per page")
):
    """
    Fetches a paginated list of legal documents from MongoDB, with optional search.
    """
    query = {}
    if search:
        query["title"] = {"$regex": search, "$options": "i"}

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