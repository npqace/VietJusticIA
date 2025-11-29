"""
File storage utility for handling avatar uploads.
Provides functions for saving, deleting, and managing uploaded files.
"""
import os
import uuid
from pathlib import Path
from typing import Optional
from fastapi import UploadFile, HTTPException
from PIL import Image
import io

# Configuration
# Use absolute path relative to backend directory (works in both Docker and local dev)
UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads" / "avatars"
MAX_FILE_SIZE_MB = 5
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_DIMENSION = 2048  # Max width/height in pixels


def validate_image_file(file: UploadFile) -> None:
    """
    Validates uploaded image file.

    Args:
        file: FastAPI UploadFile object

    Raises:
        HTTPException: If validation fails
    """
    # Check content type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_MIME_TYPES)}"
        )

    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file extension. Allowed extensions: {', '.join(ALLOWED_EXTENSIONS)}"
        )


async def save_avatar(file: UploadFile, user_id: int) -> str:
    """
    Saves uploaded avatar image to local storage.

    Args:
        file: FastAPI UploadFile object
        user_id: ID of the user uploading the avatar

    Returns:
        Relative URL path to the saved avatar

    Raises:
        HTTPException: If file validation or save fails
    """
    # Validate file
    validate_image_file(file)

    # Read file content
    contents = await file.read()

    # Check file size
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE_MB}MB"
        )

    # Validate and optimize image with PIL
    try:
        image = Image.open(io.BytesIO(contents))

        # Convert RGBA to RGB if necessary (for JPEG)
        if image.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background

        # Resize if too large (maintain aspect ratio)
        if image.width > MAX_IMAGE_DIMENSION or image.height > MAX_IMAGE_DIMENSION:
            image.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), Image.Resampling.LANCZOS)

        # Generate unique filename
        file_ext = Path(file.filename).suffix.lower()
        unique_filename = f"user_{user_id}_{uuid.uuid4().hex}{file_ext}"
        file_path = UPLOAD_DIR / unique_filename

        # Ensure upload directory exists
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

        # Save optimized image
        if file_ext in ['.jpg', '.jpeg']:
            image.save(file_path, 'JPEG', quality=85, optimize=True)
        elif file_ext == '.png':
            image.save(file_path, 'PNG', optimize=True)
        elif file_ext == '.webp':
            image.save(file_path, 'WEBP', quality=85)

        # Return relative URL path
        return f"/uploads/avatars/{unique_filename}"

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image file: {str(e)}"
        )


def delete_avatar(avatar_url: str) -> bool:
    """
    Deletes avatar file from storage.

    Args:
        avatar_url: URL path to the avatar (e.g., /uploads/avatars/user_1_abc123.jpg)

    Returns:
        True if file was deleted, False if file didn't exist
    """
    if not avatar_url or not avatar_url.startswith("/uploads/avatars/"):
        return False

    # Extract filename from URL
    filename = Path(avatar_url).name
    file_path = UPLOAD_DIR / filename

    try:
        if file_path.exists() and file_path.is_file():
            file_path.unlink()
            return True
        return False
    except Exception as e:
        print(f"Error deleting avatar: {e}")
        return False


def get_avatar_path(avatar_url: Optional[str]) -> Optional[Path]:
    """
    Converts avatar URL to filesystem path.

    Args:
        avatar_url: URL path to the avatar

    Returns:
        Path object if valid, None otherwise
    """
    if not avatar_url or not avatar_url.startswith("/uploads/avatars/"):
        return None

    filename = Path(avatar_url).name
    file_path = UPLOAD_DIR / filename

    return file_path if file_path.exists() else None
