from fastapi import FastAPI, HTTPException, status, Depends, Security
from fastapi import Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import APIKeyHeader
from sqlalchemy.orm import Session
import logging
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from .database import models
from .database.models import User
from .model.userModel import SignUpModel, LoginModel, UserResponse
from .services.auth import create_access_token, create_refresh_token, verify_token, verify_refresh_token
from .database.database import get_db, init_db
from .repository import user_repository
from .services import otp_service
from .services.ai_service import rag_service # Import the RAG service instance
from .routers import documents

# Lifespan Manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Code to run on startup
    print("Application startup...")
    init_db()
    rag_service.initialize_service() # Initialize the RAG service
    yield
    # Code to run on shutdown (if any)
    print("Application shutdown.")

app = FastAPI(title="VietJusticIA API", version="1.0.0", lifespan=lifespan)

app.include_router(documents.router, prefix="/api/v1", tags=["documents"])

# Mount static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# ... (rest of the file is mostly the same) ...

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

# Lightweight health check endpoint for container healthcheck
@app.get("/health")
async def health():
    return {"status": "ok"}

# API key header for authentication
api_key_header = APIKeyHeader(name="Authorization", auto_error=False)

# Request/Response logging middleware (masks Authorization header)
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = None
    try:
        response = await call_next(request)
        return response
    finally:
        duration_ms = (time.time() - start_time) * 1000
        client_ip = request.client.host if request.client else "-"
        path = request.url.path
        method = request.method
        status_code = getattr(response, "status_code", "ERROR")
        logger.info(f"{client_ip} {method} {path} -> {status_code} ({duration_ms:.1f} ms)")

@app.post("/signup", response_model=dict)
async def signup(signup_request: SignUpModel, db: Session = Depends(get_db)):
    logger.info(f"Signup attempt email={signup_request.email} phone={signup_request.phone}")
    # Check if passwords match
    if signup_request.pwd != signup_request.confirm_pwd:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    # Create user in database
    user = user_repository.create_user(db, signup_request)

    # Generate and send OTP
    otp = otp_service.generate_otp()
    user.otp = otp
    user.otp_expires_at = otp_service.get_otp_expiry_time()
    db.commit()

    otp_service.send_otp_email(email=user.email, otp=otp)
    
    logger.info(f"Signup success for {user.email}, OTP sent.")
    return {"message": "Signup successful. Please check your email for the verification OTP."}

@app.post("/login", response_model=dict)
async def login(login_request: LoginModel, db: Session = Depends(get_db)):
    logger.info(f"Login attempt identifier={login_request.identifier}")
    user = user_repository.authenticate_user(
        db, login_request.identifier, login_request.pwd
    )
    
    if not user:
        logger.info("Login failed: incorrect credentials")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/phone or password"
        )
    
    token_claims = {"sub": user.email, "role": user.role.value}
    access_token = create_access_token(data=token_claims)
    refresh_token = create_refresh_token(data=token_claims)
    logger.info(f"Login success for {user.email}")
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

@app.post("/verify-otp", response_model=dict)
async def verify_otp(request: VerifyOTPRequest, db: Session = Depends(get_db)):
    logger.info(f"OTP verification attempt for email={request.email}")
    
    # Find user by email
    user = db.query(models.User).filter(models.User.email == request.email).first()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    if user.is_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account already verified")

    if not user.otp or not user.otp_expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP not found for this user. Please request a new one.")

    if user.otp_expires_at < datetime.now(timezone.utc):
        # Clear the expired OTP
        user.otp = None
        user.otp_expires_at = None
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP has expired. Please request a new one.")
        
    if user.otp != request.otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP provided.")
        
    # Verification successful: Update user and clear OTP fields
    user.is_verified = True
    user.otp = None
    user.otp_expires_at = None
    db.commit()
    
    # Generate tokens to log the user in
    token_claims = {"sub": user.email, "role": user.role.value}
    access_token = create_access_token(data=token_claims)
    refresh_token = create_refresh_token(data=token_claims)
    
    logger.info(f"OTP verification success for {user.email}")
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


class ResendOTPRequest(BaseModel):
    email: str

@app.post("/resend-otp", response_model=dict)
async def resend_otp(request: ResendOTPRequest, db: Session = Depends(get_db)):
    logger.info(f"Resend OTP request for email={request.email}")
    
    user = db.query(models.User).filter(models.User.email == request.email).first()
    
    if not user:
        # To prevent email enumeration attacks, we don't reveal if the user exists or not.
        logger.warning(f"Resend OTP requested for non-existent or unverified email: {request.email}")
        return {"message": "If an account with this email exists and is not verified, a new OTP has been sent."}
        
    if user.is_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This account has already been verified.")
        
    # Generate, save, and send a new OTP
    otp = otp_service.generate_otp()
    user.otp = otp
    user.otp_expires_at = otp_service.get_otp_expiry_time()
    db.commit()

    otp_service.send_otp_email(email=user.email, otp=otp)
    
    logger.info(f"Resent OTP successfully for {user.email}")
    return {"message": "A new OTP has been sent to your email address."}


async def get_current_user(authorization: str = Security(api_key_header), db: Session = Depends(get_db)):
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(models.User).filter(models.User.email == payload.get("sub")).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    return user

@app.get("/profile", response_model=UserResponse)
async def read_users_me(current_user = Depends(get_current_user)):
    return current_user

# Refresh endpoint: accepts refresh token and returns new access token
class RefreshRequest(BaseModel):
    refresh_token: str

@app.post("/refresh", response_model=dict)
async def refresh_token_endpoint(refresh_request: RefreshRequest):
    logger.info("Refresh token attempt")
    payload = verify_refresh_token(refresh_request.refresh_token)
    if not payload:
        logger.info("Refresh token invalid")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Re-issue an access token using the same subject and role
    token_claims = {"sub": payload.get("sub"), "role": payload.get("role")}
    access_token = create_access_token(data=token_claims)
    logger.info(f"Refresh token success for sub={token_claims.get('sub')}")
    return {"access_token": access_token, "token_type": "bearer"}

# ---------- Role-based access dependency ----------

def require_roles(*allowed_roles):
    """Dependency generator that ensures the current user has one of the allowed roles."""
    def role_checker(current_user = Depends(get_current_user)):
        if current_user.role.value not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough privileges"
            )
        return current_user
    return role_checker

async def admin_only_route(current_user = Depends(require_roles("admin"))):
    return {"message": f"Hello {current_user.full_name}, you have admin access"}


# --- Chat Query Endpoint ---
class ChatQuery(BaseModel):
    message: str

@app.post("/chat/query")
async def chat_query(query: ChatQuery, current_user: User = Depends(get_current_user)):
    logger.info(f'Received chat query from {current_user.email}: "{query.message}"')
    
    # Replace placeholder with a call to the RAG service
    result = rag_service.invoke_chain(query.message)
    
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
