import os
import sys
import json
import logging
import argparse
import backoff
import asyncio
import time
import signal
from concurrent.futures import ThreadPoolExecutor, as_completed
from pymongo import MongoClient, UpdateOne
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from tqdm import tqdm

# --- Setup ---
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

# Load environment variables
# First try ai-engine/.env (for local runs), then fall back to root .env
ai_engine_env = os.path.join(os.path.dirname(__file__), '..', '.env')
if os.path.exists(ai_engine_env):
    load_dotenv(ai_engine_env)
else:
    load_dotenv()  # Load from root .env

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    from google.api_core.exceptions import ResourceExhausted
except ImportError:
    print("ERROR: Required Google AI libraries are not installed. Please check your requirements.")
    sys.exit(1)

# Import rate limiter from backend
# Note: Pylance may show import error, but this is resolved at runtime via sys.path manipulation
try:
    backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))
    sys.path.insert(0, backend_path)
    from app.utils.rate_limiter import GeminiRateLimiter  # type: ignore
    RATE_LIMITER_AVAILABLE = True
except ImportError:
    logger_warning = "WARNING: Rate limiter not available. Will use backoff only."
    RATE_LIMITER_AVAILABLE = False

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Global shutdown flag for Ctrl+C handling ---
shutdown_requested = False

def signal_handler(signum, frame):
    """Handle Ctrl+C gracefully."""
    global shutdown_requested
    if not shutdown_requested:
        shutdown_requested = True
        logger.info("\n[SHUTDOWN] Ctrl+C detected. Finishing current documents and shutting down gracefully...")
        logger.info("[SHUTDOWN] Press Ctrl+C again to force quit (may lose progress)")
    else:
        logger.warning("[SHUTDOWN] Force quit requested. Exiting immediately...")
        sys.exit(1)

# --- API Key Pool Management ---
class APIKeyPool:
    """Manages multiple API keys for rotation when needed."""

    def __init__(self):
        self.keys = self._discover_keys()
        self.current_index = 0
        self.rate_limiters = {}

        if RATE_LIMITER_AVAILABLE:
            for key in self.keys:
                self.rate_limiters[key] = GeminiRateLimiter(
                    requests_per_minute=12,
                    requests_per_day=1200,
                    burst_allowance=1.0
                )

        if len(self.keys) > 1:
            logger.info(f"Key pool initialized with {len(self.keys)} keys, rotation enabled")
        else:
            logger.info("Key pool initialized in single key mode, no rotation")

    def _discover_keys(self):
        """Discover all available migration API keys."""
        keys = []

        # Check for numbered keys (rotation mode)
        i = 1
        while True:
            key = os.getenv(f"GOOGLE_API_KEY_MIGRATION_{i}")
            if key:
                keys.append(key)
                i += 1
            else:
                break

        # If no numbered keys, check for single migration key
        if not keys:
            single_key = os.getenv("GOOGLE_API_KEY_MIGRATION")
            if single_key:
                keys.append(single_key)

        return keys if keys else None

    def get_current_key(self):
        """Get current active key."""
        if not self.keys:
            return None
        return self.keys[self.current_index]

    def get_key_by_index(self, index: int):
        """Get key by index (for parallel worker distribution)."""
        if not self.keys:
            return None
        return self.keys[index % len(self.keys)]

    def get_rate_limiter(self):
        """Get rate limiter for current key."""
        if not RATE_LIMITER_AVAILABLE or not self.keys:
            return None
        return self.rate_limiters.get(self.get_current_key())

    def get_rate_limiter_for_key(self, key: str):
        """Get rate limiter for specific key."""
        if not RATE_LIMITER_AVAILABLE or not self.keys:
            return None
        return self.rate_limiters.get(key)

    async def rotate_if_needed(self):
        """Rotate to next key if current is approaching limit."""
        if not self.keys or len(self.keys) == 1:
            return False

        rate_limiter = self.get_rate_limiter()
        if not rate_limiter:
            return False

        stats = rate_limiter.get_stats()

        # Rotate at 90% daily usage
        if stats['requests_today'] >= stats['rpd_limit'] * 0.9:
            old_index = self.current_index
            self.current_index = (self.current_index + 1) % len(self.keys)

            logger.info(f"[KEY_ROTATION] Switching from Key {old_index + 1} to Key {self.current_index + 1}")
            logger.info(f"[KEY_ROTATION] Reason: Key {old_index + 1} at {stats['requests_today']}/{stats['rpd_limit']} requests")
            return True

        return False

    def get_all_key_stats(self):
        """Get statistics for all keys in the pool."""
        if not RATE_LIMITER_AVAILABLE or not self.keys:
            return None

        all_stats = []
        total_requests = 0
        for i, key in enumerate(self.keys):
            limiter = self.rate_limiters.get(key)
            if limiter:
                stats = limiter.get_stats()
                key_suffix = key[-8:] if len(key) > 8 else key  # Show last 8 chars
                all_stats.append({
                    'index': i + 1,
                    'key_suffix': key_suffix,
                    'requests': stats['requests_today'],
                    'limit': stats['rpd_limit']
                })
                total_requests += stats['requests_today']

        return {
            'keys': all_stats,
            'total_requests': total_requests,
            'total_keys': len(self.keys)
        }

