"""
Service for processing uploaded documents (CMS).
Handles folder upload, validation, diagram generation, and indexing.
"""
import os
import json
import time
import logging
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from pathlib import Path
import tempfile
import shutil

from qdrant_client import QdrantClient, models
from qdrant_client.http.models import PointStruct
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from ..repository import document_cms_repository

logger = logging.getLogger(__name__)

# Configuration
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION_NAME = "vietjusticia_legal_docs"


class DocumentProcessingService:
    """Service for processing document uploads."""

    def __init__(self):
        self.qdrant_client = None
        self.embeddings_model = None
        self.llm = None
        self.initialized = False

    def initialize(self):
        """Initialize Qdrant client and embedding model."""
        if self.initialized:
            return

        try:
            # Initialize Qdrant client
            if QDRANT_API_KEY:
                logger.info("Connecting to Qdrant Cloud with API key")
                self.qdrant_client = QdrantClient(
                    url=QDRANT_URL,
                    api_key=QDRANT_API_KEY,
                    timeout=120
                )
            else:
                logger.info("Connecting to local Qdrant instance")
                self.qdrant_client = QdrantClient(url=QDRANT_URL)

            # Initialize embedding model
            logger.info("Initializing embedding model")
            self.embeddings_model = SentenceTransformerEmbeddings(
                model_name='sentence-transformers/paraphrase-multilingual-mpnet-base-v2',
                model_kwargs={'device': 'cpu'}  # Use CPU for now
            )

            # Initialize LLM for diagram generation
            logger.info("Initializing Gemini LLM")
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-2.0-flash-exp",
                temperature=0.2
            )

            self.initialized = True
            logger.info("Document processing service initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize document processing service: {e}")
            raise

    def validate_folder_structure(self, files: List[tuple]) -> tuple[Optional[str], Optional[str]]:
        """
        Validate that uploaded folder contains required files.

        Args:
            files: List of (filename, content) tuples

        Returns:
            Tuple of (metadata_content, cleaned_content) or (None, None) if invalid
        """
        metadata_content = None
        cleaned_content = None

        for filename, content in files:
            if filename.endswith("metadata.json"):
                metadata_content = content
            elif filename.endswith("cleaned_content.txt"):
                cleaned_content = content

        if not metadata_content or not cleaned_content:
            logger.warning("Missing required files: metadata.json or cleaned_content.txt")
            return None, None

        return metadata_content, cleaned_content

    def extract_metadata(self, metadata_json: str) -> Optional[Dict[str, Any]]:
        """
        Extract and validate metadata from metadata.json.

        Args:
            metadata_json: JSON string from metadata.json

        Returns:
            Parsed metadata dict or None if invalid
        """
        try:
            metadata = json.loads(metadata_json)

            # Validate required fields
            if "metadata" not in metadata:
                logger.error("Metadata JSON missing 'metadata' key")
                return None

            id_metadata = metadata.get("metadata", {})
            if not id_metadata.get("_id"):
                logger.error("Metadata missing '_id' field")
                return None

            return metadata

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse metadata JSON: {e}")
            return None

    def generate_ascii_diagram(self, text: str) -> str:
        """
        Generate ASCII diagram from document text using Gemini.

        Args:
            text: Document text content

        Returns:
            ASCII diagram string
        """
        if not self.initialized:
            self.initialize()

        try:
            max_chars = 20000
            truncated_text = text[:max_chars]

            prompt = f"""
Act as an expert legal analyst tasked with creating a visual summary. Based on the following Vietnamese legal document text, identify the main procedural steps, conditions, and outcomes.

Your goal is to generate a flowchart of this process using only ASCII characters. You MUST use boxes made from `+`, `-`, and `|` characters for nodes. Do not use square brackets `[]`. The language used within the diagram nodes must be concise and in Vietnamese.

IMPORTANT: The entire diagram must be readable and well-formatted for a mobile screen. The total width of any line in the diagram MUST NOT exceed 39 characters. Use line breaks inside nodes for longer text.

Example of the required output format:
```
+-------------------------------------+
|               Bắt đầu              |
+-------------------------------------+
                 |
                 v
+-------------------------------------+
|        Nội dung của bước 1         |
|         - Chi tiết phụ 1          |
|         - Chi tiết phụ 2          |
+-------------------------------------+
```

Here is the document text:

---
{truncated_text}
---
"""

            logger.info("Generating ASCII diagram with Gemini")
            response = self.llm.invoke(prompt)
            diagram = response.content

            logger.info("ASCII diagram generated successfully")
            return diagram

        except Exception as e:
            logger.error(f"Failed to generate ASCII diagram: {e}")
            return f"Error generating diagram: {str(e)}"

    def chunk_and_embed_document(
        self,
        document_id: str,
        title: str,
        content: str,
        metadata: Dict[str, Any]
    ) -> int:
        """
        Chunk document text, generate embeddings, and upload to Qdrant.

        Args:
            document_id: Document ID
            title: Document title
            content: Document content
            metadata: Document metadata

        Returns:
            Number of chunks created
        """
        if not self.initialized:
            self.initialize()

        try:
            logger.info(f"Chunking document {document_id}")

            # Create chunks
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200
            )

            page_content = f"Tiêu đề: {title}\n\nToàn văn: {content}"
            chunks = text_splitter.split_text(page_content)

            logger.info(f"Created {len(chunks)} chunks for document {document_id}")

            # Generate embeddings
            logger.info("Generating embeddings for chunks")
            vectors = self.embeddings_model.embed_documents(chunks)

            # Prepare points for Qdrant
            points = []
            diagram_metadata = metadata.get("metadata", {}).get("diagram", {})

            for idx, (chunk, vector) in enumerate(zip(chunks, vectors)):
                # Create deterministic UUID based on document ID and chunk content
                point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{document_id}_{chunk}"))

                # Prepare payload
                payload = {
                    "page_content": chunk,
                    "_id": document_id,
                    "title": title,
                    "document_number": diagram_metadata.get("so_hieu", ""),
                    "document_type": diagram_metadata.get("loai_van_ban", ""),
                    "category": diagram_metadata.get("linh_vuc_nganh", ""),
                    "issuer": diagram_metadata.get("noi_ban_hanh", ""),
                    "issue_date": diagram_metadata.get("ngay_ban_hanh", ""),
                    "status": diagram_metadata.get("tinh_trang", ""),
                }

                points.append(
                    PointStruct(
                        id=point_id,
                        vector=vector,
                        payload=payload
                    )
                )

            # Upload to Qdrant
            logger.info(f"Uploading {len(points)} points to Qdrant")
            self.qdrant_client.upsert(
                collection_name=QDRANT_COLLECTION_NAME,
                points=points,
                wait=False
            )

            logger.info(f"Document {document_id} indexed to Qdrant successfully")
            return len(chunks)

        except Exception as e:
            logger.error(f"Failed to chunk and embed document {document_id}: {e}")
            raise

    def delete_document_from_qdrant(self, document_id: str) -> int:
        """
        Delete all chunks of a document from Qdrant.

        Args:
            document_id: Document ID

        Returns:
            Number of chunks deleted
        """
        if not self.initialized:
            self.initialize()

        try:
            logger.info(f"Deleting document {document_id} from Qdrant")

            # Query for all points with this document ID
            scroll_result = self.qdrant_client.scroll(
                collection_name=QDRANT_COLLECTION_NAME,
                scroll_filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="_id",
                            match=models.MatchValue(value=document_id)
                        )
                    ]
                ),
                limit=10000
            )

            points = scroll_result[0]
            point_ids = [point.id for point in points]

            if point_ids:
                # Delete points
                self.qdrant_client.delete(
                    collection_name=QDRANT_COLLECTION_NAME,
                    points_selector=models.PointIdsList(points=point_ids)
                )
                logger.info(f"Deleted {len(point_ids)} chunks from Qdrant for document {document_id}")
            else:
                logger.warning(f"No chunks found in Qdrant for document {document_id}")

            return len(point_ids)

        except Exception as e:
            logger.error(f"Failed to delete document from Qdrant: {e}")
            raise

    async def process_document(
        self,
        document_id: str,
        metadata: Dict[str, Any],
        content: str,
        uploaded_by: int,
        options: Dict[str, bool]
    ):
        """
        Background task to process uploaded document.

        Args:
            document_id: Document ID
            metadata: Parsed metadata
            content: Document content
            uploaded_by: User ID who uploaded
            options: Processing options (generate_diagram, index_qdrant, etc.)
        """
        try:
            start_time = time.time()
            logger.info(f"Starting background processing for document {document_id}")

            # Extract metadata fields
            id_metadata = metadata.get("metadata", {})
            diagram_metadata = id_metadata.get("diagram", {})
            title = metadata.get("title", "")

            # Process related documents
            related_documents = []
            related_docs_obj = diagram_metadata.get("related_documents")
            if related_docs_obj and isinstance(related_docs_obj, dict):
                doc_list = related_docs_obj.get("van_ban_lien_quan_cung_noi_dung", [])
                if isinstance(doc_list, list):
                    for doc in doc_list:
                        if isinstance(doc, dict):
                            related_documents.append({
                                "doc_id": doc.get("_id"),
                                "title": doc.get("ten"),
                                "issue_date": doc.get("ngay_ban_hanh"),
                                "status": doc.get("tinh_trang")
                            })

            # Update status to processing
            document_cms_repository.update_document(
                document_id,
                {
                    "document_status": "processing",
                    "indexing_status": {
                        "mongodb": "processing",
                        "qdrant": "pending",
                        "bm25": "pending",
                        "last_indexed_at": None,
                        "error_messages": {
                            "mongodb": None,
                            "qdrant": None,
                            "bm25": None
                        }
                    }
                }
            )

            # Generate ASCII diagram
            ascii_diagram = ""
            diagram_time = 0
            if options.get("generate_diagram", True):
                diagram_start = time.time()
                ascii_diagram = self.generate_ascii_diagram(content)
                diagram_time = time.time() - diagram_start
                logger.info(f"Diagram generated in {diagram_time:.2f}s")

            # Update MongoDB with full document data
            document_update = {
                "title": title,
                "document_number": diagram_metadata.get("so_hieu", ""),
                "document_type": diagram_metadata.get("loai_van_ban", ""),
                "category": diagram_metadata.get("linh_vuc_nganh", ""),
                "issuer": diagram_metadata.get("noi_ban_hanh", ""),
                "signatory": diagram_metadata.get("nguoi_ky", ""),
                "gazette_number": diagram_metadata.get("so_cong_bao", ""),
                "issue_date": diagram_metadata.get("ngay_ban_hanh", ""),
                "effective_date": diagram_metadata.get("ngay_hieu_luc", ""),
                "publish_date": diagram_metadata.get("ngay_dang", ""),
                "status": diagram_metadata.get("tinh_trang", ""),
                "full_text": content,
                "ascii_diagram": ascii_diagram,
                "related_documents": related_documents,
                "indexing_status.mongodb": "completed"
            }

            document_cms_repository.update_document(document_id, document_update)

            # Index to Qdrant
            chunk_count = 0
            if options.get("index_qdrant", True):
                try:
                    chunk_count = self.chunk_and_embed_document(
                        document_id,
                        title,
                        content,
                        metadata
                    )
                    document_cms_repository.update_document(
                        document_id,
                        {
                            "indexing_status.qdrant": "completed",
                            "chunk_count": chunk_count
                        }
                    )
                except Exception as e:
                    logger.error(f"Failed to index to Qdrant: {e}")
                    document_cms_repository.update_document(
                        document_id,
                        {
                            "indexing_status.qdrant": "failed",
                            "indexing_status.error_messages.qdrant": str(e)
                        }
                    )

            # BM25 indexing would happen here (skipped for now as it's handled by RAG service)
            document_cms_repository.update_document(
                document_id,
                {"indexing_status.bm25": "completed"}
            )

            # Calculate total processing time
            total_time = time.time() - start_time

            # Update final status
            document_cms_repository.update_document(
                document_id,
                {
                    "document_status": "completed",
                    "indexing_status.last_indexed_at": datetime.now(timezone.utc),
                    "file_metadata.processing_time_seconds": total_time,
                    "file_metadata.diagram_generation_time_seconds": diagram_time,
                    "chunk_count": chunk_count
                }
            )

            logger.info(f"Document {document_id} processed successfully in {total_time:.2f}s")

        except Exception as e:
            logger.error(f"Failed to process document {document_id}: {e}")
            document_cms_repository.update_document(
                document_id,
                {
                    "document_status": "failed",
                    "indexing_status.mongodb": "failed",
                    "indexing_status.error_messages.mongodb": str(e)
                }
            )


# Global service instance
document_processing_service = DocumentProcessingService()
