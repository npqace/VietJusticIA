import os
import json
import sys
import time
from typing import List

from langchain_community.vectorstores import Qdrant
from langchain_core.documents import Document
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Add the parent directory to the path to allow imports from the app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def load_legal_docs_from_folders(root_dir: str, max_docs: int = -1) -> list[Document]:
    """Loads legal documents from folders, preserving metadata."""
    # (This function remains the same as previously defined)
    documents = []
    doc_count = 0
    
    all_dirs = [d for d in os.scandir(root_dir) if d.is_dir()]
    
    for dir_entry in all_dirs:
        if max_docs != -1 and doc_count >= max_docs:
            break
            
        metadata_path = os.path.join(dir_entry.path, "metadata.json")
        content_path = os.path.join(dir_entry.path, "content.txt")

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
                    'source': content_path,
                }
                
                doc = Document(page_content=page_content, metadata=final_metadata)
                documents.append(doc)
                doc_count += 1
            except Exception as e:
                print(f"\n[ERROR] Failed to process document in {dir_entry.path}: {e}")
    
    return documents

if __name__ == "__main__":
    print("--- Starting Vector Store Build Process ---")

    # 1. Define Paths and Configuration
    # Construct the absolute path to the documents directory
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '../..'))
    SOURCE_DOCUMENTS_PATH = os.path.join(PROJECT_ROOT, "ai-engine", "data", "raw_data", "documents")
    QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
    COLLECTION_NAME = "vietjusticia_legal_docs"

    # 2. Load Documents
    print(f"\n[PHASE 1/4] Loading documents from: {SOURCE_DOCUMENTS_PATH}")
    docs = load_legal_docs_from_folders(SOURCE_DOCUMENTS_PATH, max_docs=-1)
    print(f"-> Loaded {len(docs)} documents.")

    # 3. Split Documents into Chunks
    print(f"\n[PHASE 2/4] Splitting documents into chunks...")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = text_splitter.split_documents(docs)
    print(f"-> Created {len(chunks)} chunks.")

    # 4. Initialize Embedding Model
    print(f"\n[PHASE 3/4] Initializing embedding model...")
    embeddings = SentenceTransformerEmbeddings(
        model_name='sentence-transformers/paraphrase-multilingual-mpnet-base-v2',
        model_kwargs={'device': 'cuda'}
    )
    print("-> Embedding model initialized.")

    # 5. Create and Populate Qdrant Vector Store
    print(f"\n[PHASE 4/4] Creating and populating Qdrant vector store...")
    print(f"Connecting to Qdrant at: {QDRANT_URL}")
    print(f"Collection name: {COLLECTION_NAME}")
    print("This may take a while...")
    
    Qdrant.from_documents(
        chunks,
        embeddings,
        url=QDRANT_URL,
        collection_name=COLLECTION_NAME,
        force_recreate=True, # Use True to drop and recreate the collection on each run
    )
    
    print(f"-> Qdrant collection '{COLLECTION_NAME}' created and populated successfully.")
    print("\n--- Vector Store Build Process Complete ---")
