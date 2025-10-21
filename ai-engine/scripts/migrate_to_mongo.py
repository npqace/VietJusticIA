import os
import sys
import json
import logging
import argparse
import backoff
from concurrent.futures import ThreadPoolExecutor, as_completed
from pymongo import MongoClient, UpdateOne
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from tqdm import tqdm

# --- Setup ---
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
load_dotenv()

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    from google.api_core.exceptions import ResourceExhausted
except ImportError:
    print("ERROR: Required Google AI libraries are not installed. Please check your requirements.")
    sys.exit(1)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- AI Diagram Generation with Rate Limit Handling ---
@backoff.on_exception(backoff.expo, ResourceExhausted, max_tries=5, factor=2)
def generate_ascii_diagram(text: str, llm) -> str:
    """Generates an ASCII diagram by calling a generative AI model, with exponential backoff on rate limit errors."""
    if not text:
        return "Document text is empty. Cannot generate diagram."
    max_chars = 20000
    truncated_text = text[:max_chars]
    prompt_template = f"""
    Act as an expert legal analyst tasked with creating a visual summary. Based on the following Vietnamese legal document text, identify the main procedural steps, conditions, and outcomes.

    Your goal is to generate a flowchart of this process using only ASCII characters. You MUST use boxes made from `+`, `-`, and `|` characters for nodes. Do not use square brackets `[]`. The language used within the diagram nodes must be concise and in Vietnamese.

    IMPORTANT: The entire diagram must be readable and well-formatted within a standard 80-character wide terminal window. Use line breaks inside nodes for longer text to prevent the diagram from becoming too wide.

    Example of the required output format:
    ```
    +-------------------------+
    |        Bắt đầu         |
    +-------------------------+
         |
         v
    +-------------------------+
    |   Nội dung của bước 1   |
    |   - Chi tiết phụ 1      |
    |   - Chi tiết phụ 2      |
    +-------------------------+
    ```

    Here is the document text:

    ---
    {truncated_text}
    ---
    """
    try:
        response = llm.invoke(prompt_template)
        return response.content
    except Exception as e:
        logger.error(f"An error occurred while calling the AI model: {e}")
        return f"Error generating diagram: {e}"

# --- Document Processing Worker ---
def process_single_document(dir_entry, llm):
    """Processes a single document folder: reads data, generates diagram, returns dict."""
    metadata_path = os.path.join(dir_entry.path, "metadata.json")
    content_path = os.path.join(dir_entry.path, "content.txt")
    html_content_path = os.path.join(dir_entry.path, "page_content.html")

    try:
        with open(metadata_path, 'r', encoding='utf-8') as f:
            metadata_json = json.load(f)
        
        doc_id = metadata_json.get("metadata", {}).get('_id')
        if not doc_id:
            return None # Skip if no ID

        with open(content_path, 'r', encoding='utf-8') as f:
            full_text = f.read()
        
        html_content = ""
        if os.path.exists(html_content_path):
            with open(html_content_path, 'r', encoding='utf-8') as f:
                soup = BeautifulSoup(f.read(), 'html.parser')
                content_div = soup.select_one("div.legislation-page__container")
                if content_div:
                    html_content = str(content_div)

        # This is the slow part - the AI call
        ascii_diagram = generate_ascii_diagram(full_text, llm)

        id_metadata = metadata_json.get("metadata", {})
        diagram_metadata = id_metadata.get("diagram", {})

        return {
            "_id": doc_id,
            "title": metadata_json.get('title', ''),
            "document_number": diagram_metadata.get('so_hieu', ''),
            "document_type": diagram_metadata.get('loai_van_ban', ''),
            "issuer": diagram_metadata.get('noi_ban_hanh', ''),
            "issue_date": diagram_metadata.get('ngay_ban_hanh', ''),
            "status": diagram_metadata.get('tinh_trang', ''),
            "full_text": full_text,
            "html_content": html_content,
            "ascii_diagram": ascii_diagram,
            "source_path": content_path,
        }
    except Exception as e:
        logger.error(f"Failed to process document in {dir_entry.path}: {e}")
        return None

