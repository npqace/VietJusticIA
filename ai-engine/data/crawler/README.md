# AI Tra Cuu Luat Crawler (v7 - Filtered API)

This directory contains an advanced, concurrent Python web crawler for `aitracuuluat.vn`.

This version has been optimized to use the website's internal API with a status filter, making it significantly faster and more efficient. It now fetches only document metadata for "Còn hiệu lực" (Effective) documents by default. Playwright browser automation is then used for extracting the full text content of each document.

## 1. How it Works

1.  **API Metadata Fetching**: The crawler authenticates with the site's API using a bearer token. It requests a list of documents, which can be filtered by category (e.g., "Giáo dục" - Education) and status. By default, it scrapes all categories and filters for documents with the status "Còn hiệu lực" (Effective).
2.  **Concurrent Content Scraping**: Using a `ThreadPoolExecutor`, the script launches multiple worker threads to scrape the document content pages in parallel. This dramatically speeds up the overall crawling process.
3.  **Playwright Browser Automation**: Each worker thread connects to a pre-launched Chrome browser instance via the debugging port. It then scrapes the document content, ensuring reliable access to the full text.
4.  **Default Status Filtering**: The crawler is now hardcoded to prioritize "Còn hiệu lực" documents. While the `--status-filter` argument still exists, its default is set to ensure that the most relevant documents are scraped.

## 2. Setup and Usage

### Prerequisites
- Python 3.8 or higher
- Google Chrome browser installed
- `pip` (Python package installer)
- Playwright (installed automatically by setup script)

### Step 1: Install Dependencies
If you are setting up the project for the first time, run the setup script. This will create the necessary output directory, install all required Python packages, and set up Playwright browsers.

```bash
python setup_crawler.py
```

### Step 2: Create the `.env` File
This is a mandatory one-time setup step.

1.  Create a file named `.env` in the `ai-engine/data/crawler/` directory.
2.  Add the following line to the file, replacing `your_token_here` with your actual bearer token:
    ```
    AUTH_TOKEN=your_token_here
    ```
3.  **How to get the Bearer Token:**
    -   Open Chrome, log in to `aitracuuluat.vn`.
    -   Open Developer Tools (F12) and go to the **Network** tab.
    -   Filter for `legal-documents` and refresh the document list page.
    -   Click on one of the `legal-documents` requests.
    -   In the **Headers** tab, find the `Authorization` header under "Request Headers".
    -   Copy the entire token (the long string of characters that comes after "Bearer ").

### Step 3: Launch Chrome with Debugging
This is a mandatory step each time you want to run a crawl.

1.  **Force-Close All Chrome Processes**: `taskkill /F /IM chrome.exe`
2.  **Start Chrome with Debugging**: Use PowerShell and the exact path to your Chrome executable.
    ```powershell
    & "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\temp\chrome-debug" --no-first-run --no-default-browser-check
    ```
3.  In the new Chrome window that opens, log in to `aitracuuluat.vn` if needed for content access.
4.  **Keep this browser window open** while the crawler is running.

### Step 4: Run the Crawler
Open a new terminal, navigate to this directory, and run the `crawler.py` script with your desired options.

- **Scrape 20 documents from all categories (defaults to "Còn hiệu lực" status):**
  ```bash
  python crawler.py --max-docs 20
  ```

- **Scrape 20 documents specifically from the "Giáo dục" category:**
  ```bash
  python crawler.py --max-docs 20 --category "Giáo dục"
  ```

- **Scrape a maximum of 5 pages of API results from all categories:**
  ```bash
  python crawler.py --max-pages 5
  ```

- **Scrape only documents with "Hết hiệu lực" status by overriding the default:**
  ```bash
  python crawler.py --max-docs 10 --status-filter "Hết hiệu lực"
  ```

- **Scrape documents from a specific category with a specific status:**
  ```bash
  python crawler.py --max-docs 5 --category "Doanh nghiệp" --status-filter "Hết hiệu lực"
  ```

### Command Line Options

- `--max-docs N`: Limit the number of documents to scrape (default: no limit).
- `--max-pages N`: Limit the number of API pages to fetch (default: no limit).
- `--status-filter "STATUS"`: Filter documents by legal status. **Defaults to "Còn hiệu lực"**. Other options include "Hết hiệu lực", "Không xác định".
- `--category "CATEGORY"`: Filter documents by a specific category (e.g., "Giáo dục"). If not provided, scrapes all categories.

## 3. Project Structure

- `crawler.py`: The main script containing all logic. Run this file to start the crawler.
- `setup_crawler.py`: Handles dependency installation and Playwright browser setup.
- `requirements.txt`: A list of all necessary Python packages including Playwright.
- `.env`: Stores your secret bearer token for API authentication (create this file manually).