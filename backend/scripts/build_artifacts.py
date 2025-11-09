"""
Build RAG Artifacts (BM25 index + Docstore)

This script builds the retrieval artifacts needed for the RAG service:
1. Loads documents from MongoDB
2. Creates parent and child chunks
3. Builds BM25 retriever from child chunks
4. Creates docstore with parent chunks
5. Saves artifacts to pickle file

Usage:
    python backend/scripts/build_artifacts.py
"""

import sys
import os
from dotenv import load_dotenv

# Load environment variables from root .env file
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
env_path = os.path.join(root_dir, '.env')
load_dotenv(env_path)

# Add parent directory to path so we can import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.document_processor import document_processor


def main():
    print("=" * 80)
    print("VietJusticIA - Build RAG Artifacts")
    print("=" * 80)
    print()

    print("This script will:")
    print("1. Load documents from MongoDB")
    print("2. Create parent-child chunks")
    print("3. Build BM25 retriever")
    print("4. Create docstore")
    print("5. Save artifacts to cache")
    print()

    try:
        # Force rebuild by directly calling the private method
        print("Starting artifact creation process...")
        print()

        docstore, bm25_retriever = document_processor._create_and_cache_artifacts()

        print()
        print("=" * 80)
        print("SUCCESS!")
        print("=" * 80)
        print(f"Artifacts saved to: {document_processor.retriever_cache_path}")
        print(f"Docstore contains: {len(docstore.store)} parent chunks")
        print(f"BM25 retriever has: {len(bm25_retriever.docs)} child chunks")
        print()
        print("The RAG service can now use these artifacts for retrieval.")
        print("=" * 80)

    except Exception as e:
        print()
        print("=" * 80)
        print("ERROR!")
        print("=" * 80)
        print(f"Failed to build artifacts: {e}")
        print()
        import traceback
        traceback.print_exc()
        print("=" * 80)
        sys.exit(1)


if __name__ == "__main__":
    main()
