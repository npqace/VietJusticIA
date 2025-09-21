# AI Tra Cuu Luat Crawler (v6 - API First)

This directory contains an advanced, concurrent Python web crawler for `aitracuuluat.vn`.

This version has been completely refactored to use the website's internal API for fetching document metadata, making it significantly faster and more reliable than traditional web scraping. Browser automation is now used only for the essential task of extracting the full text content of each document.

## 1. How it Works

1.  **API-First Metadata Fetching**: The crawler authenticates with the site's API using a bearer token. It first fetches a list of documents for the "Giáo dục" (Education) category and then retrieves the full, detailed metadata for each document individually.
2.  **Concurrent Content Scraping**: Using a `ThreadPoolExecutor`, the script launches multiple worker threads to scrape the document content pages in parallel. This dramatically speeds up the overall crawling process.
3.  **Persistent Login Session**: The script connects to a pre-launched instance of your Chrome browser. This allows all worker threads to share the same browser context, reusing your logged-in session and cookies to access document content that may be behind a login wall.

## 2. Setup and Usage

### Prerequisites
- Python 3.8 or higher
- Google Chrome browser installed
- `pip` (Python package installer)

### Step 1: Install Dependencies
If you are setting up the project for the first time, run the setup script. This will create the necessary output directory and install all required Python packages.

```bash
python setup_crawler.py
```

### Step 2: Create the `.env` File
This is a mandatory one-time setup step.

1.  Create a file named `.env` in the `ai-engine/data/crawler/` directory.
2.  Add the following line to the file, replacing `your_token_here` with your actual bearer token:
    ```
    AITRACUU_BEARER_TOKEN=your_token_here
    ```
3.  **How to get the Bearer Token:**
    -   Open Chrome, log in to `aitracuuluat.vn`.
    -   Open Developer Tools (F12) and go to the **Network** tab.
    -   Filter for `legal-documents` and refresh the document list page.
    -   Click on one of the `legal-documents` requests.
    -   In the **Headers** tab, find the `Authorization` header under "Request Headers".
    -   Copy the entire token (the long string of characters that comes after "Bearer ").

### Step 3: Launch and Log In to Chrome
This is a mandatory step each time you want to run a crawl.

1.  **Force-Close All Chrome Processes**: `taskkill /F /IM chrome.exe`
2.  **Start Chrome with Debugging**: Use PowerShell and the exact path to your Chrome executable.
    ```powershell
    & "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
    ```
3.  In the new Chrome window that opens, make sure you are logged in to `aitracuuluat.vn`.
4.  **Keep this browser window open** while the crawler is running.

### Step 4: Run the Crawler
Open a new terminal, navigate to this directory, and run the `crawler.py` script with your desired options.

- **Scrape 20 documents for a quick test:**
  ```bash
  python crawler.py --max-docs 20
  ```

- **Scrape a maximum of 5 pages of API results:**
  ```bash
  python crawler.py --max-pages 5
  ```

## 3. Project Structure

- `crawler.py`: The main script containing all logic. Run this file to start the crawler.
- `setup_crawler.py`: Handles dependency installation.
- `requirements.txt`: A list of all necessary Python packages.
- `.env`: Stores your secret bearer token for API authentication.