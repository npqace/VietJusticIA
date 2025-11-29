"""
Security headers middleware for FastAPI application.

Implements best practices for web security headers to protect against
common vulnerabilities like XSS, clickjacking, and MIME-type sniffing.
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import os


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all HTTP responses.
    
    Headers added:
    - X-Content-Type-Options: Prevent MIME-sniffing
    - X-Frame-Options: Prevent clickjacking
    - X-XSS-Protection: Enable XSS filter in older browsers
    - Strict-Transport-Security: Force HTTPS in production
    - Content-Security-Policy: Restrict resource loading
    - Referrer-Policy: Control referrer information
    - Permissions-Policy: Control browser features
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.environment = os.getenv("ENVIRONMENT", "development")
        
    async def dispatch(self, request: Request, call_next):
        """Add security headers to response."""
        response = await call_next(request)
        
        # Prevent MIME-sniffing attacks
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Prevent clickjacking attacks
        response.headers["X-Frame-Options"] = "DENY"
        
        # Enable XSS filter (legacy browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Force HTTPS in production (HSTS)
        if self.environment == "production":
            # max-age=31536000 = 1 year
            # includeSubDomains: Apply to all subdomains
            # preload: Submit to browser preload list
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
        
        # Content Security Policy (CSP)
        # Allow same-origin content and specific external sources
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",  # Unsafe for development, allow CDN for Swagger
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net", # Allow CDN for Swagger styles
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self'",
            "frame-ancestors 'none'",  # Prevent framing
            "base-uri 'self'",  # Prevent base tag injection
            "form-action 'self'",  # Restrict form submissions
        ]
        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)
        
        # Control referrer information leakage
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions Policy (formerly Feature Policy)
        # Disable unnecessary browser features
        permissions_directives = [
            "geolocation=()",  # Disable geolocation
            "microphone=()",  # Disable microphone
            "camera=()",  # Disable camera
            "payment=()",  # Disable payment APIs
            "usb=()",  # Disable USB access
            "magnetometer=()",  # Disable magnetometer
        ]
        response.headers["Permissions-Policy"] = ", ".join(permissions_directives)
        
        # Remove server identification header (hide implementation details)
        if "Server" in response.headers:
            del response.headers["Server"]
        
        return response

