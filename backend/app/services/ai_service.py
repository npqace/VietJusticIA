import os
import json
import asyncio
import re
import logging
from typing import List, Dict, Any, Optional

from langchain_community.vectorstores import Qdrant
from qdrant_client import QdrantClient
from langchain_core.documents import Document
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.retrievers import EnsembleRetriever
from langchain.storage import InMemoryStore
from langchain_community.retrievers import BM25Retriever
from pyvi import ViTokenizer

from .document_processor import document_processor
from ..utils.rate_limiter import gemini_rate_limiter
from ..utils.response_cache import rag_response_cache

# Configuration Constants
MAX_QUERY_LENGTH = 2000
DEFAULT_MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
RETRIEVER_K = int(os.getenv("RETRIEVER_K", "15"))
ENSEMBLE_WEIGHTS = [0.6, 0.4]
MAX_RETRIES = 3
BASE_DELAY = 1.0

# Initialize logger
logger = logging.getLogger(__name__)

# --- Helper function from notebook ---
def format_docs(docs: List[Document]) -> str:
    """Format retrieved documents with metadata for better context"""
    formatted_docs = []
    for i, doc in enumerate(docs):
        # Safely access metadata, providing default values
        metadata = doc.metadata or {}
        title = metadata.get('title', f'Document {i+1}')
        doc_num = metadata.get('document_number', 'N/A')
        
        # Format the document with a clear header
        formatted_doc = f"--- Source: {title} (Số hiệu: {doc_num}) ---\n{doc.page_content}\n--- End Source ---"
        formatted_docs.append(formatted_doc)
    return "\n\n".join(formatted_docs)

# --- Prompt Template ---
template = '''You are LawSphere, a friendly and helpful AI legal assistant for Vietnamese law. For now, your knowledge is focused on documents related to "Giáo dục" (Education), but will be expanded to cover more topics in the future. Your primary goal is to provide accurate legal information based on the provided context, but you can also handle basic conversational interactions.

First, analyze the user's question to determine their intent.

1.  **If the user's query is a simple conversational one** (e.g., a greeting like "xin chào", "chào bạn"; asking who you are like "bạn là ai?"; or asking about your capabilities like "bạn có thể làm gì?"), you MUST provide a friendly, direct, and helpful response without performing a legal search. Do not use the legal context for these queries.
    *   When greeted, greet them back.
    *   When asked who you are, introduce yourself as "LawSphere, an AI legal assistant".
    *   When asked what you can do, explain that you can answer questions about Vietnamese legal documents. Mention that your knowledge is currently focused on the topic of "Giáo dục" (Education), but you are actively being updated to cover many other areas of law.

2.  **If the user's query is about Vietnamese law within the topic of "Giáo dục"**, you MUST answer the question based ONLY on the following context.
    *   Your answer must be in Vietnamese.
    *   Your answer should be well-structured and easy to read.
    *   Use simple, easy-to-understand language that is accessible to ordinary citizens without legal backgrounds. When legal terms must be used, provide a brief explanation.
    *   Use bullet points or numbered lists for multiple items or steps.
    *   Use **bold** for key terms, names, or important numbers.
    *   If the context does not provide enough information, you MUST say "Tôi không tìm thấy thông tin trong tài liệu được cung cấp." and do not provide an answer.

3.  **If the user's query is not conversational and not related to the provided legal context or the topic of "Giáo dục"**, you MUST politely state that you can currently only help with questions related to Vietnamese law in the field of Education, but more topics will be added soon.

**Legal Context (Only use for legal queries):**
{context}

**User's Question:** {question}

---
**Final Output Formatting Rules (Only for legal queries):**
After your answer for a legal query, on a new line, you MUST list the titles of the exact sources you used in a machine-readable format.
The format is:
SOURCES_USED: ["title 1", "title 2", ...]

IMPORTANT: You MUST include the SOURCES_USED line at the end of your response. This is required for proper source attribution.
If you used information from the context, list all document titles you referenced.
'''

prompt = ChatPromptTemplate.from_template(template)

