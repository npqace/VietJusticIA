"""
Legal Document Crawler Package for aitracuuluat.vn.

This package provides a modular web crawler for scraping Vietnamese legal documents.
It supports concurrent scraping, robots.txt compliance, and document deduplication.

Usage:
    python -m crawler --max-docs 10 --category "Giáo dục"
    
Modules:
    - config: Configuration settings and constants
    - logger: Logging setup with colored console output
    - api_client: API interactions with retry logic
    - scraper: Content extraction using Playwright
    - storage: Document persistence and deduplication
    - robots: Robots.txt handling
    - crawler: Main orchestrator class
"""

from .crawler import Crawler
from .config import CRAWLER_SETTINGS, SELECTORS

__all__ = ['Crawler', 'CRAWLER_SETTINGS', 'SELECTORS']
__version__ = '2.0.0'
