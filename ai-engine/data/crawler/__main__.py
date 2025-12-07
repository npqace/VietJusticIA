"""
Command-line interface for the legal document crawler.
Entry point for running the crawler from the command line.
"""
import argparse

from .crawler import Crawler
from .config import CRAWLER_SETTINGS


def parse_arguments() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="API-based scraper for aitracuuluat.vn. Can filter by category.",
        formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument(
        '--max-docs', 
        type=int, 
        default=None, 
        help='Maximum number of total documents to scrape.'
    )
    parser.add_argument(
        '--max-pages', 
        type=int, 
        default=None, 
        help='Maximum number of API pages to fetch.'
    )
    parser.add_argument(
        '--status-filter', 
        type=str, 
        default='Còn hiệu lực', 
        help='Filter documents by status (e.g., "Còn hiệu lực", "Hết hiệu lực").'
    )
    parser.add_argument(
        '--category', 
        type=str, 
        default=None, 
        help='Specify a category to scrape (e.g., "Giáo dục"). Scrapes all if not specified.'
    )
    return parser.parse_args()


def main() -> None:
    """Main entry point for the crawler CLI."""
    args = parse_arguments()
    crawler = Crawler()
    
    try:
        # Update crawler settings with command line arguments
        if args.status_filter:
            CRAWLER_SETTINGS['status_filter'] = args.status_filter
            crawler.logger.info(f"Status filter enabled: '{args.status_filter}'")
        
        if args.category:
            crawler.category = args.category
            crawler.logger.info(f"Category filter enabled: '{args.category}'")
        else:
            crawler.logger.info("No category specified, scraping all categories.")
        
        crawler.run(max_pages=args.max_pages, max_docs=args.max_docs)
        
    except KeyboardInterrupt:
        crawler.logger.info("Crawler stopped by user.")
    except Exception as e:
        crawler.logger.critical(f"[CRITICAL ERROR] An unexpected error occurred: {e}")
        crawler.logger.critical(
            "   Please ensure Chrome is running with debugging and your .env file is set up."
        )


if __name__ == "__main__":
    main()
