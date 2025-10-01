import os
import sys
import json
from pymongo import MongoClient
from langchain_core.documents import Document

# Add the project root to the path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def load_legal_docs_from_folders(root_dir: str) -> list[dict]:
    """Loads legal documents from folders and returns them as dictionaries."""
    documents = []
    all_dirs = [d for d in os.scandir(root_dir) if d.is_dir()]
    
    for dir_entry in all_dirs:
        metadata_path = os.path.join(dir_entry.path, "metadata.json")
        content_path = os.path.join(dir_entry.path, "content.txt")

        if os.path.exists(metadata_path) and os.path.exists(content_path):
            try:
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    metadata_json = json.load(f)
                with open(content_path, 'r', encoding='utf-8') as f:
                    full_text = f.read()

                id_metadata = metadata_json.get("metadata", {})
                diagram_metadata = id_metadata.get("diagram", {})
                
                doc_data = {
                    "title": metadata_json.get('title', ''),
                    "document_number": diagram_metadata.get('so_hieu', ''),
                    "document_type": diagram_metadata.get('loai_van_ban', ''),
                    "issuer": diagram_metadata.get('noi_ban_hanh', ''),
                    "issue_date": diagram_metadata.get('ngay_ban_hanh', ''),
                    "status": diagram_metadata.get('tinh_trang', ''),
                    "full_text": full_text,
                    "source_path": content_path,
                }
                documents.append(doc_data)
            except Exception as e:
                print(f"\n[ERROR] Failed to process document in {dir_entry.path}: {e}")
    
    return documents

if __name__ == "__main__":
    print("--- Starting Document Migration to MongoDB ---")

    # 1. Define Paths and Configuration
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..')) # This will be /app in the container
    SOURCE_DOCUMENTS_PATH = os.path.join(PROJECT_ROOT, "ai-engine", "data", "raw_data", "documents")
    
    MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/")
    MONGO_DB_NAME = "vietjusticia"
    MONGO_COLLECTION_NAME = "legal_documents"

    # 2. Load Documents from filesystem
    print(f"\n[PHASE 1/3] Loading documents from: {SOURCE_DOCUMENTS_PATH}")
    docs_to_migrate = load_legal_docs_from_folders(SOURCE_DOCUMENTS_PATH)
    print(f"-> Loaded {len(docs_to_migrate)} documents.")

    # 3. Connect to MongoDB
    print(f"\n[PHASE 2/3] Connecting to MongoDB at {MONGO_URL}...")
    client = MongoClient(MONGO_URL)
    db = client[MONGO_DB_NAME]
    collection = db[MONGO_COLLECTION_NAME]
    print("-> Connected to MongoDB successfully.")

    # 4. Insert documents into MongoDB
    print(f"\n[PHASE 3/3] Migrating documents to collection '{MONGO_COLLECTION_NAME}'...")
    if docs_to_migrate:
        # Clear the collection before inserting new data to avoid duplicates
        print("-> Clearing existing documents in the collection...")
        collection.delete_many({})
        
        print(f"-> Inserting {len(docs_to_migrate)} documents...")
        collection.insert_many(docs_to_migrate)
        print("-> Documents inserted successfully.")
    else:
        print("-> No documents to migrate.")

    client.close()
    print("\n--- Document Migration Complete ---")
