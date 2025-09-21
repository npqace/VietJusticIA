"""
Core web-scraping logic for aitracuuluat.vn.
This version uses the API to get document metadata and Playwright to scrape content.
"""
import json
import re
import logging
import time
import argparse
import os
import io
from pathlib import Path
from dotenv import load_dotenv
import requests
import pandas as pd
from bs4 import BeautifulSoup, Tag
from playwright.sync_api import sync_playwright, Page, TimeoutError as PlaywrightTimeoutError, ElementHandle, expect

# --- Configuration ---
load_dotenv()
CHROME_DEBUGGING_PORT = 9222
SITE_BASE_URL = "https://aitracuuluat.vn"
API_BASE_URL = "https://api.aitracuuluat.vn/api/v2/legal-documents"
BEARER_TOKEN = os.getenv("AITRACUU_BEARER_TOKEN")
OUTPUT_DIR = Path("../raw_data_aitracuu")
API_PAGE_SIZE = 10

CRAWLER_SETTINGS = {
    'delay_between_requests': 1,
    'headless_browser': False,
    'timeout': 240,
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
            self.logger.critical("BEARER_TOKEN not found. Please set AITRACUU_BEARER_TOKEN in your .env file.")
            raise ValueError("AITRACUU_BEARER_TOKEN not set.")
        self.api_headers = {
            "Authorization": f"Bearer {BEARER_TOKEN}",
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
        }

    def _setup_logger(self):
        """Sets up a logger that outputs formatted messages to both console and a file."""
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        logger = logging.getLogger('crawler_logger')
        logger.setLevel(logging.INFO)

        # If handlers are already present, do nothing
        if logger.hasHandlers():
            return logger

        # --- Formatter with Colors and Emojis ---
        class CustomFormatter(logging.Formatter):
            
            # Define colors for different log levels
            GREY = "\x1b[38;20m"
            YELLOW = "\x1b[33;20m"
            RED = "\x1b[31;20m"
            BOLD_RED = "\x1b[31;1m"
            GREEN = "\x1b[32;20m"
            BLUE = "\x1b[34;20m"
            RESET = "\x1b[0m"

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

        # --- Console Handler ---
        # Use a more readable format for the console
        console_format = " %(levelname)s - %(message)s"
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(CustomFormatter(console_format))
        logger.addHandler(console_handler)

        # --- File Handler ---
        # Keep a more detailed, plain format for the log file
        file_format = '%(asctime)s - %(levelname)s - %(message)s'
        file_handler = logging.FileHandler(self.logs_dir / "crawler.log", encoding="utf-8")
        file_handler.setFormatter(logging.Formatter(file_format))
        logger.addHandler(file_handler)

        return logger

    def _get_docs_from_api(self, page_num: int) -> tuple[list, int]:
        """Fetches a page of documents from the API."""
        params = {
            "linh_vuc_nganh": "Giáo dục",
            "page": page_num,
            "pageSize": API_PAGE_SIZE
        }
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

    def _extract_content_text(self, content_element: Tag | None) -> str:
        """Extracts and formats text from the content container, handling paragraphs, tables, and line breaks."""
        if not content_element:
            return ""

        # Replace <br> tags with newlines to preserve intended line breaks within paragraphs.
        for br in content_element.find_all("br"):
            br.replace_with("\n")

        text_blocks = []
        for element in content_element.find_all(['p', 'table']):
            if element.name == 'table':
                # Use pandas to read the HTML table into a DataFrame.
                # This handles complex structures, including merged cells.
                try:
                    # The `io.StringIO` wrapper is needed to treat the HTML string as a file.
                    df_list = pd.read_html(io.StringIO(str(element)), header=None, flavor='bs4')
                    if df_list:
                        # read_html returns a list of DataFrames, we usually want the first one.
                        df = df_list[0]
                        # Convert the DataFrame to a string, which gives a clean, aligned text table.
                        # We fill NaN values that may result from merged cells.
                        table_text = df.to_string(header=False, index=False, na_rep='')
                        text_blocks.append(table_text)
                except Exception as e:
                    # Fallback to simple text extraction if pandas fails
                    self.logger.warning(f"Pandas could not parse a table, falling back to simple extraction. Error: {e}")
                    table_text = '\n'.join(
                        '\t'.join(cell.get_text(strip=True) for cell in row.find_all(['td', 'th']))
                        for row in element.find_all('tr')
                    )
                    text_blocks.append(table_text)
            else:  # For '<p>' tags
                # Get text and normalize whitespace to collapse multiple lines into one.
                p_text = ' '.join(element.get_text().split())
                if p_text:
                    text_blocks.append(p_text)
        
        # Join the processed blocks with double newlines to create paragraph spacing.
        return '\n\n'.join(text_blocks)

    def scrape_document_content(self, doc_api_data: dict, browser_page: Page, doc_number: int) -> dict | None:
        """Scrapes the full text content of a single document page."""
        doc_id = doc_api_data.get("id")
        if not doc_id:
            self.logger.error(f"Document data from API is missing 'id' for doc number {doc_number}.")
            return None

        base_url = f"{SITE_BASE_URL}/legal-documents/{doc_id}"
        content_url = f"{base_url}?tab=noi_dung"
        
        try:
            self.logger.info(f"➡️ Navigating to content tab: {content_url}")
            browser_page.goto(content_url, wait_until='domcontentloaded', timeout=CRAWLER_SETTINGS['timeout'] * 1000)
            browser_page.wait_for_selector(SELECTORS["document_content_container"], timeout=50000)

            html_content = browser_page.content()
            screenshot_bytes = browser_page.screenshot(full_page=True)
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

    def save_data(self, api_data: dict, content_data: dict):
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
                "metadata": {"thuộc tính": api_data.get("diagram", {})},
                "url": content_data.get("url", "")
            }
            with open(doc_folder / "metadata.json", 'w', encoding='utf-8') as f:
                json.dump(metadata_to_save, f, ensure_ascii=False, indent=4)

            self.logger.info(f"✅ [SUCCESS] Saved all files to folder: {folder_name}")
        except Exception as e:
            self.logger.error(f"❌ Failed to save data for {content_data.get('title', 'Unknown')}: {e}")

    def run(self, max_pages: int | None, max_docs: int | None):
        """Fetches document metadata from the API and scrapes content using a browser."""
        scraped_docs_count = 0
        
        with sync_playwright() as p:
            self.logger.info(f"🔌 Connecting to Chrome on port {CHROME_DEBUGGING_PORT}...")
            browser = p.chromium.connect_over_cdp(f"http://localhost:{CHROME_DEBUGGING_PORT}")
            context = browser.contexts[0]
            self.logger.info("✅ Connection successful.")
            
            page_num = 1
            total_docs = -1

            while True:
                if max_pages and page_num > max_pages:
                    self.logger.info(f"Reached max page limit of {max_pages}. Stopping.")
                    break
                
                if max_docs and scraped_docs_count >= max_docs:
                    self.logger.info(f"Reached document limit of {max_docs}. Stopping.")
                    break

                self.logger.info(f"\n--- 📄 Fetching API Page {page_num} ---")
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

                for api_data in docs_from_api:
                    if max_docs and scraped_docs_count >= max_docs:
                        break
                    
                    scraped_docs_count += 1
                    self.logger.info(f"  > Scraping document {scraped_docs_count}/{total_docs} (ID: {api_data.get('id')}) in new tab...")
                    
                    doc_page = context.new_page()
                    try:
                        content_data = self.scrape_document_content(api_data, doc_page, doc_number=scraped_docs_count)
                        if content_data:
                            self.save_data(api_data, content_data)
                    except Exception as e:
                        self.logger.error(f"An error occurred in the scraping tab for {api_data.get('id')}: {e}")
                    finally:
                        doc_page.close()
                        self.logger.info(f"  > Tab for doc {scraped_docs_count} closed.")
                    
                    time.sleep(CRAWLER_SETTINGS['delay_between_requests'])
                
                page_num += 1

            self.logger.info("🎉 Crawl finished. Detaching from browser.")


