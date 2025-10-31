"""
Core web-scraping logic for aitracuuluat.vn.
This version uses the API to get document metadata and Playwright to scrape content.

NOTE ON COMPLIANCE: This scraper is designed to be respectful of the target website
by adhering to its robots.txt file and implementing rate limiting. However, developers
must ensure that the use of this scraper and the data it collects complies with all
applicable laws, including Vietnam's Personal Data Protection Law (PDPL). This may
involve handling data responsibly, not collecting personal information, and ensuring
the purpose of data collection is legitimate.
"""
import json
import re
import logging
import time
import argparse
import os
import io
import threading
from pathlib import Path
from dotenv import load_dotenv
import requests
import pandas as pd
from bs4 import BeautifulSoup, Tag
from playwright.sync_api import sync_playwright, Browser, BrowserContext
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.robotparser import RobotFileParser
import backoff

# --- Configuration --
load_dotenv()
CHROME_DEBUGGING_PORT = 9222
SITE_BASE_URL = "https://aitracuuluat.vn"
API_BASE_URL = "https://api.aitracuuluat.vn/api/v2/legal-documents"
BEARER_TOKEN = os.getenv("AUTH_TOKEN")
CRAWLER_SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = CRAWLER_SCRIPT_DIR / ".." / "raw_data"
API_PAGE_SIZE = 10

CRAWLER_SETTINGS = {
    'delay_between_requests': 1, # This will be used between tasks, not in the main loop
    'headless_browser': False,
    'timeout': 240,
    'max_workers': 5, # Number of concurrent scraping threads
    'status_filter': None, # Filter documents by status (e.g., "Còn hiệu lực", "Hết hiệu lực")
}

SELECTORS = {
    "document_title": "h1.document-title",
    "document_content_container": "div.legislation-page__container",
}

