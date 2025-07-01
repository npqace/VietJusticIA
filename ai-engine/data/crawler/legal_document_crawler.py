import asyncio
import json
import os
import re
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Set
from urllib.parse import urljoin, urlparse, parse_qs, urlencode
import traceback

import aiohttp
import pandas as pd
from playwright.async_api import async_playwright, Browser, Page, TimeoutError as PlaywrightTimeoutError
from bs4 import BeautifulSoup

# Import configuration
try:
    from crawler_config import (
        BASE_URL, DATA_FILES_URL, OUTPUT_DIR, PDFS_DIR, LOGS_DIR,
        REQUEST_HEADERS, CRAWLER_SETTINGS, METADATA_FIELDS,
        DOCUMENT_CATEGORIES, VIETNAMESE_MONTHS
    )
except ImportError:
    # Fallback configuration if crawler_config is not available
    BASE_URL = "https://chinhphu.vn"
    OUTPUT_DIR = Path("../raw_data")
    PDFS_DIR = OUTPUT_DIR / "pdfs"
    LOGS_DIR = OUTPUT_DIR / "logs"
    REQUEST_HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
    }
    CRAWLER_SETTINGS = {'delay_between_requests': 2, 'headless_browser': False, 'save_frequency': 10}
    METADATA_FIELDS = {'số ký hiệu': 'document_number', 'ngày ban hành': 'issue_date'}
    DOCUMENT_CATEGORIES = {
        "legal_documents": {
            "url": "https://chinhphu.vn/?pageid=41852&mode=0",
            "description": "Main legal documents page"
        }
    }


