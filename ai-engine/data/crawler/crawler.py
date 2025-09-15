"""
Core crawler logic for thuvienphapluat.vn
"""
import json
import re
import logging
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, Page, TimeoutError as PlaywrightTimeoutError
from bs4 import BeautifulSoup

# Import settings from the configuration file
from crawler_config import (
    BASE_URL, SEARCH_PAGE_URL_P1, SEARCH_PAGE_URL_PN,
    REQUEST_HEADERS, CRAWLER_SETTINGS, SELECTORS, OUTPUT_DIR  # MODIFIED: Import OUTPUT_DIR
)

class Crawler:
    def __init__(self, output_dir: Path | None = None):
        # MODIFIED: Use imported OUTPUT_DIR as the fallback
        self.output_dir = output_dir or OUTPUT_DIR
        self.documents_dir = self.output_dir / "documents"
        self.logs_dir = self.output_dir / "logs"
        self.debug_dir = self.output_dir / "debug"
        
        self.logger = self._setup_logger()
        self.debug_dir.mkdir(parents=True, exist_ok=True)

    def _setup_logger(self):
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        logger = logging.getLogger('crawler_logger')
        logger.setLevel(logging.INFO)
        if not logger.handlers:
            log_format = '%(asctime)s - thuvienphapluat_crawler - %(levelname)s - %(message)s'
            formatter = logging.Formatter(log_format)
            file_handler = logging.FileHandler(self.logs_dir / "crawler.log", encoding="utf-8")
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)
        return logger

    # get_document_links function remains the same
    def get_document_links(self, page_url: str, browser_page: Page) -> list[str]:
        self.logger.info(f"Fetching document links from: {page_url}")
        try:
            browser_page.goto(page_url, timeout=CRAWLER_SETTINGS['timeout'] * 1000)
            try:
                cookie_button_selector = "button.qc-cmp2-summary-buttons-btn-primary"
                browser_page.click(cookie_button_selector, timeout=5000)
                self.logger.info("Cookie consent button clicked.")
                time.sleep(2)
            except PlaywrightTimeoutError:
                self.logger.info("Cookie consent pop-up not found, continuing.")
            self.logger.info(f"Waiting for selector: '{SELECTORS['search_results_list']}'")
            browser_page.wait_for_selector(SELECTORS["search_results_list"], timeout=20000)
            self.logger.info("Search results container found.")
            html = browser_page.content()
            soup = BeautifulSoup(html, 'html.parser')
            links = [a['href'].split('?')[0] for a in soup.select(SELECTORS["document_link"]) if a.has_attr('href')]
            if not links: raise ValueError("CSS selector found no links in the HTML.")
            unique_links = list(set(links))
            self.logger.info(f"Found {len(unique_links)} unique documents on page.")
            return unique_links
        except (PlaywrightTimeoutError, ValueError) as e:
            self.logger.warning(f"No links found on {page_url}. Error: {e}")
            screenshot_path = self.debug_dir / f"failure_{time.strftime('%Y%m%d-%H%M%S')}.png"
            browser_page.screenshot(path=screenshot_path, full_page=True)
            self.logger.info(f"Saved debug screenshot: {screenshot_path}")
            print(f"  ⚠️ No links found. Saved debug screenshot to '{screenshot_path}'")
            return []
        except Exception as e:
            self.logger.error(f"An unexpected error occurred: {e}", exc_info=True)
            return []


    # scrape_document function remains the same
    def scrape_document(self, url: str, browser_page: Page, doc_number: int) -> dict | None:
        self.logger.info(f"Scraping document {doc_number}: {url}")
        try:
            print(f"    -> Navigating to {url}...")
            browser_page.goto(url, wait_until='domcontentloaded', timeout=CRAWLER_SETTINGS['timeout'] * 1000)
            print("    -> Navigation complete. Waiting for content container...")
            
            browser_page.wait_for_selector(SELECTORS["document_content_container"], timeout=15000)
            print("    -> Content container found. Scraping content...")

            html_content = browser_page.content()
            screenshot_bytes = browser_page.screenshot(full_page=True)
            soup = BeautifulSoup(html_content, 'html.parser')
            
            metadata = {}

            thuoc_tinh_data = {}
            thuoc_tinh_table = soup.select_one(f"{SELECTORS['document_metadata_container']} table")
            if thuoc_tinh_table:
                cells = thuoc_tinh_table.find_all('td')
                for i, cell in enumerate(cells):
                    key_tag = cell.find('b')
                    if key_tag and i + 1 < len(cells):
                        key = key_tag.get_text(strip=True).replace(':', '')
                        value = cells[i+1].get_text(strip=True)
                        thuoc_tinh_data[key] = value
            metadata["thuộc tính"] = thuoc_tinh_data

            tom_tat_div = soup.select_one("div.Tomtatvanban")
            if tom_tat_div:
                tom_tat_text = tom_tat_div.get_text(separator='\n', strip=True)
                metadata["tóm tắt văn bản"] = tom_tat_text
            else:
                metadata["tóm tắt văn bản"] = "Không tìm thấy tóm tắt."

            main_content = ""
            content_div = soup.select_one(SELECTORS["document_content_container"])
            if content_div:
                paragraphs = []
                for p in content_div.find_all(['p', 'h2', 'h3', 'li', 'table']):
                    text = re.sub(r'\s+', ' ', p.get_text()).strip()
                    if text:
                        paragraphs.append(text)
                main_content = "\n\n".join(paragraphs)
            
            page_title = soup.title.string.strip() if soup.title else "Untitled Document"
            
            return {
                "title": page_title, 
                "metadata": metadata,
                "content": main_content, 
                "url": url,
                "raw_html": html_content, 
                "screenshot_bytes": screenshot_bytes
            }
        except PlaywrightTimeoutError as e:
            self.logger.error(f"Timeout error scraping document {doc_number} ({url}): {e}")
            screenshot_path = self.debug_dir / f"error_timeout_doc_{doc_number}_{time.strftime('%Y%m%d-%H%M%S')}.png"
            browser_page.screenshot(path=screenshot_path, full_page=True)
            self.logger.info(f"Saved debug screenshot to {screenshot_path}")
            print(f"  ⚠️ Timeout error. Saved debug screenshot to '{screenshot_path}'")
            return None
        except Exception as e:
            self.logger.error(f"Failed to scrape document {doc_number} ({url}): {e}", exc_info=True)
            screenshot_path = self.debug_dir / f"error_unexpected_doc_{doc_number}_{time.strftime('%Y%m%d-%H%M%S')}.png"
            browser_page.screenshot(path=screenshot_path, full_page=True)
            self.logger.info(f"Saved debug screenshot to {screenshot_path}")
            print(f"  ⚠️ Unexpected error. Saved debug screenshot to '{screenshot_path}'")
            return None

    # save_data function remains the same
    def save_data(self, data: dict):
        try:
            title = data['title']
            folder_name = re.sub(r'[\\/*?:"<>|]', "", title)[:100].strip()
            doc_folder = self.documents_dir / folder_name
            doc_folder.mkdir(parents=True, exist_ok=True)
            
            html_path = doc_folder / "page_content.html"
            screenshot_path = doc_folder / "screenshot.png"
            json_path = doc_folder / "metadata.json"
            txt_path = doc_folder / "content.txt"

            with open(html_path, 'w', encoding='utf-8') as f: f.write(data["raw_html"])
            with open(screenshot_path, 'wb') as f: f.write(data["screenshot_bytes"])

            json_data = {k: v for k, v in data.items() if k not in ["raw_html", "screenshot_bytes", "content"]}
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(json_data, f, indent=4, ensure_ascii=False)
            
            with open(txt_path, 'w', encoding='utf-8') as f:
                f.write(data.get('content', ''))
            
            self.logger.info(f"Successfully saved all files for document: {title}")
            print(f"  ✅ Saved all files to folder: {doc_folder}")
        except Exception as e:
            self.logger.error(f"Failed to save data for {data.get('title', 'Unknown')}: {e}", exc_info=True)


    def run(self, max_pages: int | None, max_total_docs: int | None, start_at_doc: int = 1):
        """Main method to run the entire crawling process with new limits."""
        docs_scraped_count = 0
        total_docs_encountered = 0
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=CRAWLER_SETTINGS['headless_browser'])
            page = browser.new_page(extra_http_headers=REQUEST_HEADERS)
            
            try:
                # Use a large number for the loop if max_pages is not set
                page_limit = max_pages or float('inf')
                page_num = 1
                
                while page_num <= page_limit:
                    if max_total_docs and docs_scraped_count >= max_total_docs:
                        print("\nReached maximum document limit. Stopping crawl.")
                        self.logger.info("Reached maximum document limit.")
                        break

                    print(f"\n--- Processing Page {page_num} ---")
                    self.logger.info(f"--- Starting Page {page_num} ---")
                    
                    url = SEARCH_PAGE_URL_P1 if page_num == 1 else SEARCH_PAGE_URL_PN.format(page_num=page_num)
                    links = self.get_document_links(url, page)
                    
                    if not links:
                        print("  No more documents found. Stopping.")
                        self.logger.warning("No more documents found.")
                        break
                    
                    print(f"  Found {len(links)} documents on page. Processing...")
                    
                    for i, link in enumerate(links):
                        total_docs_encountered += 1

                        if total_docs_encountered < start_at_doc:
                            print(f"  > Skipping document {total_docs_encountered}...")
                            continue

                        if max_total_docs and docs_scraped_count >= max_total_docs:
                            break # Break inner loop as well
                        
                        print(f"  > Scraping document {total_docs_encountered}...")
                        doc_data = self.scrape_document(link, page, doc_number=total_docs_encountered)
                        if doc_data:
                            self.save_data(doc_data)
                            docs_scraped_count += 1
                        else:
                            print(f"  ⚠️ Failed to process document {total_docs_encountered}. Skipping.")
                        
                        time.sleep(CRAWLER_SETTINGS['delay_between_requests'])
                    
                    page_num += 1
            finally:
                browser.close()