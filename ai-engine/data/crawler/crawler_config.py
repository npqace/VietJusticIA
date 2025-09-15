"""
Configuration file for the Thu Vien Phap Luat Crawler.
"""
from pathlib import Path

# --- Base Configuration ---
BASE_URL = "https://thuvienphapluat.vn"
SEARCH_PAGE_URL_P1 = "https://thuvienphapluat.vn/page/tim-van-ban.aspx?keyword=&match=True&area=0"
SEARCH_PAGE_URL_PN = "https://thuvienphapluat.vn/page/tim-van-ban.aspx?keyword=&area=0&match=True&page={page_num}"

# --- Output Directories ---
OUTPUT_DIR = Path("../raw_data")
DOCUMENTS_DIR = OUTPUT_DIR / "documents"
LOGS_DIR = OUTPUT_DIR / "logs"
DEBUG_DIR = OUTPUT_DIR / "debug"

# --- Request Headers ---
REQUEST_HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en,en-US;q=0.9,vi;q=0.8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
}

# --- Crawler Settings ---
CRAWLER_SETTINGS = {
    'delay_between_requests': 2,
    'headless_browser': False,
    'timeout': 120
}

# --- CSS Selectors (FINAL, CORRECTED VERSION) ---
SELECTORS = {
    "search_results_list": "div.content-0",  # Wait for this container of all results
    "document_link": "p.nqTitle a", # Corrected from nq-title to nqTitle
    "document_content_container": "div.content1",
    "document_metadata_container": "div#divThuocTinh",
    "metadata_item": "li",
    "metadata_key": "b"
}