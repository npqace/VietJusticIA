# VietJusticIA - AI-Powered Vietnamese Legal Assistance Platform

![VietJusticIA Banner](https://via.placeholder.com/1200x300?text=VietJusticIA+-+Bridging+the+Justice+Gap)

**Democratising access to Vietnamese legal knowledge through advanced Artificial Intelligence.**

---

## 🏛️ About The Project

**VietJusticIA** is a cutting-edge legal technology platform designed to address the critical "Justice Gap" in Vietnam. For many citizens, the legal system remains complex, fragmented, and prohibitively expensive.

This project leverages **Retrieval-Augmented Generation (RAG)** architecture, combining the reasoning capabilities of Large Language Models (LLMs) with a curated, verifiable database of Vietnamese legal documents. By doing so, VietJusticIA provides accurate, context-aware, and source-cited legal information, empowering users to understand their rights and obligations without the immediate need for costly professional consultation.

## ✨ Key Features

*   **🤖 AI Legal Assistant:** A smart conversational interface that answers legal queries in natural Vietnamese, grounded in official laws and decrees.
*   **📜 Verified Source Citations:** Every AI response includes direct links to the specific articles and clauses used, ensuring transparency and trust.
*   **🔍 Semantic Document Search:** Powerful search functionality that understands the *meaning* of your query, not just keywords, to find relevant legal documents.
*   **⚖️ Lawyer Connection:** A built-in marketplace to connect users with verified legal professionals for in-depth consultation and representation.
*   **📱 Cross-Platform Accessibility:** Available as a mobile application (iOS/Android) for on-the-go access and a web portal for comprehensive management.

## 🏗️ System Architecture

VietJusticIA is built on a modern, scalable, and secure technology stack:

*   **Backend:** **FastAPI (Python)** provides high-performance asynchronous API handling for real-time chat and complex data processing.
*   **AI Engine:** Integrates **Google Gemini 2.5 Flash** for natural language understanding and generation, coupled with **Sentence Transformers** for semantic vectorization.
*   **Database Ecosystem:**
    *   **Qdrant:** Vector database for high-speed semantic search.
    *   **PostgreSQL:** Relational database for secure user management and transactional data.
    *   **MongoDB:** Flexible document store for legal texts and chat history.
*   **Frontend:**
    *   **Mobile:** **React Native** (Expo) for a native-like experience on both Android and iOS.
    *   **Web:** **React** for the lawyer and administration dashboard.

## 📂 Project Structure

*   `ai-engine/`: The core data pipeline for crawling, cleaning, and vectorizing legal documents.
*   `backend/`: The main API server handling authentication, business logic, and RAG orchestration.
*   `mobile/`: The React Native mobile application source code.
*   `web-portal/`: The React-based web interface for lawyers and admins.
*   `docs/`: Comprehensive project documentation and guides.
*   `docker/`: Containerization configurations for consistent deployment.

## 📚 Documentation

For detailed technical documentation, setup guides, and API references, please visit our **[Documentation Hub](./docs/README.md)**.

---

**Developed by:** Nguyen Phuoc Quynh Anh\
**Supervisor:** Mr. Tran Trong Minh & Mr. Hoang Nhu Vinh\
**Program:** BSc Hons Computing - Greenwich Vietnam
