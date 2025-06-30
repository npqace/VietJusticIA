#!/usr/bin/env python3
"""
Setup script for the Vietnamese Legal Document Crawler
"""

import subprocess
import sys
import os
from pathlib import Path


def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e}")
        print(f"Error output: {e.stderr}")
        return False


def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    if version.major >= 3 and version.minor >= 8:
        print(f"✅ Python {version.major}.{version.minor}.{version.micro} is compatible")
        return True
    else:
        print(f"❌ Python {version.major}.{version.minor}.{version.micro} is not compatible. Need Python 3.8+")
        return False


def create_directories():
    """Create necessary directories"""
    directories = [
        "../raw_data",
        "../raw_data/documents", 
        "../raw_data/pdfs",
        "../raw_data/logs"
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"📁 Created directory: {directory}")


def main():
    """Main setup function"""
    print("🏛️  Vietnamese Legal Document Crawler Setup")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        return False
    
    # Create directories
    print("\n📁 Creating directories...")
    create_directories()
    
    # Install requirements
    print("\n📦 Installing Python packages...")
    if not run_command("pip install -r requirements.txt", "Installing requirements"):
        print("⚠️  Try using pip3 or python -m pip instead")
        if not run_command("pip3 install -r requirements.txt", "Installing requirements with pip3"):
            return False
    
    # Install Playwright browsers
    print("\n🌐 Installing Playwright browsers...")
    if not run_command("playwright install chromium", "Installing Playwright browsers"):
        print("⚠️  Playwright browser installation failed. You may need to install manually.")
        print("Try running: python -m playwright install chromium")
    
    # Test installation
    print("\n🧪 Testing installation...")
    try:
        import playwright
        import aiohttp
        import pandas as pd
        import bs4
        print("✅ All required packages are available")
    except ImportError as e:
        print(f"❌ Missing package: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 Setup completed successfully!")
    print("\n📚 Next steps:")
    print("1. Read the README_Crawler.md for detailed usage instructions")
    print("2. Run a quick test: python run_crawler.py --test")
    print("3. For more options: python run_crawler.py --help")
    print("\n🚀 Example commands:")
    print("   python run_crawler.py --test                    # Quick test")
    print("   python run_crawler.py --max-documents 10        # Crawl 10 documents")
    print("   python run_crawler.py --max-pages 3             # Crawl 3 pages")
    
    return True


if __name__ == "__main__":
    success = main()
    if not success:
        print("\n❌ Setup failed. Please check the errors above and try again.")
        sys.exit(1)
    else:
        print("\n✅ Setup completed successfully!")
        sys.exit(0) 