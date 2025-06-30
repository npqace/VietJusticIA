# Vietnamese Legal Document Crawler

This crawler is designed to extract Vietnamese legal documents from the official government website [chinhphu.vn](https://chinhphu.vn). It uses Playwright for web automation and can download both document metadata and associated PDF files.

## Features

- 🕷️ **Web Scraping**: Uses Playwright for reliable web automation
- 📄 **Document Extraction**: Extracts metadata including document numbers, dates, signers, etc.
- 📁 **PDF Downloads**: Automatically downloads associated PDF documents
- 🔄 **Pagination Support**: Can crawl multiple pages of documents
- 💾 **Multiple Formats**: Saves data in JSON and CSV formats
- 🔧 **Configurable**: Flexible configuration for different crawling scenarios
- 📝 **Logging**: Comprehensive logging for monitoring and debugging
- 🛡️ **Error Handling**: Robust error handling with retry mechanisms

## Installation

1. **Install Python Dependencies**:
   ```bash
   cd ai-engine/data
   pip install -r requirements.txt
   ```

2. **Install Playwright Browsers**:
   ```bash
   playwright install
   ```

## Quick Start

### Basic Usage

```bash
# Quick test (crawl 5 documents from 1 page)
python run_crawler.py --test

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

# Full crawl (WARNING: Can take hours!)
python run_crawler.py --full
```

## Configuration Options

### Command Line Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `--category` | Document category to crawl | `legal_documents` |
| `--max-documents` | Maximum number of documents | No limit |
| `--max-pages` | Maximum number of pages | No limit |
| `--output-dir` | Output directory | `data/raw_data` |
| `--test` | Quick test mode (5 docs, 1 page) | False |
| `--full` | Full crawl (no limits) | False |
| `--headless` | Run browser in headless mode | False |

### Available Categories

- `legal_documents` - Main legal documents page
- `government_decrees` - Government decrees
- `prime_minister_decisions` - Prime Minister decisions  
- `ministerial_circulars` - Ministerial circulars

## Output Structure

The crawler creates the following directory structure:

```
data/raw_data/
├── documents/                    # HTML content (if needed)
├── pdfs/                        # Downloaded PDF files
├── logs/                        # Log files
├── documents_metadata_YYYYMMDD_HHMMSS.json  # Metadata in JSON
└── documents_metadata_YYYYMMDD_HHMMSS.csv   # Metadata in CSV
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
from enhanced_legal_crawler import EnhancedLegalDocumentCrawler

async def main():
    crawler = EnhancedLegalDocumentCrawler(output_dir="my_data")
    
    await crawler.run(
        category="legal_documents",
        max_documents=10,
        max_pages=2
    )

asyncio.run(main())
```

## Configuration File

You can modify `crawler_config.py` to customize:

- Request headers
- Crawler settings (delays, timeouts, etc.)
- Document categories and URLs
- Metadata field mappings
- Output formats

## Monitoring and Logging

The crawler provides detailed logging:

- **Console Output**: Real-time progress updates
- **Log Files**: Detailed logs saved to `data/raw_data/logs/`
- **Error Tracking**: Failed downloads and errors are logged separately

Example log output:
```
2025-01-07 10:30:15 - INFO - Starting legal document crawler
2025-01-07 10:30:16 - INFO - Found 25 unique documents across pages
2025-01-07 10:30:17 - INFO - Processing document 1/25: 214168
2025-01-07 10:30:18 - INFO - Extracting metadata for document 214168
2025-01-07 10:30:19 - INFO - Downloading PDF: 214168_159-cp.signed.pdf
2025-01-07 10:30:20 - INFO - Successfully downloaded: 214168_159-cp.signed.pdf
```

## Performance Tips

1. **Start Small**: Use `--test` or limit documents for initial testing
2. **Rate Limiting**: The crawler includes built-in delays to be respectful to the server
3. **Monitor Resources**: PDF downloads can use significant disk space
4. **Headless Mode**: Use `--headless` for production environments to save resources
5. **Resume Capability**: The crawler tracks processed documents to avoid duplicates

## Troubleshooting

### Common Issues

1. **Browser Installation**:
   ```bash
   playwright install chromium
   ```

2. **Permission Errors**:
   ```bash
   chmod +x run_crawler.py
   ```

3. **Network Timeouts**:
   - Increase timeout values in `crawler_config.py`
   - Check internet connection
   - Some documents may be temporarily unavailable

4. **PDF Download Failures**:
   - Check the log files for specific error messages
   - Some PDFs may require authentication or have access restrictions
   - Network issues can cause download failures

### Debug Mode

For debugging, you can:

1. Set `headless_browser: False` in config to see the browser
2. Increase logging verbosity
3. Use smaller test datasets
4. Check the log files for detailed error information

## Legal and Ethical Considerations

- **Respect Rate Limits**: The crawler includes delays to avoid overwhelming the server
- **Public Data**: Only crawls publicly available government documents
- **Terms of Service**: Ensure compliance with the website's terms of service
- **Academic/Research Use**: Intended for legitimate research and academic purposes

## Contributing

To contribute improvements:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## Support

For issues or questions:

1. Check the log files for error details
2. Review this README for configuration options
3. Create an issue with reproduction steps and log output

---

**Note**: This crawler is designed to work with the current structure of chinhphu.vn. Website changes may require updates to the extraction logic. 