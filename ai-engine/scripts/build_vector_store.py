import os
import json
import sys
import argparse
import uuid
from typing import Set, List
from tqdm import tqdm
from dotenv import load_dotenv

from langchain_core.documents import Document
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from qdrant_client import QdrantClient, models
from qdrant_client.http.models import PointStruct

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

# Load environment variables
# First try ai-engine/.env (for local runs), then fall back to root .env
ai_engine_env = os.path.join(os.path.dirname(__file__), '..', '.env')
if os.path.exists(ai_engine_env):
    load_dotenv(ai_engine_env)
else:
    load_dotenv()  # Load from root .env

def load_legal_docs_from_folders(root_dir: str, existing_ids: Set[str]) -> List[Document]:
    """Loads legal documents from folders that are not already in the vector store based on document ID."""
    documents = []
    all_dirs = [d for d in os.scandir(root_dir) if d.is_dir()]
    print(f"Scanning {len(all_dirs)} directories...")

    for dir_entry in tqdm(all_dirs, desc="Loading Documents"):
        content_path = os.path.join(dir_entry.path, "cleaned_content.txt")
        metadata_path = os.path.join(dir_entry.path, "metadata.json")

        if not (os.path.exists(metadata_path) and os.path.exists(content_path)):
            continue

        try:
            with open(metadata_path, 'r', encoding='utf-8') as f:
                metadata_json = json.load(f)

            id_metadata = metadata_json.get("metadata")
            if not id_metadata:
                print(f"\n[ERROR] Malformed metadata in {dir_entry.path}: 'metadata' key is missing or null. Skipping file.")
                continue

            doc_id = id_metadata.get("_id")
            if not doc_id or doc_id in existing_ids:
                continue

            with open(content_path, 'r', encoding='utf-8') as f:
                full_text = f.read()

            page_content = f"Tiêu đề: {metadata_json.get('title', '')}\n\nToàn văn: {full_text}"
            
            diagram_metadata = id_metadata.get("diagram", {})
            
            # --- Safe Related Documents Extraction ---
            related_documents = []
            related_docs_obj = diagram_metadata.get("related_documents") # Safely get the object
            if related_docs_obj and isinstance(related_docs_obj, dict):
                related_docs_raw = related_docs_obj.get("van_ban_lien_quan_cung_noi_dung", [])
                if related_docs_raw: # Ensure it's not None or empty
                    related_documents = [
                        {"doc_id": doc.get("_id"), "title": doc.get("ten")}
                        for doc in related_docs_raw if doc # Ensure doc is not None
                    ]
            # --- End Safe Extraction ---

            final_metadata = {
                '_id': doc_id,
                'title': metadata_json.get('title', ''),
                'document_number': diagram_metadata.get('so_hieu', ''),
                'document_type': diagram_metadata.get('loai_van_ban', ''),
                'category': diagram_metadata.get('linh_vuc_nganh', ''),
                'issuer': diagram_metadata.get('noi_ban_hanh', ''),
                'signatory': diagram_metadata.get('nguoi_ky', ''),
                'gazette_number': diagram_metadata.get('so_cong_bao', ''),
                'issue_date': diagram_metadata.get('ngay_ban_hanh', ''),
                'effective_date': diagram_metadata.get('ngay_hieu_luc', ''),
                'publish_date': diagram_metadata.get('ngay_dang', ''),
                'status': diagram_metadata.get('tinh_trang', ''),
                'related_documents': related_documents,
                'source': os.path.abspath(content_path),
            }
            
            doc = Document(page_content=page_content, metadata=final_metadata)
            documents.append(doc)
        except Exception as e:
            print(f"\n[ERROR] Failed to process document in {dir_entry.path}: {e}")
    
    return documents

