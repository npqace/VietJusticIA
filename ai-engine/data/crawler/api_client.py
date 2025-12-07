"""
API client for interacting with the aitracuuluat.vn API.
Handles document fetching with retry logic and rate limiting.
"""
import logging
import requests
import backoff

from .config import API_BASE_URL, API_PAGE_SIZE, CRAWLER_SETTINGS


class APIClient:
    """Client for fetching legal document data from the API."""
    
    def __init__(self, headers: dict, logger: logging.Logger):
        """
        Initialize the API client.
        
        Args:
            headers: HTTP headers including authorization.
            logger: Logger instance for logging API operations.
        """
        self.headers = headers
        self.logger = logger
    
    @backoff.on_exception(backoff.expo, requests.exceptions.RequestException, max_tries=5, factor=2)
    def get_documents_page(self, page_num: int, category: str | None = None) -> tuple[list, int]:
        """
        Fetches a page of documents from the API.
        
        Args:
            page_num: The page number to fetch.
            category: Optional category filter (e.g., "Giáo dục").
        
        Returns:
            A tuple of (list of documents, total document count).
        """
        params = {"page": page_num, "pageSize": API_PAGE_SIZE}
        
        if category:
            params["linh_vuc_nganh"] = category
        if CRAWLER_SETTINGS['status_filter']:
            params['tinh_trang'] = CRAWLER_SETTINGS['status_filter']

        try:
            response = requests.get(
                API_BASE_URL, 
                headers=self.headers, 
                params=params, 
                timeout=60
            )
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
    def get_full_metadata(self, doc_id: str) -> dict | None:
        """
        Fetches the full metadata for a single document from the API.
        
        Args:
            doc_id: The document ID to fetch metadata for.
        
        Returns:
            Dictionary containing full document metadata, or None if failed.
        """
        metadata_url = f"{API_BASE_URL}/{doc_id}"
        self.logger.info(f"Fetching full metadata from {metadata_url}")
        
        try:
            response = requests.get(metadata_url, headers=self.headers, timeout=60)
            response.raise_for_status()
            data = response.json()
            full_metadata = data.get("data", {})
            self.logger.info(f"Successfully fetched full metadata for doc ID {doc_id}.")
            return full_metadata
        except requests.exceptions.RequestException as e:
            self.logger.error(f"API request for full metadata of doc ID {doc_id} failed: {e}")
            return None
