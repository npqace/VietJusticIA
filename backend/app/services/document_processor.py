import os
import pickle
import re
from pymongo import MongoClient
from langchain_core.documents import Document
from langchain.storage import InMemoryStore
from langchain_community.retrievers import BM25Retriever
from pyvi import ViTokenizer
import tiktoken

# --- Intelligent Chunking Logic from Notebook ---
tokenizer = tiktoken.get_encoding("cl100k_base")

def tiktoken_len(text):
    tokens = tokenizer.encode(text, disallowed_special=())
    return len(tokens)

class IntelligentLegalChunker:
    def __init__(self, max_tokens=3500, overlap_tokens=200):
        self.max_tokens = max_tokens
        self.overlap_tokens = overlap_tokens
        self.tokenizer = tokenizer

    def split_paragraph_intelligently(self, paragraph, max_tokens=None):
        if max_tokens is None:
            max_tokens = self.max_tokens
        sentences = re.split(r'(?<=[.!?])\s+', paragraph)
        if len(sentences) <= 1:
            words = paragraph.split()
            chunks = []
            current_chunk = []
            current_tokens = 0
            for word in words:
                word_tokens = self.tokenizer.encode(word, disallowed_special=())
                if current_tokens + len(word_tokens) > max_tokens and current_chunk:
                    chunks.append(' '.join(current_chunk))
                    current_chunk = [word]
                    current_tokens = len(word_tokens)
                else:
                    current_chunk.append(word)
                    current_tokens += len(word_tokens)
            if current_chunk:
                chunks.append(' '.join(current_chunk))
            return chunks
        chunks = []
        current_chunk = []
        current_tokens = 0
        for sentence in sentences:
            sentence_tokens = self.tokenizer.encode(sentence, disallowed_special=())
            if current_tokens + len(sentence_tokens) > max_tokens and current_chunk:
                chunks.append(' '.join(current_chunk))
                current_chunk = [sentence]
                current_tokens = len(sentence_tokens)
            else:
                current_chunk.append(sentence)
                current_tokens += len(sentence_tokens)
        if current_chunk:
            chunks.append(' '.join(current_chunk))
        return chunks

    def chunk_document(self, document):
        content = document.page_content
        metadata = document.metadata.copy()
        paragraphs = content.split('\n\n')
        chunks = []
        current_chunk = []
        current_tokens = 0
        for paragraph in paragraphs:
            paragraph = paragraph.strip()
            if not paragraph:
                continue
            paragraph_tokens = self.tokenizer.encode(paragraph, disallowed_special=())
            if len(paragraph_tokens) > self.max_tokens:
                if current_chunk:
                    chunks.append('\n\n'.join(current_chunk))
                    current_chunk = []
                    current_tokens = 0
                sub_chunks = self.split_paragraph_intelligently(paragraph)
                for sub_chunk in sub_chunks:
                    chunks.append(sub_chunk)
                continue
            if current_tokens + len(paragraph_tokens) > self.max_tokens and current_chunk:
                chunks.append('\n\n'.join(current_chunk))
                if len(current_chunk) > 0:
                    overlap_text = current_chunk[-1]
                    overlap_tokens = self.tokenizer.encode(overlap_text, disallowed_special=())
                    if len(overlap_tokens) <= self.overlap_tokens:
                        current_chunk = [overlap_text, paragraph]
                        current_tokens = len(overlap_tokens) + len(paragraph_tokens)
                    else:
                        current_chunk = [paragraph]
                        current_tokens = len(paragraph_tokens)
                else:
                    current_chunk = [paragraph]
                    current_tokens = len(paragraph_tokens)
            else:
                current_chunk.append(paragraph)
                current_tokens += len(paragraph_tokens)
        if current_chunk:
            chunks.append('\n\n'.join(current_chunk))
        chunk_docs = []
        for i, chunk_content in enumerate(chunks):
            chunk_metadata = metadata.copy()
            chunk_metadata['chunk_id'] = i
            chunk_metadata['total_chunks'] = len(chunks)
            chunk_docs.append(Document(page_content=chunk_content, metadata=chunk_metadata))
        return chunk_docs

