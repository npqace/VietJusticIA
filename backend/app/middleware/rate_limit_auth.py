"""
Rate limiting middleware for authentication endpoints.

Prevents brute force attacks on login, signup, OTP verification, and password reset.
Uses in-memory storage with automatic cleanup.
"""

from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List
import asyncio
import logging
import os

logger = logging.getLogger(__name__)


class RateLimitStore:
    """
    In-memory storage for rate limiting data.
    Tracks request attempts per IP address with automatic cleanup.
    """
    
    def __init__(self, cleanup_interval_seconds: int = 300):
        """
        Initialize rate limit store.
        
        Args:
            cleanup_interval_seconds: How often to clean expired entries (default: 5 minutes)
        """
        # Structure: {ip_address: [(timestamp, endpoint), ...]}
        self.requests: Dict[str, List[tuple[datetime, str]]] = defaultdict(list)
        self.lock = asyncio.Lock()
        self.cleanup_interval = cleanup_interval_seconds
        
    async def add_request(self, ip_address: str, endpoint: str):
        """Record a request from an IP address."""
        async with self.lock:
            now = datetime.now()
            self.requests[ip_address].append((now, endpoint))
            
    async def get_request_count(
        self, 
        ip_address: str, 
        endpoint: str, 
        window_minutes: int
    ) -> int:
        """
        Get number of requests from IP to specific endpoint in time window.
        
        Args:
            ip_address: Client IP address
            endpoint: API endpoint path
            window_minutes: Time window in minutes
            
        Returns:
            Number of requests in the window
        """
        async with self.lock:
            now = datetime.now()
            cutoff_time = now - timedelta(minutes=window_minutes)
            
            # Filter requests for this endpoint within time window
            recent_requests = [
                (timestamp, ep) for timestamp, ep in self.requests[ip_address]
                if timestamp >= cutoff_time and ep == endpoint
            ]
            
            # Update stored requests (remove old ones)
            self.requests[ip_address] = [
                (timestamp, ep) for timestamp, ep in self.requests[ip_address]
                if timestamp >= cutoff_time
            ]
            
            return len(recent_requests)
    
    async def cleanup_old_entries(self):
        """Remove expired entries from storage (runs periodically)."""
        while True:
            try:
                await asyncio.sleep(self.cleanup_interval)
                
                async with self.lock:
                    now = datetime.now()
                    cutoff_time = now - timedelta(hours=1)  # Keep last hour
                    
                    # Clean up old requests
                    for ip_address in list(self.requests.keys()):
                        self.requests[ip_address] = [
                            (timestamp, ep) for timestamp, ep in self.requests[ip_address]
                            if timestamp >= cutoff_time
                        ]
                        
                        # Remove IP if no recent requests
                        if not self.requests[ip_address]:
                            del self.requests[ip_address]
                    
                    logger.info(
                        f"Rate limit cleanup: {len(self.requests)} active IPs tracked"
                    )
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Rate limit cleanup error: {e}")


# Global rate limit store
rate_limit_store = RateLimitStore()


class AuthRateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware for authentication endpoints.
    
    Rate limits (per IP address):
    - Login: 5 attempts per 15 minutes
    - Signup: 3 attempts per hour
    - OTP verification: 5 attempts per 15 minutes
    - OTP resend: 3 attempts per 15 minutes
    - Password reset: 3 attempts per hour
    - Password change: 5 attempts per 15 minutes
    """
    
    # Rate limit rules: endpoint -> (max_attempts, window_minutes)
    RATE_LIMITS = {
        "/api/v1/auth/login": (5, 5),
        "/api/v1/auth/signup": (3, 10),
        "/api/v1/auth/verify-otp": (5, 15),
        "/api/v1/auth/resend-otp": (3, 15),
        "/api/v1/password/change-password": (5, 15),
        # Password Reset Endpoints
        "/api/v1/password/forgot-password": (3, 60),      # Limit initialization attempts
        "/api/v1/password/verify-reset-otp": (5, 15),    # Limit OTP guessing
        "/api/v1/password/reset-password": (3, 15),      # Limit actual reset attempts
    }
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        logger.info(f"Auth rate limiting initialized for {len(self.RATE_LIMITS)} endpoints")
        
    def get_client_ip(self, request: Request) -> str:
        """
        Extract client IP address from request.
        Handles reverse proxy headers (X-Forwarded-For, X-Real-IP).
        """
        # Check X-Forwarded-For header (set by reverse proxies)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # X-Forwarded-For can contain multiple IPs, take the first (client)
            return forwarded_for.split(",")[0].strip()
        
        # Check X-Real-IP header (alternative proxy header)
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
        
        # Fallback to direct connection IP
        if request.client:
            return request.client.host
        
        return "unknown"
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Check rate limit before processing request."""
        # Skip rate limiting in test environment
        if os.getenv("ENVIRONMENT") == "test":
            return await call_next(request)

        logger.info(f"AuthRateLimitMiddleware dispatching: {request.method} {request.url.path}")
        
        # Only check POST requests to auth endpoints
        if request.method != "POST":
            return await call_next(request)
        
        endpoint = request.url.path
        
        # Check if endpoint is rate-limited
        if endpoint not in self.RATE_LIMITS:
            return await call_next(request)
        
        max_attempts, window_minutes = self.RATE_LIMITS[endpoint]
        client_ip = self.get_client_ip(request)
        
        # Check request count
        request_count = await rate_limit_store.get_request_count(
            client_ip, endpoint, window_minutes
        )
        
        if request_count >= max_attempts:
            logger.warning(
                f"Rate limit exceeded: ip={client_ip}, endpoint={endpoint}, "
                f"count={request_count}/{max_attempts}"
            )
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": {
                        "error": "Too many requests",
                        "message": f"Maximum {max_attempts} attempts allowed per {window_minutes} minutes. Please try again later.",
                        "retry_after_minutes": window_minutes
                    }
                }
            )
        
        # Record this request
        await rate_limit_store.add_request(client_ip, endpoint)
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers to response
        remaining = max_attempts - request_count - 1
        response.headers["X-RateLimit-Limit"] = str(max_attempts)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))
        response.headers["X-RateLimit-Window"] = f"{window_minutes}m"
        
        return response


async def start_cleanup_task():
    """Start background task to clean up old rate limit entries."""
    asyncio.create_task(rate_limit_store.cleanup_old_entries())

