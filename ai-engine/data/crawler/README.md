# AI Tra Cuu Luat Crawler (v5 - Consolidated)

This directory contains a Python-based web crawler for `aitracuuluat.vn`.

This version scrapes document links directly from the webpage and has been consolidated into a single main script for simplicity. It connects to your own trusted Chrome browser to securely use your login session.

## 1. How it Works

1.  **Launch Chrome with a Debugging Port**: You start your everyday Chrome browser from the command line with a special flag.
2.  **Connect and Scrape (`crawler.py`)**: The main script connects to your running browser, navigates to the site, clicks the "Giáo dục" category, and then scrapes the document links directly from the page. It handles pagination by clicking the "Next" button.

## 2. Setup and Usage

### Prerequisites
- Python 3.8 or higher
- Google Chrome browser installed
- `pip` (Python package installer)

### Step 1: Install Dependencies
If you haven't already, run the setup script. This will also create the necessary output directory.

```bash
python setup_crawler.py
```

### Step 2: Launch and Log In to Chrome
This is a **mandatory step each time you want to crawl**.

1.  **Force-Close All Chrome Processes**: `taskkill /F /IM chrome.exe`
2.  **Start Chrome with Debugging Flags**: Use PowerShell and the exact path to your Chrome executable.
    ```powershell
    & "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\temp\chrome-dev-session"
    ```
3.  In the new Chrome window, **log in to `aitracuuluat.vn`**.
4.  **Keep this browser window open.**

### Step 3: Run the Crawler
Open a new terminal, activate your environment, and run the `crawler.py` script.

- **Scrape 5 documents for a quick test:**
  ```bash
  python crawler.py --max-docs 5
  ```

- **Scrape a maximum of 2 web pages:**
  ```bash
  python crawler.py --max-pages 2
  ```

## 3. Project Structure

- `crawler.py`: The single, main script containing all logic and configuration. Run this file to start the crawler.
- `setup_crawler.py`: Handles dependency installation.
- `requirements.txt`: A list of all necessary Python packages.
- `auth_state.json`: Stores your browser login session cookies.