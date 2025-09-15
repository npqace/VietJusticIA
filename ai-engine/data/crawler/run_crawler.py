"""
Main runner script for the Thu Vien Phap Luat Crawler.
"""
import argparse
import warnings
from pathlib import Path
from crawler import Crawler
# Import the centralized configuration
from crawler_config import CRAWLER_SETTINGS, OUTPUT_DIR

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description="Thu Vien Phap Luat Crawler",
        formatter_class=argparse.RawTextHelpFormatter,
        epilog="""
Examples:
  # Crawl 5 documents for a quick test
  python run_crawler.py --max-documents 5

  # Crawl the first 3 pages only
  python run_crawler.py --max-pages 3

  # Full crawl (be careful - this can take hours!)
  python run_crawler.py --full

  # Custom output directory
  python run_crawler.py --output-dir ./my_crawled_data --max-documents 10
        """
    )
    parser.add_argument(
        '--max-documents',
        type=int,
        default=None,
        help='Maximum number of total documents to crawl.'
    )
    parser.add_argument(
        '--max-pages',
        type=int,
        default=None,
        help='Maximum number of search result pages to crawl.'
    )
    parser.add_argument(
        '--full',
        action='store_true',
        help='Run a full crawl with no limits on pages or documents.'
    )
    parser.add_argument(
        '--output-dir',
        type=Path,
        # MODIFIED: Use the imported OUTPUT_DIR as the default
        default=OUTPUT_DIR,
        help='Specify a custom directory for the output data.'
    )
    parser.add_argument(
        '--start-at',
        type=int,
        default=1,
        help='Start crawling from a specific document number.'
    )
    args = parser.parse_args()

    # Logic for full crawl and default behavior
    if args.full:
        args.max_pages = float('inf')
        args.max_documents = float('inf')
    elif args.max_pages is None and args.max_documents is None:
        # Default behavior if no limits are set: run a small test crawl.
        print("⚠️ No limits set. Running a small test crawl (1 page, 5 documents).")
        args.max_pages = 1
        args.max_documents = 5

    return args

def print_header(args):
    """Prints the crawler's startup header."""
    max_pages_str = "No limit" if args.max_pages == float('inf') else args.max_pages or "Not set"
    max_docs_str = "No limit" if args.max_documents == float('inf') else args.max_documents or "Not set"
    header = f"""
============================================================
🏛️  Thu Vien Phap Luat Crawler
============================================================
📄 Max documents: {max_docs_str}
📃 Max pages: {max_pages_str}
� Start at document: {args.start_at}
�💾 Output directory: {args.output_dir.resolve()}
👁️  Headless mode: {CRAWLER_SETTINGS['headless_browser']}
============================================================
"""
    print(header)

def main():
    warnings.filterwarnings("ignore", message="unclosed transport", category=ResourceWarning)
    
    args = parse_arguments()
    print_header(args)

    print("🕷️  Starting crawler...")
    # Pass the custom output directory and start document to the crawler
    crawler = Crawler(output_dir=args.output_dir)
    crawler.run(
        max_pages=args.max_pages, 
        max_total_docs=args.max_documents,
        start_at_doc=args.start_at
    )

    print("\n🎉 Crawling complete!")
    print(f"Check the '{args.output_dir.resolve()}' directory for results.")

if __name__ == "__main__":
    main()