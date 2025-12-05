import logging
import hmac
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Union, Any, Dict, Tuple, Annotated
from fastapi import Depends, HTTPException, status

from ..database import models
from ..database.database import get_db
from ..core.security import get_password_hash, verify_password
from ..model.userModel import SignUpModel
from ..schemas.user import UserUpdateProfile

logger = logging.getLogger(__name__)

# Constants
OTP_EXPIRY_MINUTES = 15
OTP_MAX_ATTEMPTS = 3
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 100


def create_user(
    db: Annotated[Session, Depends(get_db)], 
    user: SignUpModel
) -> models.User:
    """
    Create a new user in the database.
    
    Args:
        db: Database session
        user: Signup data model
        
    Returns:
        models.User: The created user
        
    Raises:
        ValueError: If email or phone already exists
        RuntimeError: Database error
    """
    try:
        logger.info(f"Creating user: email={user.email}")
        
        # Check if email or phone already exists (single query)
        existing_user = db.query(models.User).filter(
            (func.lower(models.User.email) == user.email.lower()) |
            (models.User.phone == user.phone)
        ).first()
        
        if existing_user:
            if existing_user.email.lower() == user.email.lower():
                logger.warning(f"User creation failed: Email already exists ({user.email})")
                raise ValueError("Email already registered")
            else:
                logger.warning(f"User creation failed: Phone already exists ({user.phone})")
                raise ValueError("Phone number already registered")
    
        # Create new user
        hashed_password = get_password_hash(user.pwd)
        db_user = models.User(
            full_name=user.full_name,
            email=user.email,
            phone=user.phone,
            hashed_password=hashed_password
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        logger.info(f"User created successfully: id={db_user.id}, email={user.email}")
        return db_user
        
    except ValueError:
        # Re-raise validation errors
        raise
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Integrity error creating user: {e}")
        # Parse constraint violation
        if "email" in str(e).lower():
            raise ValueError("Email already registered")
        elif "phone" in str(e).lower():
            raise ValueError("Phone number already registered")
        raise ValueError("User already exists")
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error creating user: {e}")
        raise RuntimeError("Database error occurred")


def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    """
    Get user by email (case-insensitive).
    
    Args:
        db: Database session
        email: User email
        
    Returns:
        models.User or None if not found
    """
    try:
        return db.query(models.User).filter(func.lower(models.User.email) == email.lower()).first()
    except SQLAlchemyError as e:
        logger.error(f"Database error getting user by email: {e}")
        return None


def get_user_by_phone(db: Session, phone: str) -> Optional[models.User]:
    """
    Get user by phone number.
    
    Args:
        db: Database session
        phone: User phone number
        
    Returns:
        models.User or None if not found
    """
    try:
        return db.query(models.User).filter(models.User.phone == phone).first()
    except SQLAlchemyError as e:
        logger.error(f"Database error getting user by phone: {e}")
        return None


def get_user_by_id(db: Session, user_id: int) -> Optional[models.User]:
    """
    Get user by ID with lawyer profile.
    
    Args:
        db: Database session
        user_id: User ID
        
    Returns:
        models.User or None if not found
    """
    try:
        return db.query(models.User).options(
            joinedload(models.User.lawyer_profile)
        ).filter(models.User.id == user_id).first()
    except SQLAlchemyError as e:
        logger.error(f"Database error getting user by id {user_id}: {e}")
        return None


def get_all_users(
    db: Session, 
    skip: int = 0, 
    limit: int = DEFAULT_PAGE_SIZE, 
    search: Optional[str] = None, 
    role: Optional[str] = None,
    is_active: Optional[bool] = None
) -> List[models.User]:
    """
    Get users with pagination and filters.

    Args:
        db: Database session
        skip: Pagination offset (default 0)
        limit: Max results (default 50, max 100)
        search: Search by name or email
        role: Filter by role (admin, lawyer, user)
        is_active: Filter by active status

    Returns:
        List of User models (max limit items)

    Raises:
        ValueError: If pagination params invalid
        RuntimeError: Database error
    """
    # Validate pagination
    if skip < 0:
        raise ValueError("skip must be >= 0")
    if limit < 1 or limit > MAX_PAGE_SIZE:
        raise ValueError(f"limit must be between 1 and {MAX_PAGE_SIZE}")

    try:
        logger.info(f"Fetching users: skip={skip}, limit={limit}, search={search}")

        query = db.query(models.User)
        
        # Search filter
        if search:
            search_lower = f"%{search.strip().lower()}%"
            query = query.filter(
                (func.lower(models.User.full_name).like(search_lower)) |
                (func.lower(models.User.email).like(search_lower)) |
                (models.User.phone.like(search_lower))
            )

        # Role filter
        if role and role.lower() != 'all':
            try:
                # Case-insensitive role matching
                role_enum = models.User.Role(role.lower())
                query = query.filter(models.User.role == role_enum)
            except ValueError:
                # Try uppercase if lowercase fails (for robustness)
                try:
                    role_enum = models.User.Role[role.upper()]
                    query = query.filter(models.User.role == role_enum)
                except KeyError:
                    logger.warning(f"Invalid role filter: {role}, ignoring")
        
        # Active status filter
        if is_active is not None:
            query = query.filter(models.User.is_active == is_active)
            
        users = query.order_by(
            models.User.created_at.desc()
        ).offset(skip).limit(limit).all()
        
        logger.info(f"Found {len(users)} users")
        return users

    except ValueError:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error fetching users: {e}")
        raise RuntimeError("Database error occurred")


def authenticate_user(db: Session, identifier: str, password: str) -> Optional[models.User]:
    """
    Authenticate user by email or phone.
    
    Args:
        db: Database session
        identifier: Email or phone number
        password: Plain text password
        
    Returns:
        models.User or None: Authenticated user or None if failed
        
    Raises:
        RuntimeError: Database error
    """
    try:
        logger.info(f"Authenticating user: identifier={identifier}")

        # Check if user exists with email (case-insensitive) or phone
        # Try email first
        user = db.query(models.User).filter(func.lower(models.User.email) == identifier.lower()).first()
        
        # If not found by email, try phone
        if not user:
            user = db.query(models.User).filter(models.User.phone == identifier).first()

        # If still not found, or password does not match, return None
        if not user or not verify_password(password, user.hashed_password):
            logger.warning(f"Authentication failed: Invalid credentials for {identifier}")
            return None

        # Reactivate account if it was inactive
        if not user.is_active:
            logger.info(f"Reactivating inactive account: user_id={user.id}")
            user.is_active = True
            db.commit()
            db.refresh(user)
        
        logger.info(f"User authenticated successfully: user_id={user.id}")
        return user
        
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error during authentication: {e}")
        raise RuntimeError("Database error occurred")


def verify_otp(
    db: Session,
    user: models.User,
    otp: str,
    max_attempts: int = OTP_MAX_ATTEMPTS
) -> Tuple[bool, str]:
    """
    Verifies the OTP for a user with attempt limiting.
    
    Args:
        db: Database session
        user: User model
        otp: OTP string to verify
        max_attempts: Max failed attempts before invalidation (default 3)
        
    Returns:
        tuple: (success: bool, error_message: str)
        
    Side Effects:
        - Clears OTP on success
        - Clears OTP after max failed attempts
        - Increments failed attempt counter
    """
    try:
        # Check if OTP exists
        if not user.otp or not user.otp_expires_at:
            logger.warning(f"OTP verification failed for user {user.id}: No OTP set")
            return False, "No OTP found. Please request a new one."
        
        # Handle timezone-aware/naive datetimes
        now = datetime.now(timezone.utc)
        expires_at = user.otp_expires_at
        
        # If expires_at is naive, assume it's UTC (SQLite behavior)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
            
        # Check expiry FIRST (before OTP comparison to prevent timing attacks)
        if expires_at < now:
            logger.warning(f"OTP expired for user {user.id}")
            # Clear expired OTP
            user.otp = None
            user.otp_expires_at = None
            user.otp_failed_attempts = 0
            db.commit()
            return False, "OTP has expired. Please request a new one."
            
        # Initialize attempt counter if needed (handle legacy/null values)
        if not hasattr(user, 'otp_failed_attempts') or user.otp_failed_attempts is None:
            user.otp_failed_attempts = 0
            
        # Check max attempts
        if user.otp_failed_attempts >= max_attempts:
            logger.warning(f"OTP max attempts exceeded for user {user.id}")
            # Clear OTP
            user.otp = None
            user.otp_expires_at = None
            user.otp_failed_attempts = 0
            db.commit()
            return False, "Too many failed attempts. Please request a new OTP."
        
        # Constant-time comparison (prevent timing attacks)
        otp_match = hmac.compare_digest(user.otp, otp)
        
        if not otp_match:
            # Increment failed attempts
            user.otp_failed_attempts += 1
            db.commit()
            
            remaining = max_attempts - user.otp_failed_attempts
            logger.warning(
                f"Invalid OTP for user {user.id} "
                f"(attempts: {user.otp_failed_attempts}/{max_attempts})"
            )
            
            if remaining > 0:
                return False, f"Invalid OTP. {remaining} attempts remaining."
            else:
                # Last attempt failed
                user.otp = None
                user.otp_expires_at = None
                user.otp_failed_attempts = 0
                db.commit()
                return False, "Too many failed attempts. Please request a new OTP."
        
        # Success - clear OTP
        logger.info(f"OTP verified for user {user.id}")
        user.otp = None
        user.otp_expires_at = None
        user.otp_failed_attempts = 0
        db.commit()
        
        return True, ""
        
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error during OTP verification: {e}")
        raise RuntimeError("Database error occurred")


def update_user(
    db: Session, 
    user: models.User, 
    user_update: UserUpdateProfile
) -> models.User:
    """
    Updates a user's profile.
    
    Only allows updating fields defined in UserUpdateProfile:
    - full_name
    - phone
    - avatar_url
    
    Protected fields (email, role, is_verified, hashed_password) cannot be modified here.

    Args:
        db: Database session
        user: User model to update
        user_update: Validated update data (Pydantic schema)
        
    Returns:
        models.User: Updated user
        
    Raises:
        RuntimeError: Database error
    """
    try:
        logger.info(f"Updating user profile: user_id={user.id}")

        # Handle both dict and Pydantic model
        if isinstance(user_update, dict):
            update_data = user_update
        else:
            update_data = user_update.model_dump(exclude_unset=True)

        for key, value in update_data.items():
            setattr(user, key, value)
        
        db.commit()
        db.refresh(user)
        
        logger.info(f"User profile updated: user_id={user.id}")
        return user
        
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error updating user {user.id}: {e}")
        raise RuntimeError("Database error occurred")


def verify_signup_otp(db: Session, email: str, otp: str) -> Tuple[Optional[models.User], str]:
    """
    Verifies the signup OTP for a user and activates their account.
    
    Args:
        db: Database session
        email: User email
        otp: OTP to verify

    Returns:
        tuple: (user: models.User | None, error_message: str)

    Raises:
        RuntimeError: Database error
    """
    try:
        logger.info(f"Verifying signup OTP for email: {email}")
        
        user = get_user_by_email(db, email)

        if not user:
            logger.warning(f"Signup OTP verification failed: User not found for {email}")
            return None, "Invalid credentials"  # Generic error
            
        if user.is_verified:
            logger.warning(f"Signup OTP verification failed: Account already verified for {email}")
            return None, "Account already verified"

        # Verify OTP with attempt limiting
        success, error_message = verify_otp(db, user, otp, max_attempts=OTP_MAX_ATTEMPTS)
        
        if not success:
            return None, error_message
            
        # Activate account
        user.is_verified = True
        db.commit()
        db.refresh(user)
        
        logger.info(f"Account verified successfully for {email}")
        return user, ""
        
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error during signup OTP verification: {e}")
        raise RuntimeError("Database error occurred")


def resend_signup_otp(db: Session, email: str) -> Optional[models.User]:
    """
    Generates and sends a new signup OTP for a non-verified user.
    Returns the user object if found and not verified, None otherwise.
    """
    try:
        user = get_user_by_email(db, email)
        
        if not user or user.is_verified:
            # Return None to send a generic message and prevent user enumeration
            return None
            
        return user
    except SQLAlchemyError as e:
        logger.error(f"Database error resending signup OTP: {e}")
        return None


def update_user_status(db: Session, user_id: int, is_active: bool) -> Optional[models.User]:
    """
    Update user active status.
    
    Args:
        db: Database session
        user_id: ID of the user to update
        is_active: New active status
        
    Returns:
        Optional[models.User]: Updated user or None if not found
        
    Raises:
        RuntimeError: Database error
    """
    try:
        logger.info(f"Updating status for user {user_id} to {is_active}")
        
        user = get_user_by_id(db, user_id)
        if not user:
            logger.warning(f"User {user_id} not found for status update")
            return None
            
        user.is_active = is_active
        db.commit()
        db.refresh(user)
        
        logger.info(f"User {user_id} status updated successfully")
        return user
        
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error updating user status: {e}")
        raise RuntimeError("Database error occurred")


def delete_user_permanently(db: Session, user_id: int) -> bool:
    """
    Permanently delete a user from the database.
    
    Args:
        db: Database session
        user_id: ID of the user to delete
        
    Returns:
        bool: True if deleted, False if user not found
        
    Raises:
        RuntimeError: Database error
    """
    try:
        logger.info(f"Permanently deleting user: {user_id}")
        
        user = get_user_by_id(db, user_id)
        if not user:
            logger.warning(f"User {user_id} not found for deletion")
            return False
            
        db.delete(user)
        db.commit()
        
        logger.info(f"User {user_id} permanently deleted")
        return True
        
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error deleting user {user_id}: {e}")
        raise RuntimeError("Database error occurred")
