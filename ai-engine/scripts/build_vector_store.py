
import os
import json
import sys
import argparse
from typing import Set

from langchain_community.vectorstores import Qdrant
from langchain_core.documents import Document
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from qdrant_client import QdrantClient, models

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

def load_legal_docs_from_folders(root_dir: str, existing_sources: Set[str]) -> list[Document]:
    """Loads legal documents from folders that are not already in the vector store."""
    documents = []
    all_dirs = [d for d in os.scandir(root_dir) if d.is_dir()]

    for dir_entry in all_dirs:
        content_path = os.path.join(dir_entry.path, "cleaned_content.txt")
        # Use absolute path for consistent checking against Qdrant payload
        abs_content_path = os.path.abspath(content_path)

        if abs_content_path in existing_sources:
            continue # Skip if this document source is already in Qdrant

        metadata_path = os.path.join(dir_entry.path, "metadata.json")
        if os.path.exists(metadata_path) and os.path.exists(content_path):
            try:
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    metadata_json = json.load(f)
                with open(content_path, 'r', encoding='utf-8') as f:
                    full_text = f.read()

                page_content = f"Tiêu đề: {metadata_json.get('title', '')}\n\nToàn văn: {full_text}"
                
                id_metadata = metadata_json.get("metadata", {})
                diagram_metadata = id_metadata.get("diagram", {})
                
                final_metadata = {
                    '_id': id_metadata.get('_id', ''),
                    'so_hieu': diagram_metadata.get('so_hieu', ''),
                    'loai_van_ban': diagram_metadata.get('loai_van_ban', ''),
                    'noi_ban_hanh': diagram_metadata.get('noi_ban_hanh', ''),
                    'ngay_ban_hanh': diagram_metadata.get('ngay_ban_hanh', ''),
                    'tinh_trang': diagram_metadata.get('tinh_trang', ''),
                    'title': metadata_json.get('title', ''),
                    'source': abs_content_path, # Store absolute path in metadata
                }
                
                doc = Document(page_content=page_content, metadata=final_metadata)
                documents.append(doc)
            except Exception as e:
                print(f"\n[ERROR] Failed to process document in {dir_entry.path}: {e}")
    
    return documents

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build the Qdrant vector store incrementally.")
    parser.add_argument('--force-rebuild', action='store_true', help='Force a full rebuild of the vector store, deleting all existing data.')
    args = parser.parse_args()

    print("--- Starting Vector Store Build Process ---")

    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))
    SOURCE_DOCUMENTS_PATH = os.path.join(PROJECT_ROOT, "ai-engine", "data", "raw_data", "documents")
    QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
    COLLECTION_NAME = "vietjusticia_legal_docs"

    print("Initializing Qdrant client...")
    qdrant_client = QdrantClient(url=QDRANT_URL)

    existing_sources = set()
    if args.force_rebuild:
        print("FORCE_REBUILD flag detected. Collection will be completely rebuilt.")
    else:
        try:
            # Check if collection exists. If not, this will raise an exception.
            collection_info = qdrant_client.get_collection(collection_name=COLLECTION_NAME)
            print(f"Collection '{COLLECTION_NAME}' already exists. Fetching existing sources for incremental build.")
            # Use scroll API to get all points
            response, _ = qdrant_client.scroll(collection_name=COLLECTION_NAME, with_payload=["source"], limit=10000)
            existing_sources = {point.payload['source'] for point in response if 'source' in point.payload}
            print(f"-> Found {len(existing_sources)} existing document sources in the vector store.")
        except Exception as e:
            print(f"Collection '{COLLECTION_NAME}' not found or Qdrant not reachable. A new collection will be created. Error: {e}")

    print(f"\n[PHASE 1/4] Loading new documents from: {SOURCE_DOCUMENTS_PATH}")
    docs = load_legal_docs_from_folders(SOURCE_DOCUMENTS_PATH, existing_sources)
    
    if not docs:
        print("No new documents to process. Vector store is up-to-date.")
        print("\n--- Vector Store Build Process Complete ---")
        sys.exit(0)

    print(f"-> Loaded {len(docs)} new documents.")

    print(f"\n[PHASE 2/4] Splitting documents into chunks...")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = text_splitter.split_documents(docs)
    print(f"-> Created {len(chunks)} new chunks.")

    print(f"\n[PHASE 3/4] Initializing embedding model...")
    embeddings = SentenceTransformerEmbeddings(
        model_name='sentence-transformers/paraphrase-multilingual-mpnet-base-v2',
        model_kwargs={'device': 'cuda'}
    )
    print("-> Embedding model initialized.")

    print(f"\n[PHASE 4/4] Populating Qdrant vector store...")
    if args.force_rebuild:
        print("Performing a full rebuild...")
        Qdrant.from_documents(
            chunks,
            embeddings,
            url=QDRANT_URL,
            collection_name=COLLECTION_NAME,
            force_recreate=True,
        )
    else:
        print("Performing an incremental update...")
        qdrant = Qdrant(client=qdrant_client, collection_name=COLLECTION_NAME, embeddings=embeddings)
        qdrant.add_documents(chunks)
    
    print(f"-> Qdrant collection '{COLLECTION_NAME}' updated successfully.")
    print("\n--- Vector Store Build Process Complete ---")