# --- RAG Service Class ---
class RAGService:
    def __init__(self):
        self.llm = None
        self.embeddings = None
        self.retriever = None
        self.rag_chain = None
        self.docstore = None
        self.is_initialized = False
        self.initialization_task = None

    def initialize_service(self):
        """Schedules the RAG service components to be initialized in the background."""
        if self.initialization_task is None:
            logger.info("[INIT] Scheduling RAG service initialization")
            self.initialization_task = asyncio.create_task(self._initialize_background())

    async def _initialize_background(self):
        """Initializes all components of the RAG service in a background task."""
        logger.info("[INIT] Initializing RAG Service in background")
        try:
            self._initialize_models()
            await asyncio.to_thread(self._initialize_retriever)
            self._build_rag_chain()
            self.is_initialized = True
            logger.info("[INIT] RAG Service initialized successfully")
        except Exception as e:
            logger.error(f"[INIT] RAG Service initialization failed: {e}")

    def _initialize_models(self):
        """Initializes the language model and the embedding model."""
        logger.info("[INIT] Initializing AI models")
        self.llm = ChatGoogleGenerativeAI(model=DEFAULT_MODEL_NAME, temperature=0)
        self.embeddings = SentenceTransformerEmbeddings(
            model_name='sentence-transformers/paraphrase-multilingual-mpnet-base-v2'
        )
        logger.info("[INIT] AI models initialized")

    def _initialize_retriever(self):
        """Initializes the retriever by loading cached artifacts and setting up the parent-retriever chain."""
        logger.info("[INIT] Initializing retriever")

        # 1. Load cached artifacts (docstore and bm25_retriever)
        self.docstore, bm25_retriever = document_processor.get_retrieval_artifacts()

        # 2. Initialize Qdrant client and retriever
        QDRANT_URL = os.getenv("QDRANT_URL", "http://qdrant:6333")
        QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
        COLLECTION_NAME = "vietjusticia_legal_docs"

        # Connect to Qdrant (with API key for cloud, without for local)
        if QDRANT_API_KEY:
            qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
            logger.info("[INIT] Connecting to Qdrant Cloud with API key")
        else:
            qdrant_client = QdrantClient(url=QDRANT_URL)
            logger.info("[INIT] Connecting to local Qdrant instance")
        vector_store = Qdrant(
            client=qdrant_client,
            collection_name=COLLECTION_NAME,
            embeddings=self.embeddings,
        )
        qdrant_retriever = vector_store.as_retriever(search_kwargs={'k': RETRIEVER_K})
        logger.info("[INIT] Connected to Qdrant collection")

        # 3. Create Ensemble Retriever
        ensemble_retriever = EnsembleRetriever(
            retrievers=[bm25_retriever, qdrant_retriever],
            weights=ENSEMBLE_WEIGHTS
        )
        logger.info("[INIT] Ensemble retriever created")

        # 4. Setup Parent Document Retrieval Chain
        def _get_parent_docs(input_dict: dict) -> List[Document]:
            child_docs = input_dict["child_docs"]
            parent_ids = []
            for doc in child_docs:
                if "parent_id" in doc.metadata and doc.metadata["parent_id"] not in parent_ids:
                    parent_ids.append(doc.metadata["parent_id"])
            # Fetch parent docs from the in-memory store
            return [doc for doc in self.docstore.mget(parent_ids) if doc is not None]

        self.retriever = (
            {"child_docs": ensemble_retriever}
            | RunnableLambda(_get_parent_docs)
        )
        logger.info("[INIT] Parent document retrieval chain created successfully")

    def _build_rag_chain(self):
        """Builds the final RAG chain to return a structured output."""
        logger.info("[INIT] Building RAG chain")

        rag_chain_from_docs = (
            RunnablePassthrough.assign(
                context=(lambda x: format_docs(x["documents"]))
            )
            | prompt
            | self.llm
            | StrOutputParser()
        )

        self.rag_chain = (
            {"question": RunnablePassthrough()}
            | RunnablePassthrough.assign(
                documents=(RunnableLambda(lambda x: x['question']) | self.retriever)
            ).assign(
                answer=rag_chain_from_docs
            )
        )
        logger.info("[INIT] RAG chain built")

    async def invoke_chain(self, query: str) -> Dict[str, Any]:
        """
        Runs the query through the RAG chain with caching, rate limiting, and retry logic.

        Args:
            query: User's query string

        Returns:
            Dict containing 'response' and 'sources' keys
        """
        if not self.is_initialized:
            return {"response": "RAG service is still initializing. Please try again in a few moments.", "sources": []}

        if not self.rag_chain:
            return {"response": "RAG chain is not available. Initialization may have failed.", "sources": []}

        # Input validation
        if len(query) > MAX_QUERY_LENGTH:
            return {
                "response": f"Your query is too long ({len(query)} characters). Please limit it to {MAX_QUERY_LENGTH} characters.",
                "sources": []
            }

        # Check cache first
        cached_response = await rag_response_cache.get(query)
        if cached_response:
            logger.info("[CACHE] Cache hit - returning cached response")
            cache_stats = rag_response_cache.get_stats()
            logger.info(f"[CACHE] Stats: {cache_stats}")
            return cached_response

        logger.info("[CACHE] Cache miss - processing new query")

        # Retry logic with exponential backoff
        max_retries = MAX_RETRIES
        base_delay = BASE_DELAY  # seconds

        for attempt in range(max_retries):
            try:
                # Check rate limiter
                rate_limit_acquired = await gemini_rate_limiter.wait_if_needed(max_wait_seconds=5.0)

                if not rate_limit_acquired:
                    rate_stats = gemini_rate_limiter.get_stats()
                    logger.warning(f"[RATE_LIMIT] Request blocked - Stats: {rate_stats}")
                    return {
                        "response": "Service is experiencing high demand. Please try again in a moment. Our system has usage limits to ensure fair access for all users.",
                        "sources": []
                    }

                # Log rate limiter stats
                rate_stats = gemini_rate_limiter.get_stats()
                if gemini_rate_limiter.is_near_limit(threshold=0.8):
                    logger.warning(f"[RATE_LIMIT] Approaching limits: {rate_stats}")

                # Tokenize query and invoke RAG chain
                tokenized_query = ViTokenizer.tokenize(query)
                result = self.rag_chain.invoke(tokenized_query)

                raw_answer = result.get("answer", "")
                all_docs = result.get("documents", [])

                response_text = raw_answer
                final_sources = []

                # Parse the raw answer to separate response and sources
                # Try multiple patterns to catch different formats
                sources_used_match = re.search(
                    r"SOURCES_USED:\s*(\[.*?\])", 
                    raw_answer, 
                    re.DOTALL | re.MULTILINE
                )
                
                # Also try without the colon
                if not sources_used_match:
                    sources_used_match = re.search(
                        r"SOURCES_USED\s*(\[.*?\])", 
                        raw_answer, 
                        re.DOTALL | re.MULTILINE | re.IGNORECASE
                    )

                if sources_used_match:
                    response_text = raw_answer[:sources_used_match.start()].strip()
                    try:
                        used_titles_str = sources_used_match.group(1)
                        used_titles = json.loads(used_titles_str)

                        # Filter documents to only include those used by LLM
                        if used_titles:
                            doc_map = {doc.metadata.get("title"): doc for doc in all_docs}
                            for title in used_titles:
                                if title in doc_map:
                                    doc = doc_map[title]
                                    metadata = doc.metadata or {}
                                    final_sources.append({
                                        "document_id": metadata.get("_id", ""),
                                        "title": metadata.get("title", "N/A"),
                                        "document_number": metadata.get("document_number", "N/A"),
                                        "source_url": metadata.get("source_url", "#"),
                                        "page_content_preview": doc.page_content[:200] + "..."
                                    })
                    except json.JSONDecodeError:
                        logger.warning(f"[PARSE] Could not parse SOURCES_USED JSON: {sources_used_match.group(1)}")
                        response_text = raw_answer
                
                # Fallback: If LLM didn't provide SOURCES_USED format but we have retrieved documents,
                # include all retrieved documents as sources (since the LLM clearly used them)
                if not final_sources and all_docs:
                    logger.info("[SOURCES] LLM did not provide SOURCES_USED format, using all retrieved documents as fallback")
                    for doc in all_docs:
                        metadata = doc.metadata or {}
                        final_sources.append({
                            "document_id": metadata.get("_id", ""),
                            "title": metadata.get("title", "N/A"),
                            "document_number": metadata.get("document_number", "N/A"),
                            "source_url": metadata.get("source_url", "#"),
                            "page_content_preview": doc.page_content[:200] + "..."
                        })

                result_dict = {
                    "response": response_text,
                    "sources": final_sources
                }

                # Cache the successful response
                await rag_response_cache.set(query, result_dict)
                logger.info("[CACHE] Stored response for query")

                return result_dict

            except Exception as e:
                error_msg = str(e)

                # Check if it's a rate limit error from Google
                if "429" in error_msg or "quota" in error_msg.lower() or "rate limit" in error_msg.lower():
                    logger.error(f"[RATE_LIMIT] Attempt {attempt + 1}/{max_retries}: {error_msg}")

                    if attempt < max_retries - 1:
                        # Exponential backoff: 1s, 2s, 4s
                        delay = base_delay * (2 ** attempt)
                        logger.info(f"[RETRY] Waiting {delay}s before retry")
                        await asyncio.sleep(delay)
                        continue
                    else:
                        return {
                            "response": "The service is temporarily unavailable due to high demand. Please try again in a few minutes.",
                            "sources": []
                        }
                else:
                    # Other errors - don't retry
                    logger.error(f"[ERROR] Unexpected error in invoke_chain: {e}")
                    return {"response": f"An error occurred: {str(e)}", "sources": []}

        # Should not reach here, but just in case
        return {
            "response": "Failed to process your request after multiple attempts. Please try again later.",
            "sources": []
        }

# --- Create and initialize the service instance ---
rag_service = RAGService()