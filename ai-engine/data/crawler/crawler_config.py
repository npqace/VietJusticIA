"""
Configuration file for the Legal Document Crawler
"""

import os
from pathlib import Path

# Base Configuration
BASE_URL = "https://chinhphu.vn"
DATA_FILES_URL = "https://datafiles.chinhphu.vn"

# Output directories
OUTPUT_DIR = Path("../raw_data")
DOCUMENTS_DIR = OUTPUT_DIR / "documents"
PDFS_DIR = OUTPUT_DIR / "pdfs"
LOGS_DIR = OUTPUT_DIR / "logs"

# Document categories and their corresponding page IDs
DOCUMENT_CATEGORIES = {
    "legal_documents": {
        "url": "https://chinhphu.vn/?pageid=41852&mode=0",
        "description": "Main legal documents page"
    },
    "government_decrees": {
        "url": "https://chinhphu.vn/?pageid=27160&mode=1&category=1",
        "description": "Government decrees"
    },
    "prime_minister_decisions": {
        "url": "https://chinhphu.vn/?pageid=27160&mode=1&category=2", 
        "description": "Prime Minister decisions"
    },
    "ministerial_circulars": {
        "url": "https://chinhphu.vn/?pageid=27160&mode=1&category=3",
        "description": "Ministerial circulars"
    }
}

# Request headers matching browser behavior
REQUEST_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en,en-US;q=0.9,vi;q=0.8',
    'Sec-Ch-Ua': '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
    'Referer': 'https://chinhphu.vn/'
}

# Crawler settings
CRAWLER_SETTINGS = {
    'max_concurrent_requests': 5,
    'delay_between_requests': 2,  # seconds
    'timeout': 30,  # seconds
    'max_retries': 3,
    'headless_browser': False,  # Set to True for production
    'save_frequency': 10,  # Save metadata every N documents
    'user_data_dir': None,  # For persistent browser sessions
}

# Document metadata fields mapping (Vietnamese to English)
METADATA_FIELDS = {
    'số ký hiệu': 'document_number',
    'số văn bản': 'document_number', 
    'ngày ban hành': 'issue_date',
    'ngày ký': 'issue_date',
    'loại văn bản': 'document_type',
    'cơ quan ban hành': 'issuing_authority',
    'người ký': 'signer',
    'trích yếu': 'summary',
    'tóm tắt': 'summary',
    'nội dung': 'content',
    'lĩnh vực': 'category',
    'tình trạng hiệu lực': 'legal_status'
}

# File patterns for different document types
FILE_PATTERNS = {
    'pdf': ['.pdf'],
    'doc': ['.doc', '.docx'],
    'legal_doc': ['cv.signed.pdf', 'cp.signed.pdf', 'qd.signed.pdf']
}

# Logging configuration
LOGGING_CONFIG = {
    'level': 'INFO',
    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    'file': LOGS_DIR / 'crawler.log',
    'max_bytes': 10 * 1024 * 1024,  # 10MB
    'backup_count': 5
}

# Database settings (if needed for future use)
DATABASE_CONFIG = {
    'enabled': False,
    'url': os.getenv('DATABASE_URL', 'sqlite:///legal_documents.db'),
    'echo': False
}

# Export settings
EXPORT_FORMATS = ['json', 'csv', 'xlsx']

# Vietnamese month names for date parsing
VIETNAMESE_MONTHS = {
    'tháng 1': '01', 'tháng 01': '01',
    'tháng 2': '02', 'tháng 02': '02', 
    'tháng 3': '03', 'tháng 03': '03',
    'tháng 4': '04', 'tháng 04': '04',
    'tháng 5': '05', 'tháng 05': '05',
    'tháng 6': '06', 'tháng 06': '06',
    'tháng 7': '07', 'tháng 07': '07',
    'tháng 8': '08', 'tháng 08': '08',
    'tháng 9': '09', 'tháng 09': '09',
    'tháng 10': '10',
    'tháng 11': '11',
    'tháng 12': '12'
} 