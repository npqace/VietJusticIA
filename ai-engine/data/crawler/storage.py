"""
Storage management for crawled documents.
Handles saving and checking for existing documents on disk.
"""
import json
import logging
import re
from pathlib import Path


class StorageManager:
    """Manages document storage and retrieval operations."""
    
    def __init__(self, documents_dir: Path, logger: logging.Logger):
        """
        Initialize the storage manager.
        
        Args:
            documents_dir: Directory path where documents will be stored.
            logger: Logger instance for logging storage operations.
        """
        self.documents_dir = documents_dir
        self.logger = logger
        self.documents_dir.mkdir(parents=True, exist_ok=True)
    
    @staticmethod
    def sanitize_folder_name(title: str) -> str:
        """
        Creates a safe folder name from a document title.
        
        Args:
            title: The document title.
        
        Returns:
            Sanitized folder name (max 100 chars).
        """
        return re.sub(r'[\\/*?:"<>|]', "", title)[:100].strip()
    
    def is_document_already_crawled(self, doc_id: str, doc_title: str) -> bool:
        """
        Checks if a document has already been fully crawled.
        
        Args:
            doc_id: The document ID.
            doc_title: The document title.
        
        Returns:
            True if all required files exist for this document, False otherwise.
        """
        folder_name = self.sanitize_folder_name(doc_title)
        doc_folder = self.documents_dir / folder_name
        
        if not doc_folder.exists():
            return False
        
        required_files = [
            doc_folder / "metadata.json",
            doc_folder / "content.txt",
            doc_folder / "page_content.html",
            doc_folder / "screenshot.png",
        ]
        
        # Check if all files exist and are not empty
        for file_path in required_files:
            if not file_path.exists() or file_path.stat().st_size == 0:
                return False
        
        # Verify the metadata has the correct doc_id
        try:
            with open(doc_folder / "metadata.json", 'r', encoding='utf-8') as f:
                metadata = json.load(f)
                stored_id = (
                    metadata.get("metadata", {}).get("_id") or 
                    metadata.get("metadata", {}).get("id")
                )
                if stored_id == doc_id:
                    return True
        except Exception:
            return False
        
        return False
    
    def save_document(
        self, 
        full_metadata: dict, 
        content_data: dict, 
        doc_number: int, 
        max_docs: int | None, 
        current_scraped_count: int
    ) -> bool:
        """
        Saves document data, combining API metadata and scraped content.
        
        Args:
            full_metadata: Full metadata from the API.
            content_data: Scraped content data including HTML and screenshots.
            doc_number: Document number for logging.
            max_docs: Maximum documents limit (for progress display).
            current_scraped_count: Current count of scraped documents.
        
        Returns:
            True if saved successfully, False otherwise.
        """
        try:
            title = content_data['title']
            folder_name = self.sanitize_folder_name(title)
            doc_folder = self.documents_dir / folder_name
            doc_folder.mkdir(parents=True, exist_ok=True)
            
            # Save HTML content
            (doc_folder / "page_content.html").write_text(
                content_data["raw_html"], encoding='utf-8'
            )
            
            # Save screenshot
            (doc_folder / "screenshot.png").write_bytes(content_data["screenshot_bytes"])
            
            # Save text content
            (doc_folder / "content.txt").write_text(
                content_data.get('content', ''), encoding='utf-8'
            )
            
            # Save metadata as JSON
            metadata_to_save = {
                "title": title,
                "metadata": full_metadata,
                "url": content_data.get("url", ""),
            }
            with open(doc_folder / "metadata.json", 'w', encoding='utf-8') as f:
                json.dump(metadata_to_save, f, ensure_ascii=False, indent=4)
            
            progress = f"({current_scraped_count}/{max_docs})" if max_docs else f"({doc_number})"
            self.logger.info(f"[SUCCESS] {progress} Saved: {folder_name}")
            return True
            
        except Exception as e:
            self.logger.error(
                f"[FAILURE] Failed to save data for {content_data.get('title', 'Unknown')}: {e}"
            )
            return False