# --- Document Processor Service ---
class DocumentProcessor:
    def __init__(self):
        self.mongo_client = MongoClient(os.getenv("MONGO_URL", "mongodb://mongodb:27017/"))
        self.db = self.mongo_client[os.getenv("MONGO_DB_NAME", "vietjusticia")]
        self.collection = self.db["legal_documents"]
        
        # Define cache path for multiple artifacts
        self.artifacts_path = "/app/ai-engine/data/artifacts"
        self.retriever_cache_path = os.path.join(self.artifacts_path, "retriever_artifacts.pkl")
        os.makedirs(self.artifacts_path, exist_ok=True)

    def load_docs_from_mongo(self) -> list[Document]:
        """Loads documents from MongoDB and converts them to LangChain Document objects."""
        print("-> Loading documents from MongoDB...")
        docs = []
        for doc_data in self.collection.find():
            # Ensure metadata values are serializable
            metadata = {k: str(v) for k, v in doc_data.items()}
            docs.append(Document(page_content=doc_data.get("full_text", ""), metadata=metadata))
        print(f"-> Loaded {len(docs)} documents from MongoDB.")
        return docs

    def _create_and_cache_artifacts(self):
        """
        Performs the full processing pipeline:
        1. Loads docs from MongoDB.
        2. Creates parent and child chunks.
        3. Creates and caches the docstore (parent chunks) and BM25 retriever (child chunks).
        """
        docs = self.load_docs_from_mongo()
        
        # 1. Create Parent and Child Chunks
        print("-> Starting parent-child chunking process...")
        parent_chunker = IntelligentLegalChunker(max_tokens=3500, overlap_tokens=200)
        docstore = InMemoryStore()
        child_chunks = []
        
        for doc in docs:
            parent_chunks = parent_chunker.chunk_document(doc)
            for i, parent_chunk in enumerate(parent_chunks):
                parent_id = f"{parent_chunk.metadata.get('_id', 'doc')}-{i}"
                docstore.mset([(parent_id, parent_chunk)])
                
                child_chunker = IntelligentLegalChunker(max_tokens=800, overlap_tokens=100)
                sub_chunks = child_chunker.chunk_document(parent_chunk)
                
                for sub_chunk in sub_chunks:
                    sub_chunk.metadata['parent_id'] = parent_id
                    child_chunks.append(sub_chunk)
        
        print(f"-> Created {len(child_chunks)} child chunks and stored {len(docstore.store)} parent chunks.")

        # 2. Create BM25 Retriever from tokenized child chunks
        print("-> Building BM25 retriever...")
        tokenized_child_chunks = []
        for chunk in child_chunks:
            # ViTokenizer expects a string, not a Document object
            tokenized_content = ViTokenizer.tokenize(chunk.page_content)
            tokenized_chunk = Document(page_content=tokenized_content, metadata=chunk.metadata)
            tokenized_child_chunks.append(tokenized_chunk)

        bm25_retriever = BM25Retriever.from_documents(tokenized_child_chunks)
        bm25_retriever.k = 15 # As per the notebook
        
        # 3. Cache the artifacts
        print(f"-> Caching artifacts to {self.retriever_cache_path}...")
        with open(self.retriever_cache_path, "wb") as f:
            pickle.dump((docstore, bm25_retriever), f)
        
        print("-> Artifacts cached successfully.")
        return docstore, bm25_retriever

    def get_retrieval_artifacts(self):
        """
        Loads the docstore and BM25 retriever from cache.
        If the cache doesn't exist, it builds and caches them first.
        """
        if os.path.exists(self.retriever_cache_path):
            print("-> Loading retrieval artifacts from cache...")
            with open(self.retriever_cache_path, "rb") as f:
                docstore, bm25_retriever = pickle.load(f)
            print("-> Artifacts loaded successfully.")
            return docstore, bm25_retriever
        else:
            print("-> No cache found. Building and caching new artifacts...")
            return self._create_and_cache_artifacts()

# Singleton instance
document_processor = DocumentProcessor()