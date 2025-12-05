"""
Request validation middleware.

Enforces request size limits and content type validation to prevent:
- Denial of Service (DoS) via large payloads
- Memory exhaustion attacks
- Malformed content type attacks
"""

from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import logging

logger = logging.getLogger(__name__)


class RequestValidationMiddleware(BaseHTTPMiddleware):
    """
    Middleware to validate incoming requests for size and content type.
    
    Protections:
    - Max request body size: 10 MB (configurable)
    - File upload size: 50 MB (for avatar/document uploads)
    - Content-Type validation for POST/PUT/PATCH
    """
    
    # Size limits in bytes
    MAX_REQUEST_SIZE = 10 * 1024 * 1024  # 10 MB for regular requests
    MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50 MB for file uploads
    
    # Upload endpoints that allow larger sizes
    UPLOAD_ENDPOINTS = [
        "/api/v1/users/me/avatar",
        "/api/v1/admin/documents/upload",
    ]
    
    # Endpoints that are allowed to have empty body (and thus no Content-Type)
    EMPTY_BODY_ENDPOINTS = [
        "/api/v1/auth/refresh",
        "/api/v1/auth/logout",
        "/api/v1/auth/resend-otp", # Often just ID in query or path, or empty post
    ]

    # Allowed content types for different request methods
    ALLOWED_CONTENT_TYPES = [
        "application/json",
        "multipart/form-data",
        "application/x-www-form-urlencoded",
    ]
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        logger.info(
            f"Request validation initialized: max_size={self.MAX_REQUEST_SIZE / 1024 / 1024}MB, "
            f"upload_size={self.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    def is_upload_endpoint(self, path: str) -> bool:
        """Check if endpoint allows file uploads."""
        return any(path.startswith(endpoint) for endpoint in self.UPLOAD_ENDPOINTS)
    
    def is_empty_body_allowed(self, path: str) -> bool:
        """Check if endpoint is allowed to have empty body."""
        return any(path.startswith(endpoint) for endpoint in self.EMPTY_BODY_ENDPOINTS)
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Validate request before processing."""
        logger.info(f"RequestValidationMiddleware dispatching: {request.method} {request.url.path}")
        
        # Check request size
        content_length_header = request.headers.get("content-length")
        content_length = int(content_length_header) if content_length_header else 0
        
        if content_length > 0:
            # Determine size limit based on endpoint
            if self.is_upload_endpoint(request.url.path):
                max_size = self.MAX_UPLOAD_SIZE
                size_label = "50MB"
            else:
                max_size = self.MAX_REQUEST_SIZE
                size_label = "10MB"
            
            if content_length > max_size:
                logger.warning(
                    f"Request size exceeded: path={request.url.path}, "
                    f"size={content_length / 1024 / 1024:.2f}MB, limit={size_label}"
                )
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Request body too large. Maximum allowed size is {size_label}."
                )
        
        # Validate Content-Type for POST/PUT/PATCH requests
        logger.info(f"Middleware processing: method={request.method}, path={request.url.path}")
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "")
            
            # Special case: Allow empty Content-Type only if body is empty AND endpoint allows it
            if not content_type:
                 if content_length == 0 and self.is_empty_body_allowed(request.url.path):
                     # Allowed empty body request (e.g. logout)
                     pass
                 else:
                     # Missing Content-Type for non-empty body OR endpoint requiring body
                     logger.warning(f"Missing Content-Type: path={request.url.path}")
                     raise HTTPException(
                        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                        detail="Content-Type header is required for POST/PUT/PATCH requests."
                     )
            else:
                # Validate provided Content-Type
                base_content_type = content_type.split(";")[0].strip()
                
                is_allowed = any(
                    base_content_type.startswith(allowed)
                    for allowed in self.ALLOWED_CONTENT_TYPES
                )
                
                if not is_allowed:
                    logger.warning(
                        f"Invalid content type: path={request.url.path}, "
                        f"content_type={content_type}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                        detail=f"Unsupported content type: {base_content_type}. "
                               f"Allowed types: {', '.join(self.ALLOWED_CONTENT_TYPES)}"
                    )
        
        # Process request
        response = await call_next(request)
        return response

