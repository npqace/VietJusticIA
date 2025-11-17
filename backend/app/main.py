from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import logging
import time
import os
from pathlib import Path
from contextlib import asynccontextmanager
from .database.models import User
from .services.auth import get_current_user
from .database.database import init_db
from .services.ai_service import rag_service
from .routers import documents, auth, password, users, chat, lawyers, consultations, admin, help_requests, service_requests, conversations, websocket, document_cms
from .utils.response_cache import cleanup_expired_cache_entries
import asyncio

# Lifespan Manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Application startup...")
    # init_db() # Table creation is now handled by Alembic
    rag_service.initialize_service()

    # Start background cache cleanup task
    cleanup_task = asyncio.create_task(cleanup_expired_cache_entries())
    print("Background cache cleanup task started")

    yield

    # Cancel cleanup task on shutdown
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass
    print("Application shutdown.")

app = FastAPI(title="VietJusticIA API", version="1.0.0", lifespan=lifespan)

# Include all the routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
# Users router already defines its own prefix ("/api/v1/users"),
# avoid duplicating the "/api/v1" prefix here which would make
# routes resolve to /api/v1/api/v1/... and cause 404s.
app.include_router(users.router)
app.include_router(documents.router, prefix="/api/v1", tags=["Documents"])
app.include_router(password.router, prefix="/api/v1/password", tags=["Password"])
app.include_router(chat.router)  # Chat router already has prefix="/api/v1/chat" in its definition
app.include_router(lawyers.router)  # Lawyers router already has prefix="/api/v1/lawyers" in its definition
app.include_router(consultations.router)  # Consultations router already has prefix="/api/v1/consultations" in its definition
app.include_router(admin.router)  # Admin router already has prefix="/api/v1/admin" in its definition
app.include_router(help_requests.router)  # Help requests router already has prefix="/api/v1/help-requests" in its definition
app.include_router(service_requests.router) # Service requests router already has prefix="/api/v1/service-requests" in its definition
app.include_router(conversations.router)  # Conversations router already has prefix="/api/v1/conversations" in its definition
app.include_router(websocket.router)  # WebSocket router for real-time conversations with prefix="/api/v1/ws" in its definition
app.include_router(document_cms.router)  # Document CMS router already has prefix="/api/v1/admin/documents" in its definition

# Configure basic logging
logger = logging.getLogger("vietjusticia.api")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

# CORS Middleware - Allow all origins for mobile and web app support
# Mobile apps (React Native/Expo) don't send proper Origin headers for WebSocket
# Security is handled via JWT token validation in endpoints (not cookies)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for mobile app support
    allow_credentials=False,  # False because we use JWT tokens, not cookies
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Static files - Serve uploaded avatars
# Use absolute path relative to project root (works in both Docker and local dev)
UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


# Lightweight health check endpoint
@app.get("/health")
@app.head("/health")
async def health():
    return {"status": "ok"}

# Monitoring endpoint for rate limiter and cache stats
@app.get("/api/v1/monitoring/stats", tags=["Monitoring"])
async def get_monitoring_stats(current_user: User = Depends(get_current_user)):
    """
    Get current rate limiter and cache statistics.
    Requires authentication.
    """
    from .utils.rate_limiter import gemini_rate_limiter
    from .utils.response_cache import rag_response_cache

    return {
        "rate_limiter": gemini_rate_limiter.get_stats(),
        "cache": rag_response_cache.get_stats(),
        "rag_service": {
            "initialized": rag_service.is_initialized
        }
    }

# --- Chat Query Endpoint ---
from pydantic import BaseModel
from .database.models import User
from .services.auth import get_current_user

# Old /chat/query endpoint has been removed and replaced with session-based chat endpoints
# See app/routers/chat.py for the new implementation:
# - POST /api/v1/chat/sessions (create new chat with first message)
# - POST /api/v1/chat/sessions/{session_id}/messages (add message to existing chat)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
