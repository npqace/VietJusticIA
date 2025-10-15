import os
import sys
import json
from pymongo import MongoClient
from bs4 import BeautifulSoup

# Add the project root to the path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def generate_ascii_diagram(text: str) -> str:
    """
    (Placeholder) Generates a sample ASCII diagram.
    TODO: Replace this with a real AI-powered generation service call
    that analyzes the text to create a meaningful diagram.
    """
    # This is a sample diagram representing a simple legal procedure.
    diagram = """
    [ Bắt đầu ]
         |
         v
    +-------------------------+
    |   Nộp đơn/yêu cầu      |
    +-------------------------+
         |
         v
    +-------------------------+
    |   Cơ quan có thẩm quyền  |
    |      tiếp nhận và       |
    |      xử lý sơ bộ        |
    +-------------------------+
         |
         |----------------------> [ Yêu cầu bổ sung ]
         |                            |
         v                            v
    +-------------------------+    +-------------------------+
    |   Hợp lệ?               |--->|   Bổ sung hồ sơ        |
    +-------------------------+    +-------------------------+
         |
         v
    +-------------------------+
    |   Giải quyết và ra      |
    |   quyết định/văn bản    |
    +-------------------------+
         |
         v
    [ Kết thúc ]
    """
    return diagram.strip()


def load_legal_docs_from_folders(root_dir: str) -> list[dict]:
    """Loads legal documents from folders and returns them as dictionaries."""
    documents = []
    all_dirs = [d for d in os.scandir(root_dir) if d.is_dir()]
    
    for dir_entry in all_dirs:
        metadata_path = os.path.join(dir_entry.path, "metadata.json")
        content_path = os.path.join(dir_entry.path, "content.txt")
        html_content_path = os.path.join(dir_entry.path, "page_content.html")

        if os.path.exists(metadata_path) and os.path.exists(content_path):
            try:
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    metadata_json = json.load(f)
                with open(content_path, 'r', encoding='utf-8') as f:
                    full_text = f.read()
                
                html_content = ""
                if os.path.exists(html_content_path):
                    with open(html_content_path, 'r', encoding='utf-8') as f:
                        soup = BeautifulSoup(f.read(), 'html.parser')
                        # This selector should match the one used in the crawler/consolidate script
                        content_div = soup.select_one("div.legislation-page__container")
                        if content_div:
                            html_content = str(content_div)

                id_metadata = metadata_json.get("metadata", {})
                diagram_metadata = id_metadata.get("diagram", {})
                
                # Generate the ASCII diagram (placeholder)
                ascii_diagram = generate_ascii_diagram(full_text)

                doc_data = {
                    "_id": id_metadata.get('_id'), # Use the original ID from the source
                    "title": metadata_json.get('title', ''),
                    "document_number": diagram_metadata.get('so_hieu', ''),
                    "document_type": diagram_metadata.get('loai_van_ban', ''),
                    "issuer": diagram_metadata.get('noi_ban_hanh', ''),
                    "issue_date": diagram_metadata.get('ngay_ban_hanh', ''),
                    "status": diagram_metadata.get('tinh_trang', ''),
                    "full_text": full_text,
                    "html_content": html_content, # Add the HTML content
                    "ascii_diagram": ascii_diagram, # Add the diagram
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
    PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '../..')) # This will be /app in the container
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
