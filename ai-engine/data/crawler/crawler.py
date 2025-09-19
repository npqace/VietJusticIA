"""
Core web-scraping logic for aitracuuluat.vn.
This version scrapes links directly from the webpage, bypassing the API.
Now consolidated into a single, executable file.
"""
import json
import re
import logging
import time
import argparse
from pathlib import Path
from bs4 import BeautifulSoup, Tag
from playwright.sync_api import sync_playwright, Page, TimeoutError as PlaywrightTimeoutError, ElementHandle, expect

# --- Configuration ---
CHROME_DEBUGGING_PORT = 9222
SITE_BASE_URL = "https://aitracuuluat.vn/legal-documents"
OUTPUT_DIR = Path("../raw_data_aitracuu")

CRAWLER_SETTINGS = {
    'delay_between_requests': 1,
    'headless_browser': False,
    'timeout': 240,
}

SELECTORS = {
    "category_span": 'span:has-text("Giáo dục")',
    "document_list_container": 'div.sc-jIYCZY',
    "document_link": 'a[href*="/legal-documents/"]',
    "next_page_button": 'li[title="Trang Kế"] button',
    "document_title": "h1.document-title",
    "document_content_container": "div.legislation-page__container",
    "document_metadata_div": 'div.rounded-\[12px\]:has-text("Văn bản đang xem")',
}

