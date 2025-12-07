"""
Content scraper for extracting document content from web pages.
Uses Playwright for browser automation and BeautifulSoup for HTML parsing.
"""
import io
import logging

import pandas as pd
from bs4 import BeautifulSoup, Tag
from playwright.sync_api import BrowserContext

from .config import SITE_BASE_URL, SELECTORS, CRAWLER_SETTINGS


class ContentScraper:
    """Scrapes document content from web pages using browser automation."""
    
    def __init__(self, logger: logging.Logger, robot_checker=None):
        """
        Initialize the content scraper.
        
        Args:
            logger: Logger instance for logging scrape operations.
            robot_checker: Optional callable to check robots.txt permissions.
        """
        self.logger = logger
        self.robot_checker = robot_checker
    
    def extract_content_text(self, content_element: Tag | None) -> str:
        """
        Extracts and formats text from the content container.
        Handles paragraphs, tables, and line breaks.
        
        Args:
            content_element: BeautifulSoup Tag containing the content.
        
        Returns:
            Formatted text content as a string.
        """
        if not content_element:
            return ""
        
        # Replace <br> tags with newlines
        for br in content_element.find_all("br"):
            br.replace_with("\n")
        
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
                    # Fallback: extract table text manually
                    rows = []
                    for row in element.find_all('tr'):
                        cells = [cell.get_text(strip=True) for cell in row.find_all(['td', 'th'])]
                        rows.append('\t'.join(cells))
                    text_blocks.append('\n'.join(rows))
            else:
                p_text = ' '.join(element.get_text().split())
                if p_text:
                    text_blocks.append(p_text)
        
        return '\n\n'.join(text_blocks)
    
    def scrape_document_content(
        self, 
        doc_api_data: dict, 
        browser_context: BrowserContext, 
        doc_number: int
    ) -> dict | None:
        """
        Scrapes the full text content of a single document page in a new tab.
        
        Args:
            doc_api_data: API data for the document (must include 'id' and 'diagram').
            browser_context: Playwright browser context for creating new pages.
            doc_number: Document number for logging purposes.
        
        Returns:
            Dictionary with scraped content, or None if scraping failed.
        """
        doc_id = doc_api_data.get("id")
        if not doc_id:
            self.logger.error(f"Document data from API is missing 'id' for doc number {doc_number}.")
            return None

        content_url = f"{SITE_BASE_URL}/legal-documents/{doc_id}?tab=noi_dung"
        
        # Check robots.txt if checker is provided
        if self.robot_checker and not self.robot_checker(content_url):
            self.logger.warning(f"Scraping disallowed for {content_url} by robots.txt. Skipping.")
            return None

        page = browser_context.new_page()
        try:
            self.logger.info(f"[Thread] Navigating to: {content_url}")
            page.goto(
                content_url, 
                wait_until='domcontentloaded', 
                timeout=CRAWLER_SETTINGS['timeout'] * 1000
            )
            page.wait_for_selector(SELECTORS["document_content_container"], timeout=50000)
            
            html_content = page.content()
            screenshot_bytes = page.screenshot(full_page=True)
            soup = BeautifulSoup(html_content, 'html.parser')
            
            main_content_element = soup.select_one(SELECTORS["document_content_container"])
            main_content = self.extract_content_text(main_content_element)
            title_text = doc_api_data.get("diagram", {}).get("ten", "Untitled Document")

            return {
                "title": title_text,
                "content": main_content,
                "url": content_url,
                "raw_html": html_content,
                "screenshot_bytes": screenshot_bytes,
            }
        except Exception as e:
            self.logger.error(f"Failed to scrape content for doc {doc_number} ({content_url}): {e}")
            return None
        finally:
            page.close()