class Crawler:
    def __init__(self, output_dir: Path | None = None):
        self.output_dir = output_dir or OUTPUT_DIR
        self.documents_dir = self.output_dir / "documents"
        self.logs_dir = self.output_dir / "logs"
        self.debug_dir = self.output_dir / "debug"
        self.logger = self._setup_logger()
        self.debug_dir.mkdir(parents=True, exist_ok=True)
        if not BEARER_TOKEN:
            self.logger.critical("BEARER_TOKEN not found. Please set AUTH_TOKEN in your .env file.")
            raise ValueError("AUTH_TOKEN not set.")
        self.api_headers = {
            "Authorization": f"Bearer {BEARER_TOKEN}",
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
        }
        # Thread-safe counters
        self.scraped_count = 0
        self.scraped_lock = threading.Lock()
        self.category = None
        self.shutdown_event = threading.Event()

        # Robots.txt parser
        self.robot_parser = RobotFileParser()
        robots_url = f"{SITE_BASE_URL}/robots.txt"
        self.robot_parser.set_url(robots_url)
        try:
            # Fetch robots.txt using requests to ensure our User-Agent is used.
            response = requests.get(robots_url, headers={'User-Agent': self.api_headers['User-Agent']}, timeout=15)
            if response.status_code == 200:
                self.robot_parser.parse(response.text.splitlines())
                self.logger.info("Successfully read and parsed robots.txt")
            else:
                self.logger.warning(f"Failed to fetch robots.txt, received status {response.status_code}. Crawler will proceed assuming no restrictions.")

        except requests.exceptions.RequestException as e:
            self.logger.error(f"Could not read robots.txt: {e}. Crawler will proceed assuming no restrictions.")

    def _setup_logger(self):
        """Sets up a logger that outputs formatted messages to both console and a file."""
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        logger = logging.getLogger('crawler_logger')
        logger.setLevel(logging.INFO)

        if logger.hasHandlers():
            return logger

        class CustomFormatter(logging.Formatter):
            GREY, YELLOW, RED, BOLD_RED, BLUE, RESET = "\x1b[38;20m", "\x1b[33;20m", "\x1b[31;20m", "\x1b[31;1m", "\x1b[34;20m", "\x1b[0m"
            
            def __init__(self, fmt):
                super().__init__()
                self.fmt = fmt
                self.FORMATS = {
                    logging.DEBUG: self.GREY + self.fmt + self.RESET,
                    logging.INFO: self.BLUE + self.fmt + self.RESET,
                    logging.WARNING: self.YELLOW + self.fmt + self.RESET,
                    logging.ERROR: self.RED + self.fmt + self.RESET,
                    logging.CRITICAL: self.BOLD_RED + self.fmt + self.RESET
                }

            def format(self, record):
                log_fmt = self.FORMATS.get(record.levelno)
                formatter = logging.Formatter(log_fmt)
                return formatter.format(record)

        console_handler = logging.StreamHandler()
        console_handler.setFormatter(CustomFormatter(" %(levelname)s - %(message)s"))
        logger.addHandler(console_handler)

        file_handler = logging.FileHandler(self.logs_dir / "crawler.log", encoding="utf-8")
        file_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
        logger.addHandler(file_handler)

        return logger

    def _is_allowed(self, url: str) -> bool:
        """Checks if the given URL is allowed to be fetched by the crawler."""
        return self.robot_parser.can_fetch(self.api_headers['User-Agent'], url)

    @backoff.on_exception(backoff.expo, requests.exceptions.RequestException, max_tries=5, factor=2)
    def _get_docs_from_api(self, page_num: int) -> tuple[list, int]:
        """Fetches a page of documents from the API."""
        params = {"page": page_num, "pageSize": API_PAGE_SIZE}
        if self.category:
            params["linh_vuc_nganh"] = self.category
        if CRAWLER_SETTINGS['status_filter']:
            params['tinh_trang'] = CRAWLER_SETTINGS['status_filter']

        try:
            response = requests.get(API_BASE_URL, headers=self.api_headers, params=params, timeout=60)
            response.raise_for_status()
            data = response.json()
            docs = data.get("data", [])
            total_docs = data.get("metadata", {}).get("total", 0)
            self.logger.info(f"API call for page {page_num} successful. Found {len(docs)} documents.")
            return docs, total_docs
        except requests.exceptions.RequestException as e:
            self.logger.error(f"API request for page {page_num} failed: {e}")
            return [], 0

    @backoff.on_exception(backoff.expo, requests.exceptions.RequestException, max_tries=3, factor=2)
    def _get_full_metadata_from_api(self, doc_id: str) -> dict | None:
        """Fetches the full metadata for a single document from the API."""
        metadata_url = f"{API_BASE_URL}/{doc_id}"
        self.logger.info(f"Fetching full metadata from {metadata_url}")
        try:
            response = requests.get(metadata_url, headers=self.api_headers, timeout=60)
            response.raise_for_status()
            data = response.json()
            full_metadata = data.get("data", {})
            self.logger.info(f"Successfully fetched full metadata for doc ID {doc_id}.")
            return full_metadata
        except requests.exceptions.RequestException as e:
            self.logger.error(f"API request for full metadata of doc ID {doc_id} failed: {e}")
            return None

    def _extract_content_text(self, content_element: Tag | None) -> str:
        """Extracts and formats text from the content container, handling paragraphs, tables, and line breaks."""
        if not content_element: return ""
        for br in content_element.find_all("br"): br.replace_with("\n")
        text_blocks = []
        for element in content_element.find_all(['p', 'table']):
            if element.name == 'table':
                try:
                    df_list = pd.read_html(io.StringIO(str(element)), header=None, flavor='bs4')
                    if df_list:
                        table_text = df_list[0].to_string(header=False, index=False, na_rep='')
                        text_blocks.append(table_text)
                except Exception as e:
                    self.logger.warning(f"Pandas could not parse a table, falling back. Error: {e}")
                    text_blocks.append('\n'.join('\t'.join(cell.get_text(strip=True) for cell in row.find_all(['td', 'th'])) for row in element.find_all('tr')))
            else:
                p_text = ' '.join(element.get_text().split())
                if p_text: text_blocks.append(p_text)
        return '\n\n'.join(text_blocks)

    def _scrape_document_content(self, doc_api_data: dict, browser_context: BrowserContext, doc_number: int) -> dict | None:
        """Scrapes the full text content of a single document page in a new tab."""
        doc_id = doc_api_data.get("id")
        if not doc_id:
            self.logger.error(f"Document data from API is missing 'id' for doc number {doc_number}.")
            return None

        content_url = f"{SITE_BASE_URL}/legal-documents/{doc_id}?tab=noi_dung"
        
        if not self._is_allowed(content_url):
            self.logger.warning(f"Scraping disallowed for {content_url} by robots.txt. Skipping.")
            return None

        page = browser_context.new_page()
        try:
            self.logger.info(f"[Thread] Navigating to: {content_url}")
            page.goto(content_url, wait_until='domcontentloaded', timeout=CRAWLER_SETTINGS['timeout'] * 1000)
            page.wait_for_selector(SELECTORS["document_content_container"], timeout=50000)
            
            html_content = page.content()
            screenshot_bytes = page.screenshot(full_page=True)
            soup = BeautifulSoup(html_content, 'html.parser')
            
            main_content_element = soup.select_one(SELECTORS["document_content_container"])
            main_content = self._extract_content_text(main_content_element)
            title_text = doc_api_data.get("diagram", {}).get("ten", "Untitled Document")

            return {
                "title": title_text, "content": main_content, "url": content_url,
                "raw_html": html_content, "screenshot_bytes": screenshot_bytes
            }
        except Exception as e:
            self.logger.error(f"Failed to scrape content for doc {doc_number} ({content_url}): {e}")
            return None
        finally:
            page.close()

    def save_data(self, full_metadata: dict, content_data: dict, doc_number: int, max_docs: int | None, current_scraped_count: int):
        """Saves document data, combining API metadata and scraped content."""
        try:
            title = content_data['title']
            folder_name = re.sub(r'[\\/*?:"<>|]', "", title)[:100].strip()
            doc_folder = self.documents_dir / folder_name
            doc_folder.mkdir(parents=True, exist_ok=True)
            
            (doc_folder / "page_content.html").write_text(content_data["raw_html"], encoding='utf-8')
            (doc_folder / "screenshot.png").write_bytes(content_data["screenshot_bytes"])
            (doc_folder / "content.txt").write_text(content_data.get('content', ''), encoding='utf-8')
            
            metadata_to_save = {
                "title": title,
                "metadata": full_metadata,
                "url": content_data.get("url", "")
            }
            with open(doc_folder / "metadata.json", 'w', encoding='utf-8') as f:
                json.dump(metadata_to_save, f, ensure_ascii=False, indent=4)
            
            progress = f"({current_scraped_count}/{max_docs})" if max_docs else f"({doc_number})"
            self.logger.info(f"[SUCCESS] {progress} Saved: {folder_name}")
        except Exception as e:
            self.logger.error(f"[FAILURE] Failed to save data for {content_data.get('title', 'Unknown')}: {e}")

    def _get_crawl_delay(self) -> int:
        """Gets the crawl delay from robots.txt, defaulting to our setting."""
        user_agent = self.api_headers['User-Agent']
        crawl_delay = self.robot_parser.crawl_delay(user_agent)
        
        # Check if crawl_delay is None or not a number, which can happen.
        if crawl_delay and isinstance(crawl_delay, (int, float)):
            self.logger.info(f"robots.txt specifies Crawl-Delay of {crawl_delay} seconds.")
            # Ensure our base delay is at least as long as the specified one
            return max(crawl_delay, CRAWLER_SETTINGS['delay_between_requests'])
        
        return CRAWLER_SETTINGS['delay_between_requests']

    def _scrape_and_save_worker(self, api_data: dict, doc_number: int, max_docs: int | None):
        """Worker function for a thread to scrape and save a single document."""
        if self.shutdown_event.is_set(): return

        # --- Politeness: Apply delay before starting ---
        delay = self._get_crawl_delay()
        if delay > 0:
            self.logger.info(f"Waiting for {delay}s as per crawl delay policy.")
            time.sleep(delay)

        doc_id = api_data.get('id')
        if not doc_id:
            self.logger.error(f"API data for doc {doc_number} is missing an 'id'.")
            return

        # Atomically check the limit and reserve a slot BEFORE any network calls.
        current_scraped_count = 0
        with self.scraped_lock:
            if max_docs and self.scraped_count >= max_docs:
                return 'skipped' # Silently skip, the main loop will log the final message.
            # Reserve a slot for this document
            if max_docs:
                self.scraped_count += 1
                current_scraped_count = self.scraped_count

        self.logger.info(f"Starting task for doc {doc_number} (ID: {doc_id})")

        full_metadata = self._get_full_metadata_from_api(doc_id)
        if self.shutdown_event.is_set(): return

        if not full_metadata:
            self.logger.error(f"Could not retrieve full metadata for doc ID {doc_id}. Skipping.")
            # Release the reserved slot if metadata fetch fails
            if max_docs:
                with self.scraped_lock: self.scraped_count -= 1
            return

        # Ensure the full metadata object has the 'id' for the scraper function,
        # as the detail API might not return it at the top level.
        if 'id' not in full_metadata:
            full_metadata['id'] = doc_id

        try:
            if self.shutdown_event.is_set(): return
            with sync_playwright() as p:
                browser = p.chromium.connect_over_cdp(f"http://localhost:{CHROME_DEBUGGING_PORT}")
                context = browser.contexts[0]
                try:
                    content_data = self._scrape_document_content(full_metadata, context, doc_number=doc_number)
                    if content_data:
                        self.save_data(full_metadata, content_data, doc_number=doc_number, max_docs=max_docs, current_scraped_count=current_scraped_count)
                        return 'processed'
                    else: # Scraping failed, release the slot
                        if max_docs:
                            with self.scraped_lock: self.scraped_count -= 1
                finally:
                    browser.close()
        except Exception as e:
            if not self.shutdown_event.is_set():
                self.logger.error(f"An error occurred in the worker for {doc_id}: {e}", exc_info=False)
            # Release the slot on any exception
            if max_docs:
                with self.scraped_lock: self.scraped_count -= 1

    def run(self, max_pages: int | None, max_docs: int | None):
        """Fetches document metadata from the API and scrapes content concurrently."""
        # Reset thread-safe counter
        self.scraped_count = 0
        filtered_docs_count = 0
        processed_docs_count = 0  # Count of documents processed (fetched from API)
        
        page_num = 1
        total_docs = -1

        try:
            with ThreadPoolExecutor(max_workers=CRAWLER_SETTINGS['max_workers']) as executor:
                while True:
                    if self.shutdown_event.is_set():
                        self.logger.info("Shutdown signal received, stopping API requests.")
                        break

                    if max_pages and page_num > max_pages:
                        self.logger.info(f"Reached max page limit of {max_pages}. Stopping.")
                        break

                    if max_docs and self.scraped_count >= max_docs:
                        self.logger.info(f"Reached scraped document limit of {max_docs}. Not fetching more pages.")
                        break
                    
                    self.logger.info(f"--- Fetching API Page {page_num} ---")
                    docs_from_api, api_total_docs = self._get_docs_from_api(page_num)

                    if total_docs == -1:
                        if api_total_docs == 0:
                            self.logger.warning("API returned 0 total documents. Stopping.")
                            break
                        total_docs = api_total_docs
                        self.logger.info(f"API reports a total of {total_docs} documents in this category.")

                    if not docs_from_api:
                        self.logger.info("No more documents from API. Stopping.")
                        break

                    futures = []
                    for api_data in docs_from_api:
                        if max_docs and self.scraped_count >= max_docs:
                            break
                        
                        future = executor.submit(self._scrape_and_save_worker, api_data, processed_docs_count + 1, max_docs)
                        futures.append(future)
                        processed_docs_count += 1

                    # Wait for the batch of tasks for the current API page to complete
                    for future in as_completed(futures):
                        try:
                            result = future.result()  # Get the result from worker
                            if result == 'filtered':
                                filtered_docs_count += 1
                            elif result == 'skipped':
                                pass  # Already logged in worker
                        except Exception as e:
                            self.logger.error(f"A task generated an exception: {e}")
                    
                    self.logger.info(f"--- Finished processing API Page {page_num} ---")
                    page_num += 1
        except KeyboardInterrupt:
            self.logger.info("\nShutdown signal received. Telling workers to stop...")
            self.shutdown_event.set()
            # The ThreadPoolExecutor's context manager will handle shutting down threads.
        
        self.logger.info("Crawler finished.")

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description="API-based scraper for aitracuuluat.vn. Can filter by category.",
        formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument('--max-docs', type=int, default=None, help='Maximum number of total documents to scrape.')
    parser.add_argument('--max-pages', type=int, default=None, help='Maximum number of API pages to fetch.')
    parser.add_argument('--status-filter', type=str, default='Còn hiệu lực', help='Filter documents by status (e.g., "Còn hiệu lực", "Hết hiệu lực").')
    parser.add_argument('--category', type=str, default=None, help='Specify a category to scrape (e.g., "Giáo dục"). Scrapes all if not specified.')
    args = parser.parse_args()
    return args

if __name__ == "__main__":
    args = parse_arguments()
    crawler = Crawler()
    try:
        # Update crawler settings with command line arguments
        if args.status_filter:
            CRAWLER_SETTINGS['status_filter'] = args.status_filter
            crawler.logger.info(f"Status filter enabled: '{args.status_filter}'")
        
        if args.category:
            crawler.category = args.category
            crawler.logger.info(f"Category filter enabled: '{args.category}'")
        else:
            crawler.logger.info("No category specified, scraping all categories.")
        
        crawler.run(max_pages=args.max_pages, max_docs=args.max_docs)
    except KeyboardInterrupt:
        crawler.logger.info("Crawler stopped by user.")
    except Exception as e:
        crawler.logger.critical(f"[CRITICAL ERROR] An unexpected error occurred: {e}")
        crawler.logger.critical("   Please ensure Chrome is running with debugging and your .env file is set up.")
