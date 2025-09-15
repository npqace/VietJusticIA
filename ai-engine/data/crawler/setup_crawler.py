"""
Setup script for the Thu Vien Phap Luat Crawler.
"""
import subprocess
import sys
from pathlib import Path
# MODIFIED: Import directory configurations
from crawler_config import OUTPUT_DIR, DOCUMENTS_DIR, LOGS_DIR

def run_command(command, description):
    """Run a command and handle errors."""
    print(f"🔄 {description}...")
    try:
        subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e}\nError output: {e.stderr}")
        return False

def create_directories():
    """Create necessary output directories."""
    print("🔄 Creating output directories...")
    # MODIFIED: Use imported Path objects directly
    directories = [OUTPUT_DIR, DOCUMENTS_DIR, LOGS_DIR]
    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)
    print("✅ Directories created.")

def main():
    """Main setup function."""
    print("=" * 50)
    print("🚀 Setting up the Thu Vien Phap Luat Crawler")
    print("=" * 50)

    # 1. Create directories
    create_directories()

    # 2. Install Python packages
    requirements = ["playwright", "beautifulsoup4", "pandas"]
    if not run_command(f"pip install {' '.join(requirements)}", "Installing Python packages"):
        return False

    # 3. Install Playwright browsers
    if not run_command("playwright install chromium", "Installing Playwright browser"):
        print("⚠️  Playwright browser installation failed. Please run manually: playwright install")
        return False

    print("\n" + "=" * 50)
    print("🎉 Setup completed successfully!")
    print("\n📚 Next steps:")
    print("1. Run a small test crawl: python run_crawler.py --max-pages 1 --max-docs-per-page 3")
    print("2. For more options: python run_crawler.py --help")
    return True

if __name__ == "__main__":
    if not main():
        print("\n❌ Setup failed. Please check the errors above.")