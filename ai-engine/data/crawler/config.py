"""
Configuration settings for the web crawler.
Centralizes all constants, environment variables, and configurable settings.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# --- Paths ---
CRAWLER_SCRIPT_DIR = Path(__file__).parent
# OUTPUT_DIR = CRAWLER_SCRIPT_DIR / ".." / "raw_data"
OUTPUT_DIR = CRAWLER_SCRIPT_DIR / ".." / "to-be-upload"

# Load environment variables from .env file in the crawler directory
load_dotenv(CRAWLER_SCRIPT_DIR / ".env")

# --- URLs ---
SITE_BASE_URL = "https://aitracuuluat.vn"
API_BASE_URL = "https://api.aitracuuluat.vn/api/v2/legal-documents"

# --- Authentication ---
BEARER_TOKEN = os.getenv("BEARER_TOKEN")

# --- Browser Settings ---
CHROME_DEBUGGING_PORT = 9222

# --- API Settings ---
API_PAGE_SIZE = 10

# --- Crawler Settings ---
CRAWLER_SETTINGS = {
    'delay_between_requests': 1,  # Delay between tasks (seconds)
    'headless_browser': False,
    'timeout': 240,  # Page load timeout (seconds)
    'max_workers': 5,  # Number of concurrent scraping threads
    'status_filter': None,  # Filter by status (e.g., "Còn hiệu lực", "Hết hiệu lực")
}

# --- CSS Selectors ---
SELECTORS = {
    "document_title": "h1.document-title",
    "document_content_container": "div.legislation-page__container",
}

# --- HTTP Headers ---
DEFAULT_USER_AGENT = (
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
    'AppleWebKit/537.36 (KHTML, like Gecko) '
    'Chrome/128.0.0.0 Safari/537.36'
)

def get_api_headers() -> dict:
    """Returns the headers for API requests."""
    if not BEARER_TOKEN:
        raise ValueError("BEARER_TOKEN not set in environment variables.")
    return {
        "Authorization": f"Bearer {BEARER_TOKEN}",
        "User-Agent": DEFAULT_USER_AGENT,
    }
