from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import logging
import time
from contextlib import asynccontextmanager

from .database.database import init_db
from .services.ai_service import rag_service
from .routers import documents, auth, users # Import the new routers

# Lifespan Manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Application startup...")
    # init_db() # Table creation is now handled by Alembic
    rag_service.initialize_service()
    yield
    print("Application shutdown.")

app = FastAPI(title="VietJusticIA API", version="1.0.0", lifespan=lifespan)

# Include all the routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1", tags=["Users"])
app.include_router(documents.router, prefix="/api/v1", tags=["Documents"])

# Configure basic logging
logger = logging.getLogger("vietjusticia.api")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lightweight health check endpoint
@app.get("/health")
async def health():
    return {"status": "ok"}

# --- Chat Query Endpoint ---
from pydantic import BaseModel
from .database.models import User
from .services.auth import get_current_user

class ChatQuery(BaseModel):
    message: str

@app.post("/api/v1/chat/query", tags=["Chat"])
async def chat_query(query: ChatQuery, current_user: User = Depends(get_current_user)):
    logger.info(f'Received chat query from {current_user.email}: "{query.message}"')
    result = rag_service.invoke_chain(query.message)
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
