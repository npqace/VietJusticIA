#!/usr/bin/env python3
"""
Test script for ASP.NET postback pagination on chinhphu.vn
"""

import asyncio
import sys
from pathlib import Path

# Add the current directory to path to import our modules
sys.path.append(str(Path(__file__).parent))

from legal_document_crawler import LegalDocumentCrawler


async def test_pagination():
    """Test the pagination functionality"""
    print("🧪 Testing ASP.NET Postback Pagination")
    print("=" * 50)
    
    crawler = LegalDocumentCrawler()
    
    # Test URL from chinhphu.vn
    test_url = "https://chinhphu.vn/?pageid=41852&mode=0"
    
    browser, page = await crawler.start_browser()
    
    try:
        print(f"📄 Loading page: {test_url}")
        await page.goto(test_url, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(3000)
        
        # Test pagination info extraction
        print("\n📊 Extracting pagination information...")
        pagination_info = await crawler.get_pagination_info(page)
        print(f"   Current page: {pagination_info.get('current_page', 'Unknown')}")
        print(f"   Total pages: {pagination_info.get('total_pages', 'Unknown')}")
        print(f"   Total documents: {pagination_info.get('total_documents', 'Unknown')}")
        print(f"   Per page: {pagination_info.get('per_page', 'Unknown')}")
        
        # Test document extraction from first page
        print("\n📋 Extracting documents from page 1...")
        page1_docs = await crawler.extract_document_links_from_current_page(page)
        print(f"   Found {len(page1_docs)} documents on page 1")
        
        if page1_docs:
            print("   Sample documents:")
            for i, doc in enumerate(page1_docs[:3]):
                print(f"     {i+1}. {doc['title'][:60]}... (ID: {doc['docid']})")
        
        # Test navigation to page 2
        if pagination_info.get('total_pages', 0) > 1:
            print("\n🔄 Testing navigation to page 2...")
            success = await crawler.navigate_to_next_page(page, 2)
            
            if success:
                print("   ✅ Successfully navigated to page 2")
                
                # Extract documents from page 2
                await page.wait_for_timeout(2000)
                page2_docs = await crawler.extract_document_links_from_current_page(page)
                print(f"   Found {len(page2_docs)} documents on page 2")
                
                if page2_docs:
                    print("   Sample documents from page 2:")
                    for i, doc in enumerate(page2_docs[:3]):
                        print(f"     {i+1}. {doc['title'][:60]}... (ID: {doc['docid']})")
                
                # Check if documents are different
                page1_ids = {doc['docid'] for doc in page1_docs}
                page2_ids = {doc['docid'] for doc in page2_docs}
                overlap = page1_ids.intersection(page2_ids)
                
                if overlap:
                    print(f"   ⚠️  Found {len(overlap)} duplicate documents between pages")
                else:
                    print("   ✅ No duplicate documents - pagination working correctly")
                    
            else:
                print("   ❌ Failed to navigate to page 2")
        else:
            print("\n📄 Only one page available - skipping page navigation test")
        
        print("\n" + "=" * 50)
        print("🎯 Pagination test completed!")
        
    except Exception as e:
        print(f"\n❌ Error during testing: {str(e)}")
        import traceback
        traceback.print_exc()
        
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


if __name__ == "__main__":
    asyncio.run(test_pagination())