# --- Main Execution Block ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate documents to MongoDB with AI diagram generation.")
    parser.add_argument('--force', action='store_true', help='Force re-migration of all documents.')
    parser.add_argument('--max-workers', type=int, default=5, help='Maximum number of parallel workers for diagram generation.')
    args = parser.parse_args()

    logger.info("--- Starting Document Migration to MongoDB (Parallel) ---")

    if not os.getenv("GOOGLE_API_KEY"):
        logger.error("FATAL: GOOGLE_API_KEY is not set.")
        sys.exit(1)

    # --- Path and DB Configuration ---
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))
    SOURCE_DOCUMENTS_PATH = os.path.join(PROJECT_ROOT, "ai-engine", "data", "raw_data", "documents")
    MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/")
    MONGO_DB_NAME = "vietjusticia"
    MONGO_COLLECTION_NAME = "legal_documents"

    # --- Connect to DB and Find New Documents ---
    logger.info("Connecting to MongoDB...")
    client = MongoClient(MONGO_URL)
    db = client[MONGO_DB_NAME]
    collection = db[MONGO_COLLECTION_NAME]
    logger.info("-> Connected to MongoDB successfully.")

    existing_ids = set()
    if args.force:
        logger.warning("FORCE flag detected. Clearing entire collection before migration.")
        collection.delete_many({})
    else:
        logger.info("Fetching existing document IDs to perform an incremental migration...")
        existing_ids = {doc['_id'] for doc in collection.find({}, {'_id': 1})}
        logger.info(f"-> Found {len(existing_ids)} existing documents.")

    # --- Identify documents that need processing ---
    all_dirs = [d for d in os.scandir(SOURCE_DOCUMENTS_PATH) if d.is_dir()]
    docs_to_process = []
    for dir_entry in all_dirs:
        metadata_path = os.path.join(dir_entry.path, "metadata.json")
        if not os.path.exists(metadata_path):
            continue
        with open(metadata_path, 'r', encoding='utf-8') as f:
            doc_id = json.load(f).get("metadata", {}).get('_id')
        if doc_id and doc_id not in existing_ids:
            docs_to_process.append(dir_entry)

    if not docs_to_process:
        logger.info("No new documents to migrate. Database is up-to-date.")
        client.close()
        sys.exit(0)

    logger.info(f"Found {len(docs_to_process)} new documents to process.")

    # --- Initialize AI Model ---
    logger.info("Initializing AI model (gemini-2.5-flash)...")
    try:
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.2)
    except Exception as e:
        logger.error(f"Failed to initialize AI model: {e}")
        sys.exit(1)

    # --- Process Documents in Parallel ---
    docs_to_migrate = []
    logger.info(f"Generating diagrams in parallel with up to {args.max_workers} workers...")
    with ThreadPoolExecutor(max_workers=args.max_workers) as executor:
        # Create a future for each document processing task
        future_to_doc = {executor.submit(process_single_document, doc_dir, llm): doc_dir for doc_dir in docs_to_process}
        
        # Process futures as they complete, with a progress bar
        for future in tqdm(as_completed(future_to_doc), total=len(docs_to_process), desc="Generating Diagrams"):
            result = future.result()
            if result:
                docs_to_migrate.append(result)

    # --- Bulk Write to MongoDB ---
    if not docs_to_migrate:
        logger.info("No new documents were successfully processed.")
    else:
        logger.info(f"Successfully processed {len(docs_to_migrate)} new documents. Performing bulk upsert...")
        operations = [
            UpdateOne({'_id': doc['_id']}, {'$set': doc}, upsert=True)
            for doc in docs_to_migrate
        ]
        collection.bulk_write(operations)
        logger.info("-> Bulk upsert complete.")

    client.close()
    logger.info("\n--- Document Migration Complete ---")
