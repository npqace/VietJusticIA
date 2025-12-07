"""
Core web-scraping orchestrator for aitracuuluat.vn.
This module coordinates the crawling process using the modular components.
"""
import time
import threading
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from playwright.sync_api import sync_playwright

from .config import (
    OUTPUT_DIR,
    CHROME_DEBUGGING_PORT,
    CRAWLER_SETTINGS,
    get_api_headers,
)
from .logger import setup_logger
from .api_client import APIClient
from .scraper import ContentScraper
from .storage import StorageManager
from .robots import RobotsHandler


class Crawler:
    """Main crawler class that orchestrates the crawling process."""
    
    def __init__(self, output_dir: Path | None = None):
        """
        Initialize the crawler with all necessary components.
        
        Args:
            output_dir: Optional custom output directory path.
        """
        self.output_dir = output_dir or OUTPUT_DIR
        self.documents_dir = self.output_dir / "documents"
        self.logs_dir = self.output_dir / "logs"
        self.debug_dir = self.output_dir / "debug"
        
        # Setup logging
        self.logger = setup_logger(self.logs_dir)
        self.debug_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize components
        try:
            self.api_headers = get_api_headers()
        except ValueError as e:
            self.logger.critical(str(e))
            raise
        
        self.api_client = APIClient(self.api_headers, self.logger)
        self.robots_handler = RobotsHandler(self.logger)
        self.content_scraper = ContentScraper(
            self.logger, 
            robot_checker=self.robots_handler.is_allowed
        )
        self.storage_manager = StorageManager(self.documents_dir, self.logger)
        
        # Thread-safe counters
        self.scraped_count = 0
        self.scraped_lock = threading.Lock()
        self.category = None
        self.shutdown_event = threading.Event()
    
    def _scrape_and_save_worker(
        self, 
        api_data: dict, 
        doc_number: int, 
        max_docs: int | None
    ) -> str | None:
        """
        Worker function for a thread to scrape and save a single document.
        
        Args:
            api_data: Document data from the API.
            doc_number: Document number for logging.
            max_docs: Maximum documents limit.
        
        Returns:
            Result status: 'processed', 'skipped_existing', 'skipped', or None.
        """
        if self.shutdown_event.is_set():
            return None

        doc_id = api_data.get('id')
        if not doc_id:
            self.logger.error(f"API data for doc {doc_number} is missing an 'id'.")
            return None

        # Get title for skip check
        doc_title = api_data.get("diagram", {}).get("ten", "Untitled Document")
        
        # Skip if already crawled
        if self.storage_manager.is_document_already_crawled(doc_id, doc_title):
            self.logger.info(f"[SKIP] Doc {doc_number} (ID: {doc_id}) already crawled: {doc_title[:50]}...")
            return 'skipped_existing'

        # Apply crawl delay
        delay = self.robots_handler.get_crawl_delay()
        if delay > 0:
            self.logger.info(f"Waiting for {delay}s as per crawl delay policy.")
            time.sleep(delay)

        # Atomically check limit and reserve a slot
        current_scraped_count = 0
        with self.scraped_lock:
            if max_docs and self.scraped_count >= max_docs:
                return 'skipped'
            if max_docs:
                self.scraped_count += 1
                current_scraped_count = self.scraped_count

        self.logger.info(f"Starting task for doc {doc_number} (ID: {doc_id})")

        # Fetch full metadata
        full_metadata = self.api_client.get_full_metadata(doc_id)
        if self.shutdown_event.is_set():
            return None

        if not full_metadata:
            self.logger.error(f"Could not retrieve full metadata for doc ID {doc_id}. Skipping.")
            if max_docs:
                with self.scraped_lock:
                    self.scraped_count -= 1
            return None

        # Ensure metadata has the 'id'
        if 'id' not in full_metadata:
            full_metadata['id'] = doc_id

        # Scrape content using Playwright
        try:
            if self.shutdown_event.is_set():
                return None
            
            with sync_playwright() as p:
                browser = p.chromium.connect_over_cdp(
                    f"http://localhost:{CHROME_DEBUGGING_PORT}"
                )
                context = browser.contexts[0]
                try:
                    content_data = self.content_scraper.scrape_document_content(
                        full_metadata, context, doc_number=doc_number
                    )
                    if content_data:
                        self.storage_manager.save_document(
                            full_metadata, 
                            content_data, 
                            doc_number=doc_number, 
                            max_docs=max_docs, 
                            current_scraped_count=current_scraped_count
                        )
                        return 'processed'
                    else:
                        if max_docs:
                            with self.scraped_lock:
                                self.scraped_count -= 1
                finally:
                    browser.close()
        except Exception as e:
            if not self.shutdown_event.is_set():
                self.logger.error(f"An error occurred in the worker for {doc_id}: {e}")
            if max_docs:
                with self.scraped_lock:
                    self.scraped_count -= 1
        
        return None
    
    def run(self, max_pages: int | None, max_docs: int | None) -> None:
        """
        Fetches document metadata from the API and scrapes content concurrently.
        
        Args:
            max_pages: Maximum number of API pages to fetch.
            max_docs: Maximum number of documents to scrape.
        """
        # Reset counters
        self.scraped_count = 0
        skipped_existing_count = 0
        processed_docs_count = 0
        newly_crawled_count = 0
        filtered_docs_count = 0
        
        page_num = 1
        total_docs = -1

        self.logger.info("=" * 60)
        self.logger.info("STARTING CRAWL SESSION")
        self.logger.info("=" * 60)

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
                        self.logger.info(
                            f"Reached scraped document limit of {max_docs}. "
                            "Not fetching more pages."
                        )
                        break
                    
                    self.logger.info(f"--- Fetching API Page {page_num} ---")
                    docs_from_api, api_total_docs = self.api_client.get_documents_page(
                        page_num, self.category
                    )

                    if total_docs == -1:
                        if api_total_docs == 0:
                            self.logger.warning("API returned 0 total documents. Stopping.")
                            break
                        total_docs = api_total_docs
                        self.logger.info(
                            f"API reports a total of {total_docs} documents in this category."
                        )

                    if not docs_from_api:
                        self.logger.info("No more documents from API. Stopping.")
                        break

                    # Submit tasks for this page
                    futures = []
                    for api_data in docs_from_api:
                        if max_docs and self.scraped_count >= max_docs:
                            break
                        
                        future = executor.submit(
                            self._scrape_and_save_worker, 
                            api_data, 
                            processed_docs_count + 1, 
                            max_docs
                        )
                        futures.append(future)
                        processed_docs_count += 1

                    # Wait for batch completion
                    for future in as_completed(futures):
                        try:
                            result = future.result()
                            if result == 'processed':
                                newly_crawled_count += 1
                            elif result == 'skipped_existing':
                                skipped_existing_count += 1
                            elif result == 'filtered':
                                filtered_docs_count += 1
                        except Exception as e:
                            self.logger.error(f"A task generated an exception: {e}")
                    
                    self.logger.info(f"--- Finished processing API Page {page_num} ---")
                    page_num += 1
                    
        except KeyboardInterrupt:
            self.logger.info("\nShutdown signal received. Telling workers to stop...")
            self.shutdown_event.set()
        
        # Final summary
        self.logger.info("=" * 60)
        self.logger.info("CRAWL SESSION COMPLETE")
        self.logger.info("=" * 60)
        self.logger.info(f"📊 Documents examined: {processed_docs_count}")
        self.logger.info(f"✅ Newly crawled: {newly_crawled_count}")
        self.logger.info(f"⏭️  Skipped (already exist): {skipped_existing_count}")
        if filtered_docs_count > 0:
            self.logger.info(f"🚫 Filtered out: {filtered_docs_count}")
        self.logger.info("=" * 60)