def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description="API-based scraper for 'Giao duc' category on aitracuuluat.vn.",
        formatter_class=argparse.RawTextHelpFormatter,
        epilog="""
Setup before running:
  1. Create a .env file in this directory with: AITRACUU_BEARER_TOKEN=your_token_here
  2. Close all Chrome instances: taskkill /F /IM chrome.exe
  3. Start Chrome with debugging: & "C:\\...\\chrome.exe" --remote-debugging-port=9222
  4. Log in to aitracuuluat.vn in that browser (session might still be needed for content).
  5. Run this script.

Examples:
  # Scrape 5 documents for a quick test
  python crawler.py --max-docs 5

  # Scrape a maximum of 2 pages of API results
  python crawler.py --max-pages 2
        """)
    parser.add_argument('--max-docs', type=int, default=None, help='Maximum number of total documents to scrape.')
    parser.add_argument('--max-pages', type=int, default=None, help='Maximum number of API pages to fetch.')
    args = parser.parse_args()
    return args

if __name__ == "__main__":
    args = parse_arguments()
    crawler = Crawler()
    try:
        crawler.run(max_pages=args.max_pages, max_docs=args.max_docs)
    except Exception as e:
        crawler.logger.critical(f"💥 [CRITICAL ERROR] An unexpected error occurred: {e}")
        crawler.logger.critical("   Please ensure Chrome is running with debugging and your .env file is set up.")
