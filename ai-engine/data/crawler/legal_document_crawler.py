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
        Extract all document links with pagination support
        """
        all_document_links = []
        
        # For simplicity, start with just the first page
        page_num = 1
        max_attempts = max_pages if max_pages else 10  # Default to 10 pages max
        
        for page_num in range(1, max_attempts + 1):
            try:
                # Construct URL for current page
                if '?' in base_url:
                    page_url = f"{base_url}&page={page_num}"
                else:
                    page_url = f"{base_url}?page={page_num}"
                
                self.logger.info(f"Crawling page {page_num}: {page_url}")
                
                page_links = await self.get_document_links_from_page(page, page_url)
                
                if not page_links and page_num > 1:
                    self.logger.info(f"No more documents found at page {page_num}, stopping pagination")
                    break
                    
                all_document_links.extend(page_links)
                
                # Add delay between pages
                await asyncio.sleep(CRAWLER_SETTINGS.get('delay_between_requests', 2))
                
            except Exception as e:
                self.logger.error(f"Error crawling page {page_num}: {str(e)}")
                if page_num == 1:  # If first page fails, stop
                    break
                continue
        
        # Remove duplicates
        unique_links = self.remove_duplicate_links(all_document_links)
        self.logger.info(f"Found {len(unique_links)} unique documents across pages")
        
        return unique_links

    async def get_document_links_from_page(self, page: Page, url: str) -> List[Dict[str, str]]:
        """Extract document links from a single page"""
        await page.goto(url, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(3000)
        
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
                        'page_url': url
                    })
        
        self.logger.info(f"Found {len(document_links)} documents on page")
        return document_links

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