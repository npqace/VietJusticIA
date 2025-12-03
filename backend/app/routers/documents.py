from fastapi import APIRouter, Query, HTTPException, Depends, status
from pymongo.database import Database
from pymongo.errors import PyMongoError
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
import logging

from ..database.database import get_mongo_db
from ..repository import document_repository

router = APIRouter()
logger = logging.getLogger(__name__)

# Constants
ALL_FILTER_VALUE = "Tất cả"  # Vietnamese for "All" - bypasses filter

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

    model_config = ConfigDict(populate_by_name=True)

# --- Endpoints ---

@router.get("/documents", response_model=DocumentListResponse, response_model_by_alias=False)
async def get_documents(
    search: str = Query(None, description="Search term for document titles"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of documents per page"),
    doc_status: Optional[str] = Query(None, alias="status", description="Filter by document status"),
    document_type: Optional[str] = Query(None, description="Filter by document type"),
    category: Optional[str] = Query(None, description="Filter by legal field/category"),
    issuer: Optional[str] = Query(None, description="Filter by issuer"),
    start_date: Optional[str] = Query(None, description="Filter by start date (dd/mm/yyyy)"),
    end_date: Optional[str] = Query(None, description="Filter by end date (dd/mm/yyyy)"),
    mongo_db: Database = Depends(get_mongo_db)
):
    """
    Fetches a paginated list of legal documents from MongoDB, with optional search and filters.
    """
    try:
        logger.info(
            f"Fetching documents: search={search}, page={page}, page_size={page_size}, "
            f"status={doc_status}, type={document_type}"
        )
        
        documents_list, total_docs, total_pages = document_repository.find_documents(
            mongo_db=mongo_db,
            search=search,
            page=page,
            page_size=page_size,
            status=doc_status,
            document_type=document_type,
            category=category,
            issuer=issuer,
            start_date=start_date,
            end_date=end_date,
            all_filter_value=ALL_FILTER_VALUE
        )
        
        logger.info(
            f"Retrieved {len(documents_list)} documents "
            f"(page {page}/{total_pages}, total={total_docs})"
        )
        
        return {
            "total_pages": total_pages,
            "current_page": page,
            "page_size": page_size,
            "total_docs": total_docs,
            "documents": documents_list
        }
        
    except PyMongoError as e:
        logger.error(f"Database error fetching documents: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve documents from database"
        )
    except Exception as e:
        logger.error(f"Unexpected error fetching documents: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )

@router.get("/documents/filters/options")
async def get_filter_options(mongo_db: Database = Depends(get_mongo_db)):
    """
    Returns available filter options from the database for dropdowns.
    """
    try:
        logger.info("Fetching filter options")
        
        options = document_repository.get_filter_options(mongo_db)
        
        logger.info(
            f"Retrieved filter options: {len(options['statuses'])} statuses, "
            f"{len(options['document_types'])} types, {len(options['categories'])} categories, "
            f"{len(options['issuers'])} issuers"
        )
        
        return options
        
    except PyMongoError as e:
        logger.error(f"Database error fetching filter options: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve filter options"
        )
    except Exception as e:
        logger.error(f"Unexpected error fetching filter options: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )

@router.get("/documents/{document_id}", response_model=DocumentDetailResponse, response_model_by_alias=False)
async def get_document_by_id(
    document_id: str,
    mongo_db: Database = Depends(get_mongo_db)
):
    """
    Fetches a single legal document by its ID.
    """
    try:
        logger.info(f"Fetching document by ID: {document_id}")
        
        document = document_repository.get_document_by_id(mongo_db, document_id)
        
        if document:
            logger.info(f"Document {document_id} retrieved successfully")
            return document
            
        logger.warning(f"Document {document_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found"
        )
        
    except HTTPException:
        raise
    except PyMongoError as e:
        logger.error(f"Database error fetching document {document_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve document"
        )
    except Exception as e:
        logger.error(f"Unexpected error fetching document {document_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )