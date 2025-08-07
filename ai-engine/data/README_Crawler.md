# Vietnamese Legal Document Crawler

This crawler is designed to extract Vietnamese legal documents from the official government website [chinhphu.vn](https://chinhphu.vn). It uses Playwright for web automation with **ASP.NET postback pagination support** and can download both document metadata and associated PDF files.

## Features

- 🕷️ **Web Scraping**: Uses Playwright for reliable web automation
- 🔄 **ASP.NET Postback Pagination**: Advanced pagination handling for chinhphu.vn's WebForms architecture
- 📄 **Document Extraction**: Extracts metadata including document numbers, dates, signers, etc.
- 📁 **PDF Downloads**: Automatically downloads associated PDF documents with retry logic
- 🔍 **Smart Pagination Detection**: Auto-detects total pages and documents (93,983+ documents available!)
- 💾 **Organized Output**: Saves data in structured JSON/CSV format with organized directory structure
- 🔧 **Configurable**: Flexible configuration for different crawling scenarios
- 📝 **Comprehensive Logging**: Detailed logging for monitoring and debugging
- 🛡️ **Robust Error Handling**: Multiple fallback methods for pagination and downloads
- 🧪 **Testing Framework**: Built-in pagination testing tools

## Installation

1. **Navigate to the crawler directory**:
   ```bash
   cd ai-engine/data/crawler
   ```

2. **Install Python Dependencies**:
   ```bash
   pip install -r ../requirements.txt
   ```

3. **Install Playwright Browsers**:
   ```bash
   playwright install chromium
   ```

4. **Optional: Run setup script**:
   ```bash
   python setup_crawler.py
   ```

## Quick Start

### Basic Usage

```bash
# Navigate to crawler directory
cd ai-engine/data/crawler

# Quick test (crawl 5 documents from 1 page)
python run_crawler.py --test

# Test pagination functionality
python test_pagination.py

# Crawl 20 documents for testing
python run_crawler.py --max-documents 20

# Crawl first 3 pages only
python run_crawler.py --max-pages 3
```

### Advanced Usage

```bash
# Crawl specific category with limits
python run_crawler.py --category legal_documents --max-documents 50 --max-pages 5

# Custom output directory
python run_crawler.py --output-dir /path/to/output --max-documents 20

# Medium test run
python run_crawler.py --max-pages 5 --max-documents 100

# Full crawl (WARNING: Can take many hours! 93,983+ documents)
python run_crawler.py --full
```

## ASP.NET Postback Pagination

This crawler uses advanced pagination handling specifically designed for chinhphu.vn's **ASP.NET WebForms** architecture:

### How It Works

- **Smart Detection**: Automatically detects pagination info like "1 - 50 | 93983"
- **Three-Tier Approach**: 
  1. Direct link clicking
  2. JavaScript `__doPostBack` execution
  3. Manual ViewState form posting
- **Fallback Methods**: Multiple strategies ensure reliable page navigation

### Testing Pagination

```bash
# Test the pagination system
python test_pagination.py
```

This will:
- ✅ Extract pagination information
- ✅ Test document extraction from page 1
- ✅ Navigate to page 2 using postback
- ✅ Verify no duplicate documents between pages

## Configuration Options

### Command Line Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `--category` | Document category to crawl | `legal_documents` |
| `--max-documents` | Maximum number of documents | No limit |
| `--max-pages` | Maximum number of pages | No limit |
| `--output-dir` | Output directory | `../raw_data` |
| `--test` | Quick test mode (5 docs, 1 page) | False |
| `--full` | Full crawl (no limits) | False |
| `--headless` | Run browser in headless mode | False |

### Available Categories

- `legal_documents` - Main legal documents page (~1,880 pages, 93,983+ documents)
- `government_decrees` - Government decrees
- `prime_minister_decisions` - Prime Minister decisions  
- `ministerial_circulars` - Ministerial circulars

## Output Structure

The crawler creates the following organized directory structure:

```
ai-engine/data/raw_data/
├── documents/
│   ├── json/                    # JSON metadata files
│   │   └── documents_metadata_legal_documents_YYYYMMDD_HHMMSS.json
│   └── csv/                     # CSV metadata files
│       └── documents_metadata_legal_documents_YYYYMMDD_HHMMSS.csv
├── pdfs/                        # Downloaded PDF files
│   ├── 214168_159-cp.signed.pdf
│   └── ...
└── logs/                        # Log files
    └── crawler_YYYYMMDD_HHMMSS.log
```

### Metadata Fields

Each document record contains:

```json
{
  "docid": "214168",
  "url": "https://chinhphu.vn/?pageid=27160&docid=214168",
  "extracted_at": "2025-01-07T10:30:00",
  "title": "Document title in Vietnamese",
  "document_number": "159/2025/NĐ-CP",
  "issue_date": "29-06-2025",
  "document_type": "Nghị định",
  "issuing_authority": "Chính phủ",
  "signer": "Thủ tướng Chính phủ",
  "summary": "Document summary...",
  "category": "legal_documents",
  "attachments": [
    {
      "url": "https://datafiles.chinhphu.vn/cpp/files/vbpq/2025/6/159-cp.signed.pdf",
      "filename": "159-cp.signed.pdf",
      "text": "Link text",
      "type": "pdf",
      "downloaded": true
    }
  ]
}
```

## Programming Usage

You can also use the crawler programmatically:

```python
import asyncio
import sys
from pathlib import Path

# Add crawler directory to path
sys.path.append(str(Path(__file__).parent / "crawler"))

from legal_document_crawler import LegalDocumentCrawler

async def main():
    crawler = LegalDocumentCrawler(output_dir="../raw_data")
    
    await crawler.run(
        category="legal_documents",
        max_documents=10,
        max_pages=2
    )

asyncio.run(main())
```

### Testing Pagination Programmatically

```python
import asyncio
from legal_document_crawler import LegalDocumentCrawler

async def test_pagination():
    crawler = LegalDocumentCrawler()
    browser, page = await crawler.start_browser()
    
    try:
        # Load the page
        await page.goto("https://chinhphu.vn/?pageid=41852&mode=0")
        
        # Get pagination info
        pagination_info = await crawler.get_pagination_info(page)
        print(f"Total documents: {pagination_info.get('total_documents')}")
        print(f"Total pages: {pagination_info.get('total_pages')}")
        
        # Test navigation
        success = await crawler.navigate_to_next_page(page, 2)
        print(f"Navigation successful: {success}")
        
    finally:
        await browser.close()

asyncio.run(test_pagination())
```

## Configuration File

You can modify `crawler_config.py` to customize:

- Request headers for browser simulation
- Crawler settings (delays, timeouts, retry logic)
- Document categories and URLs
- Metadata field mappings (Vietnamese to English)
- Output formats and directory structure

## Monitoring and Logging

The crawler provides detailed logging:

- **Console Output**: Real-time progress updates with pagination info
- **Log Files**: Detailed logs saved to `../raw_data/logs/`
- **Error Tracking**: Failed downloads and pagination errors are logged separately

Example log output:
```
2025-01-07 10:30:15 - INFO - Starting pagination crawl from: https://chinhphu.vn/?pageid=41852&mode=0
2025-01-07 10:30:16 - INFO - Pagination info: 1 - 50 | 93983
2025-01-07 10:30:16 - INFO - Total pages: 1880, Total documents: 93983
2025-01-07 10:30:16 - INFO - Will crawl up to 3 pages (total available: 1880)
2025-01-07 10:30:17 - INFO - Crawling page 1
2025-01-07 10:30:17 - INFO - Found 50 documents on page 1
2025-01-07 10:30:18 - INFO - Clicking pagination link for page 2
2025-01-07 10:30:19 - INFO - Processing document 1/100: 214168
2025-01-07 10:30:20 - INFO - Downloading PDF: 214168_159-cp.signed.pdf
```

## Performance Tips

1. **Start Small**: Always use `--test` for initial testing
2. **Understand Scale**: With 93,983+ documents, a full crawl can take **many hours**
3. **Rate Limiting**: Built-in 2-second delays mean ~1 hour per 100 pages
4. **Storage Planning**: Expect several GB of PDF files for large crawls
5. **Headless Mode**: Use `--headless` for production to save resources
6. **Resume Capability**: The crawler tracks processed documents to avoid duplicates
7. **Pagination Testing**: Run `test_pagination.py` before large crawls

## Project Structure

```
ai-engine/data/
├── crawler/                     # Main crawler code
│   ├── legal_document_crawler.py    # Main crawler class
│   ├── crawler_config.py           # Configuration settings
│   ├── run_crawler.py              # Command-line interface
│   ├── setup_crawler.py            # Installation script
│   └── test_pagination.py          # Pagination testing
├── raw_data/                    # Output directory
│   ├── documents/               # Organized metadata
│   ├── pdfs/                   # Downloaded PDFs
│   └── logs/                   # Log files
├── requirements.txt            # Python dependencies
└── README_Crawler.md          # This file
```

## Troubleshooting

### Common Issues

1. **Browser Installation**:
   ```bash
   cd ai-engine/data/crawler
   playwright install chromium
   ```

2. **Import Errors**:
   ```bash
   # Make sure you're in the crawler directory
   cd ai-engine/data/crawler
   python run_crawler.py --test
   ```

3. **Pagination Issues**:
   ```bash
   # Test pagination specifically
   python test_pagination.py
   ```

4. **Network Timeouts**:
   - Increase timeout values in `crawler_config.py`
   - Check internet connection
   - Some documents may be temporarily unavailable

5. **PDF Download Failures**:
   - Check the log files for specific error messages
   - Some PDFs may require authentication
   - Network issues can cause download failures

### Debug Mode

For debugging:

1. Set `headless_browser: False` in config to see the browser
2. Use `python test_pagination.py` to test navigation
3. Start with `--test` mode for small datasets
4. Check log files in `../raw_data/logs/` for detailed error information

## Legal and Ethical Considerations

- **Respect Rate Limits**: Built-in delays to avoid overwhelming the server
- **Public Data**: Only crawls publicly available government documents
- **Terms of Service**: Ensure compliance with chinhphu.vn's terms of service
- **Academic/Research Use**: Intended for legitimate research and academic purposes
- **Responsible Crawling**: Uses browser-like headers and respectful request patterns

## Scale Considerations

⚠️ **Important**: The legal documents collection contains **93,983+ documents** across **~1,880 pages**:

- **Test Mode**: `--test` (5 documents) - Safe for testing
- **Small Crawl**: `--max-pages 5` (~250 documents) - Good for development
- **Medium Crawl**: `--max-pages 50` (~2,500 documents) - Substantial dataset
- **Full Crawl**: `--full` (93,983+ documents) - **Can take 8+ hours!**

## Contributing

To contribute improvements:

1. Fork the repository
2. Test pagination with `python test_pagination.py`
3. Create a feature branch
4. Add tests for new functionality
5. Submit a pull request

## Support

For issues or questions:

1. Run `python test_pagination.py` to test core functionality
2. Check the log files in `../raw_data/logs/` for error details
3. Review this README for configuration options
4. Create an issue with reproduction steps and log output

---

**Note**: This crawler is specifically designed for chinhphu.vn's ASP.NET WebForms architecture with postback pagination. Website changes may require updates to the extraction logic.