class Crawler:
    def __init__(self, output_dir: Path | None = None):
        self.output_dir = output_dir or OUTPUT_DIR
        self.documents_dir = self.output_dir / "documents"
        self.logs_dir = self.output_dir / "logs"
        self.debug_dir = self.output_dir / "debug"
        self.logger = self._setup_logger()
        self.debug_dir.mkdir(parents=True, exist_ok=True)

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

    def _extract_content_text(self, content_element: Tag | None) -> str:
        """Extracts text from the content container, attempting to preserve paragraphs and tables."""
        if not content_element:
            return ""
        
        text_blocks = []
        main_div = content_element.find('div', recursive=False) or content_element

        for element in main_div.find_all(['p', 'table']):
            if element.name == 'table':
                # For tables, use newlines to better preserve the structure of the text.
                text = element.get_text(separator='\n', strip=True)
            else: # For 'p' tags and others
                # For paragraphs, join with spaces to correctly handle inline tags.
                text = element.get_text(separator=' ', strip=True)
            
            if text:
                text_blocks.append(text)
        
        if not text_blocks:
            # Fallback if the structure is different and no <p> or <table> tags are found
            return content_element.get_text(separator='\n', strip=True)

        return '\n\n'.join(text_blocks)

    def _parse_metadata(self, metadata_html: str | None) -> tuple[str, dict]:
        """
        Parses the document metadata HTML into a structured dictionary and extracts the correct title,
        based on the specific structure of the 'luoc_do' tab.
        Returns a tuple: (document_title, metadata_dictionary).
        """
        metadata = {"thuộc tính": {}}
        title = ""

        if not metadata_html:
            return title, metadata

        try:
            soup = BeautifulSoup(metadata_html, 'html.parser')

            # --- Extract the Document Title ("Tên văn bản") ---
            # The title is in a <p> tag with a very specific class.
            title_p = soup.find('p', class_="text-[15px] font-semibold leading-[18px] text-[#2D3C58] m-0")
            if title_p:
                title = title_p.get_text(strip=True)
                if title not in ("---", "Dữ liệu đang cập nhật"):
                    metadata["thuộc tính"]["Tên văn bản"] = title

            # --- Extract all key-value pairs for other metadata ---
            # Find all p tags, then check them to see if they are keys.
            all_p_tags = soup.find_all('p')
            for p_tag in all_p_tags:
                key_text = p_tag.get_text(strip=True)

                # --- Tình trạng ---
                if 'Tình trạng' in key_text:
                    value_tag = p_tag.find_next_sibling('p', class_=lambda c: c and 'bg-[#4DCE33]' in c)
                    if value_tag:
                        value = value_tag.get_text(strip=True)
                        if value not in ("---", "Dữ liệu đang cập nhật"):
                            metadata["thuộc tính"]["Tình trạng"] = value
                    continue

                # --- Other standard fields ---
                other_keys = [
                    "Ngày ban hành", "Ngày hiệu lực", "Số hiệu", "Loại văn bản",
                    "Lĩnh vực, ngành", "Nơi ban hành", "Người ký", "Số công báo", "Ngày đăng"
                ]
                # Clean key_text for comparison
                cleaned_key = key_text.replace(':', '').strip()

                if cleaned_key in other_keys:
                    value_tag = p_tag.find_next_sibling('p', class_="text-[#2D3C58] text-[15px] leading-[18px] font-semibold m-0")
                    if value_tag:
                        value = value_tag.get_text(strip=True)
                        if value not in ("---", "Dữ liệu đang cập nhật"):
                            metadata["thuộc tính"][cleaned_key] = value
        
        except Exception as e:
            self.logger.error(f"Could not parse metadata HTML: {e}")

        return title, metadata

    def get_document_links_from_page(self, page: Page) -> list[str]:
        """Scrapes all unique document URLs from the currently visible page."""
        self.logger.info("Scraping document links from the current page...")
        try:
            page.wait_for_selector(SELECTORS["document_list_container"], timeout=60000)
            links = page.locator(SELECTORS["document_link"]).all()
            urls = [link.get_attribute('href') for link in links]
            
            # Ensure URLs are absolute
            absolute_urls = [f"https://aitracuuluat.vn{url}" if url.startswith('/') else url for url in urls]
            unique_urls = sorted(list(set(absolute_urls)))
            
            self.logger.info(f"Found {len(unique_urls)} unique document links.")
            return unique_urls
        except Exception as e:
            self.logger.error(f"Could not get document links from page: {e}")
            return []

    def scrape_document(self, url: str, browser_page: Page, doc_number: int) -> dict | None:
        base_url = url.split('?')[0]
        content_url = f"{base_url}?tab=noi_dung"
        metadata_url = f"{base_url}?tab=luoc_do"
        scraped_data = {}

        try:
            self.logger.info(f"➡️ Navigating to metadata tab: {metadata_url}")
            browser_page.goto(metadata_url, wait_until='domcontentloaded', timeout=CRAWLER_SETTINGS['timeout'] * 1000)
            
            metadata_container_selector = SELECTORS["document_metadata_div"]
            container = browser_page.locator(metadata_container_selector)
            container.wait_for(timeout=40000)
            
            title_locator = container.locator('p[class="text-[15px] font-semibold leading-[18px] text-[#2D3C58] m-0"]')
            expect(title_locator).not_to_be_empty(timeout=60000)
            expect(title_locator).not_to_contain_text(re.compile(r"---|Dữ liệu đang cập nhật"), timeout=60000)

            metadata_element = browser_page.query_selector(metadata_container_selector)
            metadata_html = metadata_element.inner_html() if metadata_element else ""
            
            title_text, scraped_data["metadata"] = self._parse_metadata(metadata_html)

        except Exception as e:
            self.logger.error(f"Failed to get metadata for {url}: {e}")
            try:
                if 'browser_page' in locals() and browser_page:
                    metadata_element = browser_page.query_selector(SELECTORS["document_metadata_div"])
                    if metadata_element:
                        metadata_html_content = metadata_element.inner_html()
                        timestamp = time.strftime('%Y%m%d-%H%M%S')
                        debug_html_path = self.debug_dir / f"failed_metadata_{doc_number}_{timestamp}.html"
                        debug_html_path.write_text(metadata_html_content, encoding='utf-8')
                        self.logger.error(f"Saved failed metadata HTML to {debug_html_path}")
            except Exception as save_e:
                self.logger.error(f"Could not save debug metadata HTML: {save_e}")

            title_text = ""
            scraped_data["metadata"] = self._parse_metadata(None)

        try:
            self.logger.info(f"➡️ Navigating to content tab: {content_url}")
            browser_page.goto(content_url, wait_until='domcontentloaded', timeout=CRAWLER_SETTINGS['timeout'] * 1000)
            browser_page.wait_for_selector(SELECTORS["document_content_container"], timeout=50000)

            html_content = browser_page.content()
            screenshot_bytes = browser_page.screenshot(full_page=True)
            soup = BeautifulSoup(html_content, 'html.parser')
            
            main_content_element = soup.select_one(SELECTORS["document_content_container"])
            main_content = self._extract_content_text(main_content_element)
            
            if not title_text or title_text in ("---", "Dữ liệu đang cập nhật"):
                self.logger.warning(f"⚠️ Falling back to content-page title for doc {doc_number} ({content_url})")
                title_element = soup.select_one(SELECTORS["document_title"])
                if title_element:
                    title_text = title_element.get_text(strip=True)
                elif soup.title:
                    title_text = soup.title.string.strip().replace("AI Tra Cứu Luật - ", "")
                else:
                    title_text = "Untitled Document"

            scraped_data.update({
                "title": title_text, "content": main_content, "url": content_url,
                "raw_html": html_content, "screenshot_bytes": screenshot_bytes
            })
            return scraped_data
        except Exception as e:
            self.logger.error(f"Failed to scrape content for doc {doc_number} ({content_url}): {e}")
            return None

    def save_data(self, data: dict):
        try:
            title = data['title']
            folder_name = re.sub(r'[\\/*?:"<>|]', "", title)[:100].strip()
            doc_folder = self.documents_dir / folder_name
            doc_folder.mkdir(parents=True, exist_ok=True)
            
            (doc_folder / "page_content.html").write_text(data["raw_html"], encoding='utf-8')
            (doc_folder / "screenshot.png").write_bytes(data["screenshot_bytes"])
            (doc_folder / "content.txt").write_text(data.get('content', ''), encoding='utf-8')
            
            metadata_to_save = {
                "title": data.get("title", ""),
                "metadata": data.get("metadata", {}),
                "url": data.get("url", "")
            }
            with open(doc_folder / "metadata.json", 'w', encoding='utf-8') as f:
                json.dump(metadata_to_save, f, ensure_ascii=False, indent=4)

            self.logger.info(f"✅ [SUCCESS] Saved all files to folder: {folder_name}")
        except Exception as e:
            self.logger.error(f"❌ Failed to save data for {data.get('title', 'Unknown')}: {e}")

    def run(self, max_pages: int | None, max_docs: int | None):
        """Connects to a browser, navigates, and scrapes links from the page."""
        scraped_docs_count = 0
        
        with sync_playwright() as p:
            self.logger.info(f"🔌 Connecting to Chrome on port {CHROME_DEBUGGING_PORT}...")
            browser = p.chromium.connect_over_cdp(f"http://localhost:{CHROME_DEBUGGING_PORT}")
            context = browser.contexts[0]
            page = context.new_page()
            self.logger.info("✅ Connection successful.")

            self.logger.info(f"➡️ Navigating to '{SITE_BASE_URL}' to prime session...")
            page.goto(SITE_BASE_URL, wait_until='networkidle', timeout=120000)
            page.locator(SELECTORS["category_span"]).click()
            self.logger.info("👍 Category selected. Waiting for page to update...")
            page.wait_for_timeout(10000)
            
            page_num = 1
            while True:
                if max_pages and page_num > max_pages:
                    self.logger.info(f"Reached max page limit of {max_pages}. Stopping.")
                    break
                
                self.logger.info(f"\n--- 📄 Scraping Web Page {page_num} ---")
                links = self.get_document_links_from_page(page)
                if not links:
                    self.logger.info("No more document links found on this page.")
                    break

                for url in links:
                    if max_docs and scraped_docs_count >= max_docs:
                        self.logger.info(f"Reached max document limit of {max_docs}. Stopping.")
                        break
                    
                    scraped_docs_count += 1
                    self.logger.info(f"  > Scraping document {scraped_docs_count}...")
                    doc_data = self.scrape_document(url, page, doc_number=scraped_docs_count)
                    if doc_data:
                        self.save_data(doc_data)
                    time.sleep(CRAWLER_SETTINGS['delay_between_requests'])
                
                if (max_docs and scraped_docs_count >= max_docs): break

                next_button = page.locator(SELECTORS["next_page_button"])
                if not next_button.is_visible() or next_button.is_disabled():
                    self.logger.info("🏁 No more pages. Stopping.")
                    break
                
                self.logger.info("➡️ Navigating to next page...")
                next_button.click()
                page.wait_for_timeout(10000)
                page_num += 1

            self.logger.info("🎉 Crawl finished. Detaching from browser.")


def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description="Web scraper for 'Giao duc' category on aitracuuluat.vn.",
        formatter_class=argparse.RawTextHelpFormatter,
        epilog="""
Setup before running:
  1. Close all Chrome instances: taskkill /F /IM chrome.exe
  2. Start Chrome with debugging: & "C:\\...\\chrome.exe" --remote-debugging-port=9222
  3. Log in to aitracuuluat.vn in that browser.
  4. Run this script.

Examples:
  # Scrape 5 documents for a quick test
  python crawler.py --max-docs 5

  # Scrape a maximum of 2 web pages
  python crawler.py --max-pages 2
        """)
    parser.add_argument('--max-docs', type=int, default=None, help='Maximum number of total documents to scrape.')
    parser.add_argument('--max-pages', type=int, default=None, help='Maximum number of web pages to scrape.')
    args = parser.parse_args()
    return args

if __name__ == "__main__":
    args = parse_arguments()
    crawler = Crawler()
    try:
        crawler.run(max_pages=args.max_pages, max_docs=args.max_docs)
    except Exception as e:
        crawler.logger.critical(f"💥 [CRITICAL ERROR] An unexpected error occurred: {e}")
        crawler.logger.critical("   Please ensure Chrome is running with the debugging flag and you are logged in.")