def get_deterministic_uuid(doc_id: str, content: str) -> str:
    """Creates a stable UUID for a chunk based on its parent doc ID and content."""
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{doc_id}_{content}"))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build the Qdrant vector store incrementally and idempotently.")
    parser.add_argument('--force-rebuild', action='store_true', help='Force a full rebuild of the vector store, deleting all existing data.')
    parser.add_argument('--batch-size', type=int, default=64, help='Batch size for embedding and upserting.')
    args = parser.parse_args()

    print("--- Starting Vector Store Build Process ---")

    # --- Configuration ---
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))
    SOURCE_DOCUMENTS_PATH = os.path.join(PROJECT_ROOT, "ai-engine", "data", "raw_data", "documents")
    QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
    QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
    COLLECTION_NAME = "vietjusticia_legal_docs"

    # --- Client and Model Initialization ---
    print("Initializing Qdrant client...")
    if QDRANT_API_KEY:
        print("-> Connecting to Qdrant Cloud with API key")
        qdrant_client = QdrantClient(
            url=QDRANT_URL,
            api_key=QDRANT_API_KEY,
            timeout=120  # 2 minutes timeout for cloud uploads
        )
    else:
        print("-> Connecting to local Qdrant instance")
        qdrant_client = QdrantClient(url=QDRANT_URL)

    print(f"\n[PHASE 1/4] Initializing embedding model...")
    embeddings = SentenceTransformerEmbeddings(
        model_name='sentence-transformers/paraphrase-multilingual-mpnet-base-v2',
        model_kwargs={'device': 'cuda'}
    )
    print("-> Embedding model initialized.")

    # --- Collection Handling ---
    existing_ids = set()
    if args.force_rebuild and qdrant_client.collection_exists(collection_name=COLLECTION_NAME):
        print(f"FORCE_REBUILD flag detected. Deleting existing collection '{COLLECTION_NAME}'...")
        qdrant_client.delete_collection(collection_name=COLLECTION_NAME)
        print("-> Collection deleted.")

    if not qdrant_client.collection_exists(collection_name=COLLECTION_NAME):
        print(f"Collection '{COLLECTION_NAME}' not found. Creating it now.")
        try:
            vector_size = embeddings.client.get_sentence_embedding_dimension()
            qdrant_client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=models.VectorParams(size=vector_size, distance=models.Distance.COSINE),
            )
            print(f"-> Collection '{COLLECTION_NAME}' created successfully with vector size {vector_size}.")
        except Exception as e:
            print(f"[ERROR] Failed to create Qdrant collection: {e}")
            sys.exit(1)
    else:
        print(f"Collection '{COLLECTION_NAME}' already exists. Fetching existing document IDs for incremental build.")
        response = qdrant_client.scroll(
            collection_name=COLLECTION_NAME, 
            with_payload=["_id"], 
            limit=100000
        )[0]
        existing_ids = {point.payload['_id'] for point in response if '_id' in point.payload}
        print(f"-> Found {len(existing_ids)} unique document IDs already in the vector store.")

    # --- Document Loading and Processing ---
    print(f"\n[PHASE 2/4] Loading new documents from: {SOURCE_DOCUMENTS_PATH}")
    docs = load_legal_docs_from_folders(SOURCE_DOCUMENTS_PATH, existing_ids)
    
    if not docs:
        print("No new documents to process. Vector store is up-to-date.")
        print("\n--- Vector Store Build Process Complete ---")
        sys.exit(0)

    print(f"-> Loaded {len(docs)} new documents.")

    print(f"\n[PHASE 3/4] Splitting documents into chunks...")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = text_splitter.split_documents(docs)
    print(f"-> Created {len(chunks)} new chunks.")

    # --- Embedding and Upserting with Progress Bar ---
    print(f"\n[PHASE 4/4] Embedding chunks and upserting to Qdrant in batches of {args.batch_size}...")
    
    seen_point_ids = set()  # Track duplicate chunks
    duplicate_count = 0
    error_count = 0
    successful_count = 0
    
    for i in tqdm(range(0, len(chunks), args.batch_size), desc="Upserting Batches"):
        batch_chunks = chunks[i:i + args.batch_size]
        
        # Filter out duplicates and empty chunks before embedding
        valid_chunks = []
        for idx, chunk in enumerate(batch_chunks):
            point_id = get_deterministic_uuid(chunk.metadata['_id'], chunk.page_content)
            
            # Skip duplicate chunks (same content = same UUID)
            if point_id in seen_point_ids:
                duplicate_count += 1
                continue
            
            # Skip empty or very short chunks
            if not chunk.page_content or len(chunk.page_content.strip()) < 10:
                continue
            
            seen_point_ids.add(point_id)
            valid_chunks.append(chunk)
        
        if not valid_chunks:
            continue
        
        # Only embed valid chunks
        batch_contents = [chunk.page_content for chunk in valid_chunks]
        batch_vectors = embeddings.embed_documents(batch_contents)
        
        points_to_upsert = []
        for idx, chunk in enumerate(valid_chunks):
            point_id = get_deterministic_uuid(chunk.metadata['_id'], chunk.page_content)
            
            full_payload = {
                "page_content": chunk.page_content,
                **chunk.metadata
            }

            points_to_upsert.append(
                PointStruct(
                    id=point_id,
                    vector=batch_vectors[idx],
                    payload=full_payload
                )
            )
        
        if not points_to_upsert:
            continue
            
        try:
            # Use wait=True to ensure all points are saved and catch errors
            qdrant_client.upsert(
                collection_name=COLLECTION_NAME,
                points=points_to_upsert,
                wait=True  # Changed to True to ensure completion
            )
            successful_count += len(points_to_upsert)
        except Exception as e:
            error_count += len(points_to_upsert)
            print(f"\n[ERROR] Failed to upsert batch starting at index {i}: {e}")
            # Continue with next batch instead of failing completely

    # Verify final count
    print(f"\n[STATS] Chunk processing summary:")
    print(f"  - Total chunks created: {len(chunks)}")
    print(f"  - Duplicate chunks skipped: {duplicate_count}")
    print(f"  - Successfully upserted: {successful_count}")
    print(f"  - Failed to upsert: {error_count}")
    
    # Get actual count from Qdrant
    try:
        collection_info = qdrant_client.get_collection(COLLECTION_NAME)
        actual_points = collection_info.points_count
        print(f"  - Actual points in Qdrant: {actual_points}")
        
        if actual_points != successful_count:
            print(f"\n[WARNING] Mismatch detected!")
            print(f"  Expected: {successful_count}, Actual: {actual_points}")
            print(f"  Difference: {successful_count - actual_points}")
    except Exception as e:
        print(f"\n[WARNING] Could not verify final count: {e}")

    print(f"\n-> Qdrant collection '{COLLECTION_NAME}' updated successfully.")
    print("\n--- Vector Store Build Process Complete ---")