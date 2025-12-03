from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
import os
import logging
import sys
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

sys.stderr.write("DEBUG: security.py loaded\n")

# --- Security Configuration ---
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY not set in environment or .env file")

REFRESH_SECRET_KEY = os.getenv("REFRESH_SECRET_KEY")
if not REFRESH_SECRET_KEY:
    logger.warning(
        "REFRESH_SECRET_KEY not set, using SECRET_KEY. "
        "For production, set separate REFRESH_SECRET_KEY in .env"
    )
    REFRESH_SECRET_KEY = SECRET_KEY

sys.stderr.write(f"DEBUG: security.py REFRESH_SECRET_KEY initialized: {REFRESH_SECRET_KEY[:5]}...\n")
    
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_MINUTES = int(os.getenv("REFRESH_TOKEN_EXPIRE_MINUTES", "10080"))

# Initialize the password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a hashed one."""
    if not plain_password or not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hashes a plain password."""
    if not password:
        raise ValueError("Password cannot be empty")
    return pwd_context.hash(password)

# --- Token Functions ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "refresh"})
    sys.stderr.write(f"DEBUG: create_refresh_token using key: {REFRESH_SECRET_KEY[:5]}...\n")
    encoded_jwt = jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def verify_refresh_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        sys.stderr.write(f"DEBUG: verify_refresh_token using key: {REFRESH_SECRET_KEY[:5]}...\n")
        payload = jwt.decode(token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            sys.stderr.write("DEBUG: Token type is not refresh\n")
            return None
        return payload
    except JWTError as e:
        sys.stderr.write(f"DEBUG: JWTError: {e}\n")
        return None