# Global key pool (will be initialized in main block)
key_pool: 'APIKeyPool | None' = None

# --- Date Conversion Utility ---
def convert_date_to_iso(date_str: str) -> str:
    """
    Converts date from dd/mm/yyyy format to yyyy-mm-dd ISO format.
    Returns empty string if conversion fails or input is empty.

    Args:
        date_str: Date string in dd/mm/yyyy format

    Returns:
        Date string in yyyy-mm-dd format, or empty string if invalid
    """
    if not date_str or not isinstance(date_str, str):
        return ''

    try:
        parts = date_str.strip().split('/')
        if len(parts) != 3:
            return ''

        day, month, year = parts
        # Validate basic ranges
        if len(year) != 4 or len(month) > 2 or len(day) > 2:
            return ''

        # Return ISO format: yyyy-mm-dd
        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
    except:
        logger.warning(f"Failed to convert date: {date_str}")
        return ''

# --- AI Diagram Generation with Rate Limit Handling ---
@backoff.on_exception(backoff.expo, ResourceExhausted, max_tries=5, factor=2)
def generate_ascii_diagram(text: str, llm, worker_key: str = None) -> str:
    """Generates an ASCII diagram by calling a generative AI model, with exponential backoff on rate limit errors."""
    if not text:
        return "Document text is empty. Cannot generate diagram."
    max_chars = 20000
    truncated_text = text[:max_chars]
    prompt_template = f"""
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
    try:
        # Check rate limiting for worker-specific key
        if key_pool and worker_key:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            # Wait for rate limiter permission for this specific key
            rate_limiter = key_pool.get_rate_limiter_for_key(worker_key)
            if rate_limiter:
                acquired = loop.run_until_complete(rate_limiter.wait_if_needed(max_wait_seconds=120.0))
                if not acquired:
                    loop.close()
                    logger.warning(f"[RATE_LIMIT] Timeout after 120s for worker key. May have hit daily quota")
                    return "Rate limit exceeded. Diagram generation skipped."

            loop.close()

        response = llm.invoke(prompt_template)
        return response.content
    except Exception as e:
        logger.error(f"An error occurred while calling the AI model: {e}")
        return f"Error generating diagram: {e}"

# --- Document Processing Worker ---
def process_single_document(dir_entry, llm, worker_key: str = None):
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
        ascii_diagram = generate_ascii_diagram(full_text, llm, worker_key)

        id_metadata = metadata_json.get("metadata", {})
        diagram_metadata = id_metadata.get("diagram", {})

        # --- Robustly Process "van_ban_lien_quan_cung_noi_dung" ---
        related_documents = []
        # Safely get the related_documents object, mirroring build_vector_store.py
        related_docs_object = diagram_metadata.get("related_documents")

        if related_docs_object and isinstance(related_docs_object, dict):
            # Specifically target the desired list, default to an empty list
            doc_list = related_docs_object.get("van_ban_lien_quan_cung_noi_dung", [])
            
            # Ensure the item is a list before iterating
            if isinstance(doc_list, list):
                for doc in doc_list:
                    # CRITICAL: Check if the doc is a valid dictionary and not None
                    if isinstance(doc, dict):
                        # Convert related document dates to ISO format as well
                        related_issue_date = convert_date_to_iso(doc.get("ngay_ban_hanh", ''))
                        related_documents.append({
                            "doc_id": doc.get("_id"),
                            "title": doc.get("ten"),
                            "issue_date": related_issue_date,
                            "status": doc.get("tinh_trang")
                        })

        # Convert dates to ISO format (yyyy-mm-dd) for better querying
        issue_date_raw = diagram_metadata.get('ngay_ban_hanh', '')
        effective_date_raw = diagram_metadata.get('ngay_hieu_luc', '')
        publish_date_raw = diagram_metadata.get('ngay_dang', '')

        return {
            "_id": doc_id,
            "title": metadata_json.get('title', ''),
            "document_number": diagram_metadata.get('so_hieu', ''),
            "document_type": diagram_metadata.get('loai_van_ban', ''),
            "category": diagram_metadata.get('linh_vuc_nganh', ''),
            "issuer": diagram_metadata.get('noi_ban_hanh', ''),
            "signatory": diagram_metadata.get('nguoi_ky', ''),
            "gazette_number": diagram_metadata.get('so_cong_bao', ''),
            "issue_date": convert_date_to_iso(issue_date_raw),
            "effective_date": convert_date_to_iso(effective_date_raw),
            "publish_date": convert_date_to_iso(publish_date_raw),
            "status": diagram_metadata.get('tinh_trang', ''),
            "full_text": full_text,
            "html_content": html_content,
            "ascii_diagram": ascii_diagram,
            "related_documents": related_documents, # Add the cleaned list
            "source_path": content_path,
        }
    except Exception as e:
        logger.error(f"Failed to process document in {dir_entry.path}: {e}")
        return None

# --- Main Execution Block ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate documents to MongoDB with AI diagram generation (Free Tier Optimized).")
    parser.add_argument('--force', action='store_true', help='Force re-migration of all documents.')
    parser.add_argument('--max-workers', type=int, default=8, help='Maximum number of parallel workers (default: 8 with multi-key, 2 workers per key).')
    parser.add_argument('--max-docs', type=int, help='Limit number of documents to process in this run (useful for daily quota management).')
    args = parser.parse_args()

    # Register signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)

    logger.info("--- Starting Document Migration to MongoDB (Free Tier Optimized) ---")

    # Initialize key pool (automatically handles 1, 2, or multiple keys)
    key_pool = APIKeyPool()

    # Get rate limiter for current key
    rate_limiter = key_pool.get_rate_limiter()

    # If no migration keys found, use main key
    if not key_pool.keys:
        if not os.getenv("GOOGLE_API_KEY"):
            logger.error("FATAL: No API keys found. Set GOOGLE_API_KEY or GOOGLE_API_KEY_MIGRATION.")
            sys.exit(1)
        logger.warning("[CONFIG] Using shared API key (GOOGLE_API_KEY)")
        logger.warning("[CONFIG] Consider setting GOOGLE_API_KEY_MIGRATION for production")
    else:
        # Calculate total capacity
        total_capacity = len(key_pool.keys) * 1200
        if len(key_pool.keys) > 1:
            logger.info(f"[CAPACITY] Total daily capacity: {total_capacity} documents ({len(key_pool.keys)} key(s) x 1200)")

        # Set current key
        current_key = key_pool.get_current_key()
        if current_key:
            os.environ["GOOGLE_API_KEY"] = current_key

    # Warn if using too many workers relative to number of keys
    if key_pool.keys:
        max_recommended_workers = len(key_pool.keys) * 2  # 2 workers per key
        if args.max_workers > max_recommended_workers:
            logger.warning(f"[RATE_LIMIT] Using {args.max_workers} workers with {len(key_pool.keys)} key(s) may exceed rate limits")
            logger.warning(f"[RATE_LIMIT] Recommended: {max_recommended_workers} workers (2 per key). Each key has 15 RPM limit")
            response = input("Continue anyway? (y/n): ")
            if response.lower() != 'y':
                logger.info("Migration cancelled by user.")
                sys.exit(0)

        if len(key_pool.keys) > 1:
            logger.info(f"[WORKERS] Parallel key distribution: {args.max_workers} workers across {len(key_pool.keys)} keys")
            logger.info(f"[WORKERS] Approximate: {args.max_workers // len(key_pool.keys)}-{(args.max_workers // len(key_pool.keys)) + 1} workers per key")

    # --- Path and DB Configuration ---
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))
    SOURCE_DOCUMENTS_PATH = os.path.join(PROJECT_ROOT, "ai-engine", "data", "raw_data", "documents")
    MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/")
    MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "vietjusticia")
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
        logger.info("[MIGRATION] No new documents to migrate. Database is up-to-date")
        client.close()
        sys.exit(0)

    total_new_docs = len(docs_to_process)
    logger.info(f"[MIGRATION] Found {total_new_docs} new documents to process")

    # Apply max-docs limit if specified
    if args.max_docs and args.max_docs < len(docs_to_process):
        docs_to_process = docs_to_process[:args.max_docs]
        logger.info(f"[CONFIG] Limiting to {args.max_docs} documents as requested")
        logger.info(f"[CONFIG] {total_new_docs - args.max_docs} documents will remain for next run")

    # Calculate and display time estimate
    estimated_seconds_per_doc = 5  # Conservative estimate with rate limiting
    estimated_total_minutes = (len(docs_to_process) * estimated_seconds_per_doc) / 60
    logger.info(f"[ESTIMATE] Processing time: ~{estimated_total_minutes:.1f} minutes ({estimated_total_minutes/60:.2f} hours)")

    # Check rate limiter quota
    if rate_limiter:
        rate_stats = rate_limiter.get_stats()
        remaining_today = rate_stats['rpd_remaining']
        logger.info(f"[QUOTA] Daily quota: {rate_stats['requests_today']}/{rate_stats['rpd_limit']} used, {remaining_today} remaining")

        if len(docs_to_process) > remaining_today:
            logger.warning(f"[QUOTA] WARNING: {len(docs_to_process)} documents exceeds today's remaining quota ({remaining_today})")
            logger.warning(f"[QUOTA] Recommendation: Use --max-docs {remaining_today} to stay within limits")
            logger.warning(f"[QUOTA] Or continue and resume tomorrow with: python {os.path.basename(__file__)}")
            response = input("Continue anyway? (y/n): ")
            if response.lower() != 'y':
                logger.info("Migration cancelled by user.")
                logger.info(f"To process within quota: python {os.path.basename(__file__)} --max-docs {remaining_today}")
                sys.exit(0)

    # --- Initialize AI Models (one per key for parallel distribution) ---
    logger.info("Initializing AI models (gemini-2.0-flash)...")
    llm_pool = []
    try:
        if key_pool.keys and len(key_pool.keys) > 1:
            # Create one LLM instance per key
            for i, key in enumerate(key_pool.keys):
                os.environ["GOOGLE_API_KEY"] = key
                llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0.2)
                llm_pool.append((llm, key))
            logger.info(f"[INIT] Created {len(llm_pool)} LLM instances for parallel processing")
            # Reset to first key
            os.environ["GOOGLE_API_KEY"] = key_pool.keys[0]
        else:
            # Single key mode - create one LLM
            llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0.2)
            current_key = key_pool.get_current_key() if key_pool.keys else os.getenv("GOOGLE_API_KEY")
            llm_pool.append((llm, current_key))
    except Exception as e:
        logger.error(f"Failed to initialize AI model: {e}")
        sys.exit(1)

    # --- Process Documents in Parallel ---
    docs_to_migrate = []
    start_time = time.time()
    logger.info(f"[PROCESSING] Generating diagrams with {args.max_workers} worker(s)")

    with ThreadPoolExecutor(max_workers=args.max_workers) as executor:
        # Create futures with round-robin LLM assignment
        future_to_doc = {}
        for i, doc_dir in enumerate(docs_to_process):
            # Round-robin: assign LLM based on document index
            llm, worker_key = llm_pool[i % len(llm_pool)]
            future = executor.submit(process_single_document, doc_dir, llm, worker_key)
            future_to_doc[future] = doc_dir

        # Process futures as they complete, with a progress bar
        for future in tqdm(as_completed(future_to_doc), total=len(docs_to_process), desc="Generating Diagrams"):
            # Check for graceful shutdown
            if shutdown_requested:
                logger.info(f"[SHUTDOWN] Stopping after processing {len(docs_to_migrate)} documents")
                break

            result = future.result()
            if result:
                docs_to_migrate.append(result)

            # Periodically log aggregate stats across all keys
            if RATE_LIMITER_AVAILABLE and len(docs_to_migrate) % 10 == 0 and len(docs_to_migrate) > 0:
                all_stats = key_pool.get_all_key_stats()
                if all_stats:
                    logger.info(f"[PROGRESS] {len(docs_to_migrate)}/{len(docs_to_process)} docs | "
                               f"Total requests: {all_stats['total_requests']} across {all_stats['total_keys']} key(s)")

    elapsed_time = time.time() - start_time
    if shutdown_requested:
        logger.info(f"[PROCESSING] Partially completed in {elapsed_time/60:.1f} minutes (shutdown requested)")
        logger.info(f"[PROCESSING] Processed {len(docs_to_migrate)} out of {len(docs_to_process)} documents")
    else:
        logger.info(f"[PROCESSING] Completed in {elapsed_time/60:.1f} minutes ({elapsed_time/3600:.2f} hours)")

    # --- Final Rate Limiter Stats ---
    all_stats = None
    if RATE_LIMITER_AVAILABLE and key_pool.keys:
        all_stats = key_pool.get_all_key_stats()
        if all_stats:
            logger.info("[STATS] Final API usage summary:")
            logger.info(f"[STATS] Total requests across all keys: {all_stats['total_requests']}")
            logger.info(f"[STATS] Total keys used: {all_stats['total_keys']}")

            if len(all_stats['keys']) > 1:
                logger.info("[STATS] Per-key breakdown:")
                for key_stat in all_stats['keys']:
                    logger.info(f"[STATS]   Key {key_stat['index']} (...{key_stat['key_suffix']}): "
                               f"{key_stat['requests']}/{key_stat['limit']} requests")
            else:
                # Single key - show remaining quota
                key_stat = all_stats['keys'][0]
                remaining = key_stat['limit'] - key_stat['requests']
                logger.info(f"[STATS] Remaining quota for today: {remaining} requests")

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

    # Show continuation command if there are more documents
    if args.max_docs and total_new_docs > args.max_docs:
        remaining_docs = total_new_docs - args.max_docs
        logger.info(f"\n[INFO] {remaining_docs} documents remaining")
        if RATE_LIMITER_AVAILABLE and key_pool.keys and all_stats:
            # Calculate total remaining quota across all keys
            total_remaining = sum(key_stat['limit'] - key_stat['requests']
                                 for key_stat in all_stats['keys'])
            suggested_batch = min(remaining_docs, total_remaining)
            logger.info(f"[INFO] To continue: python {os.path.basename(__file__)} --max-docs {suggested_batch}")
        else:
            logger.info(f"[INFO] To continue: python {os.path.basename(__file__)}")
