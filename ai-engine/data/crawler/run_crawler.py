#!/usr/bin/env python3
"""
Simple runner script for the Vietnamese Legal Document Crawler
"""

import asyncio
import argparse
import sys
from pathlib import Path

# Add the current directory to path to import our modules
sys.path.append(str(Path(__file__).parent))

from legal_document_crawler import LegalDocumentCrawler


def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description="Vietnamese Legal Document Crawler",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Crawl 10 documents for testing
  python run_crawler.py --max-documents 10

  # Crawl first 3 pages only
  python run_crawler.py --max-pages 3

  # Crawl specific category with limits
  python run_crawler.py --category legal_documents --max-documents 50 --max-pages 5

  # Full crawl (be careful - this can take hours!)
  python run_crawler.py --full

  # Custom output directory
  python run_crawler.py --output-dir /path/to/output --max-documents 20
        """
    )
    
    parser.add_argument(
        "--category",
        default="legal_documents",
        choices=["legal_documents", "government_decrees", "prime_minister_decisions", "ministerial_circulars"],
        help="Category of documents to crawl (default: legal_documents)"
    )
    
    parser.add_argument(
        "--max-documents",
        type=int,
        default=None,
        help="Maximum number of documents to crawl (default: no limit)"
    )
    
    parser.add_argument(
        "--max-pages",
        type=int,
        default=None,
        help="Maximum number of pages to crawl (default: no limit)"
    )
    
    parser.add_argument(
        "--output-dir",
        type=str,
        default="../raw_data",
        help="Output directory for crawled data (default: ../raw_data)"
    )
    
    parser.add_argument(
        "--full",
        action="store_true",
        help="Perform a full crawl (removes all limits - use with caution)"
    )
    
    parser.add_argument(
        "--test",
        action="store_true",
        help="Test run with minimal documents (equivalent to --max-documents 5 --max-pages 1)"
    )
    
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run browser in headless mode (no GUI)"
    )
    
    return parser.parse_args()


async def main():
    """Main function"""
    args = parse_arguments()
    
    # Handle test mode
    if args.test:
        args.max_documents = 5
        args.max_pages = 1
        print("🧪 Running in TEST mode (5 documents, 1 page)")
    
    # Handle full mode
    if args.full:
        args.max_documents = None
        args.max_pages = None
        print("🚀 Running FULL crawl (no limits) - this may take a very long time!")
        response = input("Are you sure you want to continue? (y/N): ")
        if response.lower() != 'y':
            print("Cancelled.")
            return
    
    # Display configuration
    print("\n" + "="*60)
    print("🏛️  Vietnamese Legal Document Crawler")
    print("="*60)
    print(f"📂 Category: {args.category}")
    print(f"📄 Max documents: {args.max_documents if args.max_documents else 'No limit'}")
    print(f"📃 Max pages: {args.max_pages if args.max_pages else 'No limit'}")
    print(f"💾 Output directory: {args.output_dir}")
    print(f"👁️  Headless mode: {args.headless}")
    print("="*60)
    
    # Initialize crawler
    try:
        crawler = LegalDocumentCrawler(output_dir=args.output_dir)
        
        # Modify crawler settings if needed
        if args.headless:
            # Note: This would require modifying the crawler to accept runtime settings
            print("⚠️  Headless mode setting noted (may require crawler modification)")
        
        # Run crawler
        print("\n🕷️  Starting crawler...")
        await crawler.run(
            category=args.category,
            max_documents=args.max_documents,
            max_pages=args.max_pages
        )
        
        print("\n✅ Crawling completed successfully!")
        print(f"📁 Check output directory: {args.output_dir}")
        
    except KeyboardInterrupt:
        print("\n⏹️  Crawling interrupted by user")
    except Exception as e:
        print(f"\n❌ Error during crawling: {str(e)}")
        import traceback
        traceback.print_exc()


def quick_test():
    """Quick test function for development"""
    print("🧪 Running quick test...")
    
    async def test_run():
        crawler = LegalDocumentCrawler()
        await crawler.run(
            category="legal_documents",
            max_documents=3,
            max_pages=1
        )
    
    asyncio.run(test_run())


if __name__ == "__main__":
    # Check if this is a direct call for testing
    if len(sys.argv) == 1:
        print("No arguments provided. Running quick test...")
        quick_test()
    else:
        asyncio.run(main()) 