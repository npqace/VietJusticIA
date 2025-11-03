from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from jose import JWTError, jwt
from datetime import datetime, timedelta
import logging
import pytz
from sqlalchemy.orm import Session

from .otp_service import send_password_reset_otp
from app.core.security import (
    get_password_hash, 
    create_access_token, 
    verify_token,
    SECRET_KEY,
    ALGORITHM
)
from app.repository import user_repository
from app.database.models import User
from app.database.database import get_db

# Get a logger instance
logger = logging.getLogger(__name__)

# OAuth2 scheme to get the token from the Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def forgot_password(self, email: str) -> bool:
        user = user_repository.get_user_by_email(self.db, email)
        if not user:
            logger.warning(f"Password reset requested for non-existent email: {email}")
            return True

        try:
            # Send the password reset OTP
            send_password_reset_otp(self.db, user)
            logger.info(f"Password reset OTP sent to {email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send password reset OTP to {email}: {e}")
            return True

    def verify_reset_otp(self, email: str, otp: str) -> str | None:
        user = user_repository.get_user_by_email(self.db, email)
        
        if not user:
            logger.warning(f"Reset OTP verification for non-existent email: {email}")
            return None

        # Basic validation
        if not user.reset_password_otp or not user.reset_password_otp_expires_at:
            return None
            
        # Verify OTP (plain text comparison, consider hashing in production)
        if user.reset_password_otp != otp:
            return None
            
        # Verify expiration
        if user.reset_password_otp_expires_at < datetime.now(pytz.utc):
            # Clear the expired OTP
            user.reset_password_otp = None
            user.reset_password_otp_expires_at = None
            self.db.commit()
            return None

        # OTP is valid, clear it to prevent reuse
        user.reset_password_otp = None
        user.reset_password_otp_expires_at = None
        self.db.commit()

        # Generate a short-lived, single-use token for the reset action
        reset_token = create_access_token(
            data={"sub": user.email, "scope": "reset_password"},
            expires_delta=timedelta(minutes=10) # Allow 10 minutes to complete the reset
        )
        return reset_token

    def reset_password(self, token: str, new_password: str) -> bool:
        try:
            payload = verify_token(token) # Use the standard token verification
            if not payload or payload.get("scope") != "reset_password":
                logger.warning("Invalid or missing scope in password reset token.")
                return False
            
            email = payload.get("sub")
            user = user_repository.get_user_by_email(self.db, email)
            
            if not user:
                logger.error(f"User not found for email '{email}' during password reset.")
                return False

        except JWTError:
            logger.warning(f"Invalid JWT token received for password reset.")
            return False

        # Hash the new password and update the user
        hashed_password = get_password_hash(new_password)
        user.hashed_password = hashed_password
        self.db.commit()
        
        logger.info(f"Password for user {user.email} has been reset successfully.")
        return True


# --- Core User Dependency ---
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """
    Dependency to get the current user from a JWT token.
    This function will be used to protect endpoints.
    """
    logger.info("--- get_current_user dependency started ---")
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        logger.info("Decoding JWT token...")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        logger.info(f"Token decoded successfully. Email from sub: {email}")
        
        if email is None:
            logger.error("Email not found in token payload.")
            raise credentials_exception

        logger.info(f"Fetching user from database with email: {email}")
        user = user_repository.get_user_by_email(db=db, email=email)
        
        if user is None:
            logger.error(f"User with email {email} not found in database.")
            raise credentials_exception
        
        logger.info(f"User {user.email} found. Authentication successful.")
        return user

    except JWTError as e:
        logger.error(f"JWT Error: {e}")
        raise credentials_exception
    except Exception as e:
        logger.error(f"An unexpected error occurred in get_current_user: {e}", exc_info=True)
        # Re-raise as a generic 500 error to see the traceback
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred during authentication."
        )


# HTTP Bearer for optional authentication
http_bearer = HTTPBearer(auto_error=False)


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Dependency to get the current user from a JWT token, but returns None if no token is provided.
    This allows endpoints to work for both authenticated and guest users.
    """
    if not credentials:
        logger.info("No credentials provided, returning None (guest user)")
        return None

    token = credentials.credentials

    try:
        logger.info("Decoding JWT token for optional authentication...")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")

        if email is None:
            logger.warning("Email not found in token payload for optional auth")
            return None

        user = user_repository.get_user_by_email(db=db, email=email)
        if user:
            logger.info(f"Optional auth successful for user {user.email}")
        return user

    except JWTError as e:
        logger.warning(f"JWT Error in optional auth: {e}")
        return None
    except Exception as e:
        logger.warning(f"Error in optional auth: {e}")
        return None