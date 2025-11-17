"""
Admin router for Document CMS (Upload, List, Delete, View documents).
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
import json
import tempfile
import shutil
from pathlib import Path
from datetime import datetime, timezone

from ..database.database import get_db
from ..database.models import User
from ..services.auth import get_current_user
from ..repository import document_cms_repository
from ..services.document_cms_service import document_processing_service
from ..services.ai_service import rag_service
import time
from ..schemas.document_cms import (
    DocumentListResponse,
    DocumentListItem,
    DocumentDetail,
    UploadResponse,
    DeleteResponse,
    DocumentChunksResponse,
    DocumentStatsResponse,
    DocumentStatus,
    IndexingStatus,
    UploadMetadata,
    FileMetadata,
    FilterOptionsResponse,
    TestQueryRequest,
    TestQueryResponse,
    SourceDocument
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin/documents", tags=["Admin Document CMS"])


def verify_admin(current_user: User = Depends(get_current_user)):
    """Dependency to verify user is admin."""
    if current_user.role != User.Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    generate_diagram: bool = Form(True),
    index_qdrant: bool = Form(True),
    index_mongodb: bool = Form(True),
    index_bm25: bool = Form(True),
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """
    Upload a document folder (with metadata.json and cleaned_content.txt).
    Processes document in background: generates diagram, indexes to MongoDB + Qdrant + BM25.
    """
    try:
        logger.info(f"Admin {current_user.email} uploading document folder with {len(files)} files")

        # Read all files into memory
        file_contents = []
        for file in files:
            content = await file.read()
            # Decode if it's text
            if file.filename.endswith(('.txt', '.json', '.html')):
                content = content.decode('utf-8')
            file_contents.append((file.filename, content))

        # Validate folder structure
        metadata_content, cleaned_content = document_processing_service.validate_folder_structure(file_contents)

        if not metadata_content or not cleaned_content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Folder must contain metadata.json and cleaned_content.txt"
            )

        # Extract and validate metadata
        metadata = document_processing_service.extract_metadata(metadata_content)
        if not metadata:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid metadata.json format"
            )

        document_id = metadata["metadata"]["_id"]
        title = metadata.get("title", "Untitled Document")

        # Check if document already exists
        if document_cms_repository.document_exists(document_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Document with ID {document_id} already exists"
            )

        # Determine folder name from first file path
        folder_name = "uploaded_folder"
        if file_contents:
            first_file = file_contents[0][0]
            if "/" in first_file or "\\" in first_file:
                folder_name = Path(first_file).parts[0]

        # Prepare file metadata
        files_processed = []
        for filename, content in file_contents:
            base_filename = Path(filename).name
            size_kb = len(content) / 1024 if isinstance(content, (bytes, str)) else 0
            files_processed.append(
                FileMetadata(
                    filename=base_filename,
                    size_kb=round(size_kb, 2),
                    processed=False
                )
            )

        # Create initial document record in MongoDB
        initial_doc = {
            "_id": document_id,
            "title": title,
            "document_status": "uploading",
            "indexing_status": {
                "mongodb": "pending",
                "qdrant": "pending",
                "bm25": "pending",
                "last_indexed_at": None,
                "error_messages": {
                    "mongodb": None,
                    "qdrant": None,
                    "bm25": None
                }
            },
            "chunk_count": 0,
            "file_metadata": {
                "original_folder": folder_name,
                "files_processed": [f.dict() for f in files_processed],
                "uploaded_by": current_user.id,
                "uploaded_at": datetime.now(timezone.utc),
                "processing_time_seconds": None,
                "diagram_generation_time_seconds": None
            },
            "usage_analytics": {
                "query_count": 0,
                "query_count_this_week": 0,
                "query_count_this_month": 0,
                "avg_relevance_score": None,
                "times_retrieved": 0,
                "chunks_used": 0,
                "last_accessed_at": None
            },
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }

        document_cms_repository.create_document_record(initial_doc)

        # Queue background processing
        processing_options = {
            "generate_diagram": generate_diagram,
            "index_qdrant": index_qdrant,
            "index_mongodb": index_mongodb,
            "index_bm25": index_bm25
        }

        background_tasks.add_task(
            document_processing_service.process_document,
            document_id,
            metadata,
            cleaned_content,
            current_user.id,
            processing_options
        )

        logger.info(f"Document {document_id} upload initiated, background processing queued")

        return UploadResponse(
            success=True,
            document_id=document_id,
            title=title,
            status=DocumentStatus.PROCESSING,
            indexing_status=IndexingStatus(
                mongodb="pending",
                qdrant="pending",
                bm25="pending"
            ),
            message="Document upload initiated. Processing in background."
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload document: {str(e)}"
        )


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    page: int = 1,
    limit: int = 20,
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """
    List all documents with filtering, search, and pagination.
    """
    try:
        logger.info(f"Admin {current_user.email} listing documents (page {page})")

        documents, total = document_cms_repository.list_documents(
            page=page,
            limit=limit,
            category=category,
            status=status,
            search=search,
            sort_by=sort_by,
            sort_order=sort_order
        )

        # Transform to response format
        document_items = []
        for doc in documents:
            indexing_status_data = doc.get("indexing_status", {})
            file_metadata = doc.get("file_metadata", {})

            document_items.append(
                DocumentListItem(
                    _id=doc["_id"],
                    title=doc.get("title", "Untitled"),
                    document_number=doc.get("document_number"),
                    category=doc.get("category"),
                    status=doc.get("status", ""),
                    indexing_status=IndexingStatus(**indexing_status_data) if indexing_status_data else IndexingStatus(),
                    chunk_count=doc.get("chunk_count", 0),
                    upload_date=doc.get("created_at", datetime.now(timezone.utc)),
                    uploaded_by=file_metadata.get("uploaded_by", 0) if file_metadata else 0
                )
            )

        total_pages = (total + limit - 1) // limit

        return DocumentListResponse(
            documents=document_items,
            pagination={
                "total": total,
                "page": page,
                "limit": limit,
                "pages": total_pages
            }
        )

    except Exception as e:
        logger.error(f"Failed to list documents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve documents"
        )


@router.get("/filters/options", response_model=FilterOptionsResponse)
async def get_filter_options(
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """
    Get dynamic filter options (unique categories and statuses) for the filter dropdowns.
    This endpoint is admin-specific to ensure consistent admin portal experience.
    """
    try:
        categories = document_cms_repository.get_unique_categories()
        statuses = document_cms_repository.get_unique_statuses()

        logger.info(f"Retrieved filter options: {len(categories)} categories, {len(statuses)} statuses")

        return FilterOptionsResponse(
            categories=categories,
            statuses=statuses
        )

    except Exception as e:
        logger.error(f"Failed to get filter options: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve filter options"
        )


@router.post("/test-query", response_model=TestQueryResponse)
async def test_rag_query(
    request: TestQueryRequest,
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """
    Test RAG system with a query - same experience as regular users.

    This endpoint allows admins to test the RAG system and see exactly what
    users experience when they ask questions. It returns the AI response,
    source documents, and processing time.

    The response format matches what users see in the mobile app, ensuring
    consistent testing of document quality and retrieval accuracy.
    """
    try:
        logger.info(f"Admin {current_user.email} testing RAG query: {request.query[:50]}...")

        # Record start time for performance tracking
        start_time = time.time()

        # Call the same RAG service that users interact with
        # This ensures admins see the exact same results as users
        rag_result = await rag_service.invoke_chain(request.query)

        # Calculate processing time in milliseconds
        processing_time = (time.time() - start_time) * 1000

        # Extract and format sources
        raw_sources = rag_result.get("sources", [])
        formatted_sources = []

        for source in raw_sources:
            # RAG service returns: document_id, title, document_number, source_url, page_content_preview
            # We normalize it to our SourceDocument schema
            source_doc = SourceDocument(
                document_id=source.get("document_id"),  # RAG uses "document_id" not "_id"
                document_title=source.get("title"),
                chunk_id=None,  # RAG service doesn't provide chunk_id
                content=source.get("page_content_preview"),  # RAG uses "page_content_preview"
                relevance_score=None  # RAG service doesn't provide relevance scores
            )
            formatted_sources.append(source_doc)

        logger.info(f"RAG test completed in {processing_time:.2f}ms with {len(formatted_sources)} sources")

        return TestQueryResponse(
            query=request.query,
            response=rag_result.get("response", ""),
            sources=formatted_sources,
            processing_time_ms=round(processing_time, 2)
        )

    except Exception as e:
        logger.error(f"RAG test query failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query failed: {str(e)}"
        )


@router.get("/{document_id}", response_model=DocumentDetail)
async def get_document_details(
    document_id: str,
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """
    Get full details of a document.
    """
    try:
        logger.info(f"Admin {current_user.email} fetching document {document_id}")

        document = document_cms_repository.get_document_by_id(document_id)

        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        # Transform to response format
        indexing_status_data = document.get("indexing_status", {})
        usage_analytics_data = document.get("usage_analytics", {})
        file_metadata_data = document.get("file_metadata", {})
        related_docs = document.get("related_documents", [])

        return DocumentDetail(
            _id=document["_id"],
            title=document.get("title", ""),
            document_number=document.get("document_number"),
            document_type=document.get("document_type"),
            category=document.get("category"),
            issuer=document.get("issuer"),
            signatory=document.get("signatory"),
            gazette_number=document.get("gazette_number"),
            issue_date=document.get("issue_date"),
            effective_date=document.get("effective_date"),
            publish_date=document.get("publish_date"),
            status=document.get("status", ""),
            full_text=document.get("full_text"),
            html_content=document.get("html_content"),
            ascii_diagram=document.get("ascii_diagram"),
            related_documents=related_docs,
            indexing_status=IndexingStatus(**indexing_status_data) if indexing_status_data else IndexingStatus(),
            chunk_count=document.get("chunk_count", 0),
            usage_analytics=usage_analytics_data,
            file_metadata=file_metadata_data
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get document details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve document details"
        )


@router.delete("/{document_id}", response_model=DeleteResponse)
async def delete_document(
    document_id: str,
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """
    Delete a document from all systems (MongoDB + Qdrant + BM25).
    Performs cascade cleanup across all databases.
    """
    try:
        logger.info(f"Admin {current_user.email} deleting document {document_id}")

        # Check if document exists
        document = document_cms_repository.get_document_by_id(document_id)
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        # Mark document as deleting
        document_cms_repository.update_document(
            document_id,
            {"document_status": "deleting"}
        )

        deletion_status = {
            "mongodb": False,
            "qdrant": False,
            "bm25": False
        }
        chunks_deleted = 0

        # Delete from Qdrant
        try:
            chunks_deleted = document_processing_service.delete_document_from_qdrant(document_id)
            deletion_status["qdrant"] = True
            logger.info(f"Deleted {chunks_deleted} chunks from Qdrant")
        except Exception as e:
            logger.error(f"Failed to delete from Qdrant: {e}")

        # Delete from MongoDB
        try:
            success = document_cms_repository.delete_document(document_id)
            deletion_status["mongodb"] = success
        except Exception as e:
            logger.error(f"Failed to delete from MongoDB: {e}")

        # BM25 cleanup (handled by RAG service rebuild)
        deletion_status["bm25"] = True

        if not deletion_status["mongodb"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete document from MongoDB"
            )

        logger.info(f"Document {document_id} deleted successfully")

        return DeleteResponse(
            success=True,
            message="Document deleted successfully from all systems",
            deleted_from=deletion_status,
            chunks_deleted=chunks_deleted
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {str(e)}"
        )


@router.get("/{document_id}/status")
async def get_document_status(
    document_id: str,
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """
    Get current processing status of a document.
    Useful for polling during background processing.
    """
    try:
        document = document_cms_repository.get_document_by_id(document_id)

        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        return {
            "document_id": document_id,
            "status": document.get("document_status", "unknown"),
            "indexing_status": document.get("indexing_status", {}),
            "chunk_count": document.get("chunk_count", 0)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get document status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve document status"
        )


@router.get("/{document_id}/chunks", response_model=DocumentChunksResponse)
async def get_document_chunks(
    document_id: str,
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """
    Get all chunks for a specific document from Qdrant.

    Returns chunk information including:
    - chunk_id: Unique identifier in Qdrant
    - vector_id: UUID for the vector point
    - content: Chunk text content
    - character_count: Length of chunk
    - indexed status in Qdrant and BM25
    """
    try:
        # Verify document exists
        document = document_cms_repository.get_document_by_id(document_id)

        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document {document_id} not found"
            )

        # Get chunks from Qdrant
        chunks = document_processing_service.get_document_chunks(document_id)

        logger.info(f"Retrieved {len(chunks)} chunks for document {document_id}")

        return DocumentChunksResponse(
            document_id=document_id,
            chunk_count=len(chunks),
            chunks=chunks
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get chunks for document {document_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve chunks: {str(e)}"
        )


