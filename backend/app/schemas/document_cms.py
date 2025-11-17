"""
Pydantic schemas for Document CMS (Admin Portal).
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class IndexingSystemStatus(str, Enum):
    """Status of indexing in a specific system."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class DocumentStatus(str, Enum):
    """Overall document status."""
    UPLOADING = "uploading"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    DELETING = "deleting"


class IndexingStatus(BaseModel):
    """Status of document indexing across systems."""
    mongodb: IndexingSystemStatus = IndexingSystemStatus.PENDING
    qdrant: IndexingSystemStatus = IndexingSystemStatus.PENDING
    bm25: IndexingSystemStatus = IndexingSystemStatus.PENDING
    last_indexed_at: Optional[datetime] = None
    error_messages: Dict[str, Optional[str]] = Field(
        default_factory=lambda: {"mongodb": None, "qdrant": None, "bm25": None}
    )


class FileMetadata(BaseModel):
    """Metadata about uploaded files."""
    filename: str
    size_kb: float
    processed: bool = False


class UploadMetadata(BaseModel):
    """Metadata about the upload process."""
    original_folder: Optional[str] = None
    files_processed: List[FileMetadata] = Field(default_factory=list)
    uploaded_by: Optional[int] = None  # User ID
    uploaded_at: Optional[datetime] = None
    processing_time_seconds: Optional[float] = None
    diagram_generation_time_seconds: Optional[float] = None


class UsageAnalytics(BaseModel):
    """Usage analytics for a document."""
    query_count: int = 0
    query_count_this_week: int = 0
    query_count_this_month: int = 0
    avg_relevance_score: Optional[float] = None
    times_retrieved: int = 0
    chunks_used: int = 0
    last_accessed_at: Optional[datetime] = None


class RelatedDocument(BaseModel):
    """Reference to a related document."""
    doc_id: str
    title: str
    issue_date: Optional[str] = None
    status: Optional[str] = None


class DocumentListItem(BaseModel):
    """Document item for list display."""
    id: str = Field(alias="_id")
    title: str
    document_number: Optional[str] = None
    category: Optional[str] = None
    status: str  # Legal document status (e.g., "Còn hiệu lực", "Hết hiệu lực")
    indexing_status: IndexingStatus
    chunk_count: int = 0
    upload_date: datetime
    uploaded_by: Optional[int] = None

    class Config:
        populate_by_name = True


class DocumentDetail(BaseModel):
    """Full document details."""
    id: str = Field(alias="_id")
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
    status: str
    full_text: Optional[str] = None
    html_content: Optional[str] = None
    ascii_diagram: Optional[str] = None
    related_documents: List[RelatedDocument] = Field(default_factory=list)
    indexing_status: IndexingStatus
    chunk_count: int = 0
    usage_analytics: Optional[UsageAnalytics] = None
    file_metadata: Optional[UploadMetadata] = None

    class Config:
        populate_by_name = True


class ChunkInfo(BaseModel):
    """Information about a document chunk."""
    chunk_id: str
    vector_id: str
    content: str
    character_count: int
    indexed_in_qdrant: bool = False
    indexed_in_bm25: bool = False
    relevance_score: Optional[float] = None


class DocumentChunksResponse(BaseModel):
    """Response for document chunks."""
    document_id: str
    chunk_count: int
    chunks: List[ChunkInfo]


class UploadProcessingOptions(BaseModel):
    """Options for document processing."""
    generate_diagram: bool = True
    index_qdrant: bool = True
    index_mongodb: bool = True
    index_bm25: bool = True


class UploadResponse(BaseModel):
    """Response after uploading a document."""
    success: bool
    document_id: str
    title: str
    status: DocumentStatus
    indexing_status: IndexingStatus
    job_id: Optional[str] = None
    message: str


class DeleteResponse(BaseModel):
    """Response after deleting a document."""
    success: bool
    message: str
    deleted_from: Dict[str, bool]
    chunks_deleted: int


class DocumentStatsResponse(BaseModel):
    """Statistics for a document."""
    document_id: str
    indexing_status: IndexingStatus
    usage_analytics: UsageAnalytics
    quality_ratings: Optional[Dict[str, Any]] = None
    related_documents: Dict[str, int] = Field(
        default_factory=lambda: {"referenced_by": 0, "references_to": 0}
    )
    file_metadata: Optional[UploadMetadata] = None


class DocumentListResponse(BaseModel):
    """Paginated list of documents."""
    documents: List[DocumentListItem]
    pagination: Dict[str, int]


class ReEmbedChunkResponse(BaseModel):
    """Response after re-embedding a chunk."""
    success: bool
    old_chunk_id: str
    new_chunk_id: str
    content: str
    content_changed: bool
    message: str


class FilterOptionsResponse(BaseModel):
    """Response with filter options (categories, statuses)."""
    categories: List[str]
    statuses: List[str]