class LegalDocumentCrawler:
    """
    Crawler for Vietnamese legal documents from chinhphu.vn
    with pagination support and better error handling
    """
    
    def __init__(self, output_dir: str = None):
        self.base_url = BASE_URL
        self.output_dir = Path(output_dir) if output_dir else OUTPUT_DIR
        self.documents_dir = self.output_dir / "documents"
        self.json_dir = self.documents_dir / "json"
        self.csv_dir = self.documents_dir / "csv"
        self.pdfs_dir = self.output_dir / "pdfs"
        self.logs_dir = self.output_dir / "logs"
        self.metadata_file = self.output_dir / "documents_metadata.json"
        
        # Create directories with organized structure
        for directory in [self.documents_dir, self.json_dir, self.csv_dir, self.pdfs_dir, self.logs_dir]:
            directory.mkdir(parents=True, exist_ok=True)
        
        # Setup logging
        self.setup_logging()
        
        # Track processed documents to avoid duplicates
        self.processed_docids: Set[str] = set()
        self.failed_downloads: List[Dict] = []

    def setup_logging(self):
        """Setup logging configuration"""
        log_file = self.logs_dir / f"crawler_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file, encoding='utf-8'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

    async def start_browser(self) -> Tuple[Browser, Page]:
        """Initialize Playwright browser and page with better configuration"""
        playwright = await async_playwright().start()
        
        browser_args = [
            '--no-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security',
            '--allow-running-insecure-content'
        ]
        
        browser = await playwright.chromium.launch(
            headless=CRAWLER_SETTINGS.get('headless_browser', False),
            args=browser_args
        )
        
        # Create browser context with user agent (CORRECT WAY)
        context = await browser.new_context(
            user_agent=REQUEST_HEADERS.get('User-Agent', ''),
            viewport={"width": 1920, "height": 1080},
            extra_http_headers=REQUEST_HEADERS
        )
        
        page = await context.new_page()
        
        return browser, page

    async def get_document_links_with_pagination(self, page: Page, base_url: str, max_pages: Optional[int] = None) -> List[Dict[str, str]]:
        """
        Extract all document links with ASP.NET postback pagination support
        """
        all_document_links = []
        
        # Start with the first page
        self.logger.info(f"Starting pagination crawl from: {base_url}")
        await page.goto(base_url, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(3000)
        
        # Get pagination information
        pagination_info = await self.get_pagination_info(page)
        total_pages = pagination_info.get('total_pages', 10)
        total_documents = pagination_info.get('total_documents', 0)
        
        # Determine max pages to crawl
        max_attempts = min(max_pages, total_pages) if max_pages else total_pages
        self.logger.info(f"Will crawl up to {max_attempts} pages (total available: {total_pages})")
        
        if total_documents > 0:
            self.logger.info(f"Estimated total documents to process: {total_documents}")
        
        for page_num in range(1, max_attempts + 1):
            try:
                self.logger.info(f"Crawling page {page_num}")
                
                # Extract document links from current page
                page_links = await self.extract_document_links_from_current_page(page)
                
                if not page_links and page_num > 1:
                    self.logger.info(f"No more documents found at page {page_num}, stopping pagination")
                    break
                    
                all_document_links.extend(page_links)
                self.logger.info(f"Found {len(page_links)} documents on page {page_num}")
                
                # Try to navigate to next page using postback
                if page_num < max_attempts:
                    next_page_success = await self.navigate_to_next_page(page, page_num + 1)
                    if not next_page_success:
                        self.logger.info(f"Could not navigate to page {page_num + 1}, stopping pagination")
                        break
                
                # Add delay between pages
                await asyncio.sleep(CRAWLER_SETTINGS.get('delay_between_requests', 2))
                
            except Exception as e:
                self.logger.error(f"Error crawling page {page_num}: {str(e)}")
                if page_num == 1:  # If first page fails, stop
                    break
                continue
        
        # Remove duplicates
        unique_links = self.remove_duplicate_links(all_document_links)
        self.logger.info(f"Found {len(unique_links)} unique documents across {page_num} pages")
        
        return unique_links

    async def extract_document_links_from_current_page(self, page: Page) -> List[Dict[str, str]]:
        """Extract document links from the current page content"""
        content = await page.content()
        soup = BeautifulSoup(content, 'html.parser')
        
        document_links = []
        
        # Look for document links with docid parameter
        links = soup.find_all('a', href=True)
        
        for link in links:
            href = link.get('href', '')
            if 'docid=' in href:
                match = re.search(r'docid=(\d+)', href)
                if match:
                    docid = match.group(1)
                    full_url = urljoin(self.base_url, href)
                    title = link.get_text(strip=True)
                    
                    document_links.append({
                        'docid': docid,
                        'url': full_url,
                        'title': title,
                        'page_url': page.url
                    })
        
        return document_links

    async def navigate_to_next_page(self, page: Page, target_page: int) -> bool:
        """
        Navigate to next page using ASP.NET postback mechanism
        """
        try:
            # Method 1: Try clicking the pagination link directly
            next_page_selector = f'a[href*="Page${target_page}"]'
            next_page_element = await page.query_selector(next_page_selector)
            
            if next_page_element:
                self.logger.info(f"Clicking pagination link for page {target_page}")
                await next_page_element.click()
                await page.wait_for_load_state("networkidle", timeout=15000)
                return True
            
            # Method 2: Try executing the postback JavaScript directly
            postback_script = f"""
            if (typeof __doPostBack === 'function') {{
                var gridView = document.querySelector('table[id*="grvDocument"], div[id*="grvDocument"]');
                if (gridView) {{
                    var controlId = gridView.id || 'ctrl_191017_163$grvDocument';
                    __doPostBack(controlId, 'Page${target_page}');
                    return true;
                }}
            }}
            return false;
            """
            
            result = await page.evaluate(postback_script)
            if result:
                self.logger.info(f"Executed postback for page {target_page}")
                await page.wait_for_load_state("networkidle", timeout=15000)
                return True
            
            # Method 3: Extract ViewState and post form data manually
            return await self.postback_with_viewstate(page, target_page)
            
        except Exception as e:
            self.logger.warning(f"Failed to navigate to page {target_page}: {str(e)}")
            return False

    async def postback_with_viewstate(self, page: Page, target_page: int) -> bool:
        """
        Manual form postback with ViewState extraction
        """
        try:
            # Extract form data including ViewState
            form_data = await page.evaluate("""
            () => {
                const form = document.forms[0];
                if (!form) return null;
                
                const formData = new FormData(form);
                const data = {};
                
                for (let [key, value] of formData.entries()) {
                    data[key] = value;
                }
                
                return {
                    action: form.action || window.location.href,
                    data: data
                };
            }
            """)
            
            if not form_data:
                return False
            
            # Find the GridView control ID
            control_id = await page.evaluate("""
            () => {
                const gridView = document.querySelector('table[id*="grvDocument"], div[id*="grvDocument"]');
                return gridView ? gridView.id : 'ctrl_191017_163$grvDocument';
            }
            """)
            
            # Update form data for pagination
            form_data['data']['__EVENTTARGET'] = control_id
            form_data['data']['__EVENTARGUMENT'] = f'Page${target_page}'
            
            # Post the form data
            current_url = page.url
            await page.goto(current_url, method='POST', post_data=form_data['data'])
            await page.wait_for_load_state("networkidle", timeout=15000)
            
            self.logger.info(f"Manual postback successful for page {target_page}")
            return True
            
        except Exception as e:
            self.logger.warning(f"Manual postback failed for page {target_page}: {str(e)}")
            return False

    def remove_duplicate_links(self, links: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """Remove duplicate document links based on docid"""
        seen_docids = set()
        unique_links = []
        
        for link in links:
            if link['docid'] not in seen_docids:
                seen_docids.add(link['docid'])
                unique_links.append(link)
        
        return unique_links

    async def extract_document_metadata(self, page: Page, doc_url: str, docid: str) -> Dict:
        """Enhanced metadata extraction"""
        self.logger.info(f"Extracting metadata for document {docid}")
        
        try:
            await page.goto(doc_url, wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(2000)
            
            content = await page.content()
            soup = BeautifulSoup(content, 'html.parser')
            
            metadata = {
                'docid': docid,
                'url': doc_url,
                'extracted_at': datetime.now().isoformat(),
                'title': '',
                'document_number': '',
                'issue_date': '',
                'document_type': '',
                'issuing_authority': '',
                'signer': '',
                'summary': '',
                'attachments': []
            }
            
            # Extract title
            title_selectors = ['h1', 'h2', '.document-title', '.title']
            for selector in title_selectors:
                title_elem = soup.select_one(selector)
                if title_elem:
                    metadata['title'] = title_elem.get_text(strip=True)
                    break
            
            # Extract metadata from tables
            tables = soup.find_all('table')
            for table in tables:
                rows = table.find_all('tr')
                for row in rows:
                    cells = row.find_all(['td', 'th'])
                    if len(cells) >= 2:
                        label = cells[0].get_text(strip=True).lower()
                        value = cells[1].get_text(strip=True)
                        
                        # Map Vietnamese labels to English fields
                        for vn_label, en_field in METADATA_FIELDS.items():
                            if vn_label in label:
                                metadata[en_field] = value
                                break
            
            # Extract PDF attachments
            metadata['attachments'] = await self.extract_attachments(soup)
            
            return metadata
            
        except Exception as e:
            self.logger.error(f"Error extracting metadata for {docid}: {str(e)}")
            return {
                'docid': docid,
                'url': doc_url,
                'error': str(e),
                'extracted_at': datetime.now().isoformat()
            }

    async def extract_attachments(self, soup: BeautifulSoup) -> List[Dict]:
        """Extract PDF and other attachment links"""
        attachments = []
        
        # Look for PDF links
        links = soup.find_all('a', href=True)
        for link in links:
            href = link.get('href', '')
            if href and ('.pdf' in href.lower() or 'datafiles.chinhphu.vn' in href):
                if not href.startswith('http'):
                    href = urljoin(self.base_url, href)
                
                filename = os.path.basename(urlparse(href).path)
                if not filename.endswith('.pdf'):
                    filename += '.pdf'
                
                attachments.append({
                    'url': href,
                    'filename': filename,
                    'text': link.get_text(strip=True),
                    'type': 'pdf'
                })
        
        # Remove duplicates
        seen_urls = set()
        unique_attachments = []
        for attachment in attachments:
            if attachment['url'] not in seen_urls:
                seen_urls.add(attachment['url'])
                unique_attachments.append(attachment)
        
        return unique_attachments

    async def download_pdf_with_retry(self, session: aiohttp.ClientSession, pdf_url: str, filename: str, max_retries: int = 3) -> bool:
        """Download PDF with retry logic"""
        for attempt in range(max_retries):
            try:
                self.logger.info(f"Downloading PDF (attempt {attempt + 1}): {filename}")
                
                async with session.get(pdf_url, headers=REQUEST_HEADERS, timeout=30) as response:
                    if response.status == 200:
                        content = await response.read()
                        
                        # Basic PDF validation
                        if content.startswith(b'%PDF') or len(content) > 1000:
                            pdf_path = self.pdfs_dir / filename
                            with open(pdf_path, 'wb') as f:
                                f.write(content)
                            
                            self.logger.info(f"Successfully downloaded: {filename}")
                            return True
                        else:
                            self.logger.warning(f"Invalid PDF content for {filename}")
                    else:
                        self.logger.warning(f"HTTP {response.status} for {filename}")
                
            except Exception as e:
                self.logger.warning(f"Error downloading {filename} (attempt {attempt + 1}): {str(e)}")
            
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
        
        self.failed_downloads.append({
            'url': pdf_url,
            'filename': filename,
            'error': 'Max retries exceeded'
        })
        return False

    async def crawl_category(self, category_name: str, max_documents: Optional[int] = None, max_pages: Optional[int] = None):
        """Crawl documents from a specific category"""
        if category_name not in DOCUMENT_CATEGORIES:
            self.logger.error(f"Unknown category: {category_name}")
            return
        
        category_info = DOCUMENT_CATEGORIES[category_name]
        self.logger.info(f"Starting crawl for category: {category_name}")
        self.logger.info(f"URL: {category_info['url']}")
        
        browser, page = await self.start_browser()
        all_metadata = []
        
        try:
            # Get document links
            document_links = await self.get_document_links_with_pagination(
                page, category_info['url'], max_pages
            )
            
            if max_documents:
                document_links = document_links[:max_documents]
                self.logger.info(f"Limited to {max_documents} documents")
            
            # Process documents
            async with aiohttp.ClientSession() as session:
                for i, doc_link in enumerate(document_links, 1):
                    if doc_link['docid'] in self.processed_docids:
                        continue
                    
                    self.logger.info(f"Processing document {i}/{len(document_links)}: {doc_link['docid']}")
                    
                    # Extract metadata
                    metadata = await self.extract_document_metadata(
                        page, doc_link['url'], doc_link['docid']
                    )
                    metadata['category'] = category_name
                    
                    # Download PDFs if any
                    if 'attachments' in metadata:
                        for attachment in metadata['attachments']:
                            success = await self.download_pdf_with_retry(
                                session, 
                                attachment['url'], 
                                f"{doc_link['docid']}_{attachment['filename']}"
                            )
                            attachment['downloaded'] = success
                    
                    all_metadata.append(metadata)
                    self.processed_docids.add(doc_link['docid'])
                    
                    # Save metadata periodically
                    if i % CRAWLER_SETTINGS.get('save_frequency', 10) == 0:
                        self.save_metadata(all_metadata, category_name)
                    
                    # Rate limiting
                    await asyncio.sleep(CRAWLER_SETTINGS.get('delay_between_requests', 2))
            
            # Final save
            self.save_metadata(all_metadata, category_name)
            self.logger.info(f"Crawling completed for {category_name}. Processed {len(all_metadata)} documents")
            
        except Exception as e:
            self.logger.error(f"Error during crawling: {str(e)}")
            if all_metadata:
                self.save_metadata(all_metadata, category_name)
        
        finally:
            try:
                # Close all pages first
                for context in browser.contexts:
                    for page in context.pages:
                        await page.close()
                    await context.close()
                # Then close browser
                await browser.close()
            except Exception:
                pass  # Ignore cleanup errors

    def save_metadata(self, metadata_list: List[Dict], category_name: str = ""):
        """Save metadata to organized JSON and CSV directories"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Create base filename
        base_filename = f"documents_metadata_{category_name}_{timestamp}" if category_name else f"documents_metadata_{timestamp}"
        
        # JSON file in documents/json/ subdirectory
        json_filename = f"{base_filename}.json"
        json_path = self.json_dir / json_filename
        
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(metadata_list, f, ensure_ascii=False, indent=2)
        
        # CSV file in documents/csv/ subdirectory
        try:
            df = pd.DataFrame(metadata_list)
            csv_filename = f"{base_filename}.csv"
            csv_path = self.csv_dir / csv_filename
            df.to_csv(csv_path, index=False, encoding='utf-8')
            
            self.logger.info(f"Saved metadata for {len(metadata_list)} documents")
            self.logger.info(f"JSON: documents/json/{json_filename}")
            self.logger.info(f"CSV: documents/csv/{csv_filename}")
            
        except Exception as e:
            self.logger.error(f"Error saving CSV: {str(e)}")

    async def run(self, category: str = "legal_documents", max_documents: Optional[int] = None, max_pages: Optional[int] = None):
        """Run the enhanced crawler"""
        await self.crawl_category(category, max_documents, max_pages)

    async def get_pagination_info(self, page: Page) -> Dict[str, int]:
        """
        Extract pagination information from the page
        Returns: {'current_page': int, 'total_pages': int, 'total_documents': int, 'per_page': int}
        """
        try:
            pagination_info = await page.evaluate("""
            () => {
                // Look for pagination information in various formats
                const paginationText = document.querySelector('.th-detail span, .pagination-info, [class*="pag"]');
                if (paginationText) {
                    const text = paginationText.textContent.trim();
                    
                    // Parse patterns like "1 - 50 | 93983"
                    const match1 = text.match(/(\\d+)\\s*-\\s*(\\d+)\\s*\\|\\s*(\\d+)/);
                    if (match1) {
                        const start = parseInt(match1[1]);
                        const end = parseInt(match1[2]);
                        const total = parseInt(match1[3]);
                        const perPage = end - start + 1;
                        const totalPages = Math.ceil(total / perPage);
                        const currentPage = Math.ceil(start / perPage);
                        
                        return {
                            current_page: currentPage,
                            total_pages: totalPages,
                            total_documents: total,
                            per_page: perPage,
                            text: text
                        };
                    }
                    
                    // Parse patterns like "Page 1 of 1880" 
                    const match2 = text.match(/page\\s*(\\d+)\\s*of\\s*(\\d+)/i);
                    if (match2) {
                        return {
                            current_page: parseInt(match2[1]),
                            total_pages: parseInt(match2[2]),
                            total_documents: null,
                            per_page: null,
                            text: text
                        };
                    }
                }
                
                // Try to count pagination links
                const pageLinks = document.querySelectorAll('a[href*="Page$"]');
                const maxPage = Math.max(...Array.from(pageLinks).map(link => {
                    const match = link.href.match(/Page\\$(\\d+)/);
                    return match ? parseInt(match[1]) : 0;
                }));
                
                if (maxPage > 0) {
                    return {
                        current_page: 1,
                        total_pages: maxPage,
                        total_documents: null,
                        per_page: null,
                        text: `Detected ${maxPage} pages from links`
                    };
                }
                
                return null;
            }
            """)
            
            if pagination_info:
                self.logger.info(f"Pagination info: {pagination_info['text']}")
                self.logger.info(f"Total pages: {pagination_info.get('total_pages', 'Unknown')}, "
                               f"Total documents: {pagination_info.get('total_documents', 'Unknown')}")
                return pagination_info
            else:
                self.logger.warning("Could not extract pagination information")
                return {'current_page': 1, 'total_pages': 1, 'total_documents': 0, 'per_page': 50}
                
        except Exception as e:
            self.logger.error(f"Error extracting pagination info: {str(e)}")
            return {'current_page': 1, 'total_pages': 1, 'total_documents': 0, 'per_page': 50}


async def main():
    """Main function to run the enhanced crawler"""
    crawler = LegalDocumentCrawler()
    
    # Crawl legal documents
    await crawler.run(
        category="legal_documents",
        max_documents=50,  # Limit for testing
        max_pages=3  # Limit pages for testing
    )


if __name__ == "__main__":
    asyncio.run(main()) 