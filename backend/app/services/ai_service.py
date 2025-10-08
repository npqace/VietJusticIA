import os
import json
import sys
import asyncio
import re
import json
from typing import List

from langchain_community.vectorstores import Qdrant
from qdrant_client import QdrantClient
from langchain_core.documents import Document
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.retrievers import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever
from pyvi import ViTokenizer

from langchain.storage import InMemoryStore
from langchain_core.runnables import RunnableLambda, RunnablePassthrough

from .document_processor import document_processor

# Add the parent directory to the path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

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
template = '''Answer the question based ONLY on the following context.
Your answer must be in Vietnamese.
Your answer should be well-structured and easy to read.
- Use bullet points or numbered lists for multiple items or steps.
- Use **bold** for key terms, names, or important numbers and concepts.
- Use *italics* for emphasis or to highlight specific terms.

Context:
{context}

Question: {question}

If the context does not provide enough information, say "Tôi không tìm thấy thông tin trong tài liệu được cung cấp." and do not provide an answer.

After your answer, on a new line, you MUST list the titles of the exact sources you used in a machine-readable format.
The format is:
SOURCES_USED: ["title 1", "title 2", ...]
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
            print("Scheduling RAG service initialization.")
            self.initialization_task = asyncio.create_task(self._initialize_background())

    async def _initialize_background(self):
        """Initializes all components of the RAG service in a background task."""
        print("Initializing RAG Service in background...")
        try:
            self._initialize_models()
            await asyncio.to_thread(self._initialize_retriever)
            self._build_rag_chain()
            self.is_initialized = True
            print("RAG Service Initialized Successfully.")
        except Exception as e:
            print(f"[ERROR] RAG Service initialization failed: {e}")

    def _initialize_models(self):
        """Initializes the language model and the embedding model."""
        print("-> Initializing AI models...")
        self.llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)
        self.embeddings = SentenceTransformerEmbeddings(
            model_name='sentence-transformers/paraphrase-multilingual-mpnet-base-v2'
        )
        print("-> AI models initialized.")

    def _initialize_retriever(self):
        """Initializes the retriever by loading cached artifacts and setting up the parent-retriever chain."""
        print("-> Initializing Retriever...")
        
        # 1. Load cached artifacts (docstore and bm25_retriever)
        self.docstore, bm25_retriever = document_processor.get_retrieval_artifacts()

        # 2. Initialize Qdrant client and retriever
        QDRANT_URL = os.getenv("QDRANT_URL", "http://qdrant:6333")
        COLLECTION_NAME = "vietjusticia_legal_docs"
        qdrant_client = QdrantClient(url=QDRANT_URL)
        vector_store = Qdrant(
            client=qdrant_client,
            collection_name=COLLECTION_NAME,
            embeddings=self.embeddings,
        )
        qdrant_retriever = vector_store.as_retriever(search_kwargs={'k': 15})
        print("-> Connected to Qdrant collection.")

        # 3. Create Ensemble Retriever
        ensemble_retriever = EnsembleRetriever(
            retrievers=[bm25_retriever, qdrant_retriever],
            weights=[0.6, 0.4]
        )
        print("-> Ensemble Retriever created.")

        # 4. Setup Parent Document Retrieval Chain
        def _get_parent_docs(input_dict: dict) -> list[Document]:
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
        print("-> Parent document retrieval chain created successfully.")

    def _build_rag_chain(self):
        """Builds the final RAG chain to return a structured output."""
        print("-> Building RAG chain...")

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
        print("-> RAG chain built.")

    def invoke_chain(self, query: str):
        """Runs the query through the RAG chain and formats the output."""
        if not self.is_initialized:
            return {"response": "RAG service is still initializing. Please try again in a few moments.", "sources": []}
        
        if not self.rag_chain:
            return {"response": "RAG chain is not available. Initialization may have failed.", "sources": []}
        
        try:
            tokenized_query = ViTokenizer.tokenize(query)
            result = self.rag_chain.invoke(tokenized_query)
            
            raw_answer = result.get("answer", "")
            all_docs = result.get("documents", [])
            
            response_text = raw_answer
            final_sources = []

            # More robustly parse the raw answer to separate the response and the sources_used list
            sources_used_match = re.search(r"SOURCES_USED:\s*(\[.*\])", raw_answer, re.DOTALL)
            
            if sources_used_match:
                response_text = raw_answer[:sources_used_match.start()].strip()
                try:
                    used_titles_str = sources_used_match.group(1)
                    used_titles = json.loads(used_titles_str)
                    
                    # Filter the original documents to only include the ones used by the LLM
                    if used_titles:
                        doc_map = {doc.metadata.get("title"): doc for doc in all_docs}
                        for title in used_titles:
                            if title in doc_map:
                                doc = doc_map[title]
                                metadata = doc.metadata or {}
                                final_sources.append({
                                    "title": metadata.get("title", "N/A"),
                                    "document_number": metadata.get("document_number", "N/A"),
                                    "source_url": metadata.get("source_url", "#"),
                                    "page_content_preview": doc.page_content[:200] + "..."
                                })
                except json.JSONDecodeError:
                    print(f"[WARNING] Could not parse SOURCES_USED JSON: {sources_used_match.group(1)}")
                    # Fallback to the raw answer if JSON is malformed
                    response_text = raw_answer

            return {
                "response": response_text,
                "sources": final_sources
            }
        except Exception as e:
            print(f"[ERROR] An unexpected error occurred in invoke_chain: {e}")
            return {"response": f"An error occurred: {str(e)}", "sources": []}

# --- Create and initialize the service instance ---
rag_service = RAGService()