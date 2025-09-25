"""
Setup script for the Thu Vien Phap Luat Crawler.
"""
import subprocess
import sys
from pathlib import Path

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
    # These directories are now defined in crawler.py, but we can create the base one.
    Path("../raw_data").mkdir(parents=True, exist_ok=True)
    print("✅ Directories created.")

def main():
    """Main setup function."""
    print("=" * 50)
    print("🚀 Setting up the Legal Documents Crawler")
    print("=" * 50)

    # 1. Create directories
    create_directories()

    # 2. Install Python packages from requirements.txt
    if not run_command(f"pip install -r requirements.txt", "Installing Python packages"):
        return

    # 3. Install Playwright browsers
    if not run_command("playwright install chromium", "Installing Playwright browser"):
        print("⚠️  Playwright browser installation failed. Please run manually: playwright install")
        return

    print("\n" + "=" * 50)
    print("🎉 Setup completed successfully!")
    print("\n📚 Next steps:")
    print("1. Launch Chrome with debugging enabled (see README.md for instructions).")
    print("2. Log in to aitracuuluat.vn in that browser window.")
    print("3. Run a small test crawl: python crawler.py --max-docs 5")
    print("4. For more options: python crawler.py --help")

if __name__ == "__main__":
    main()