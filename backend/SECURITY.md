# VietJusticIA Security Implementation Guide

## Overview

This document describes the security measures implemented in the VietJusticIA backend application. The system employs a **defense-in-depth** strategy with multiple layers of security controls.

**Last Updated**: 2025-11-18  
**Status**: Quick Wins Security Implementation Complete

---

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Authentication & Authorization](#authentication--authorization)
3. [Security Middleware](#security-middleware)
4. [Rate Limiting](#rate-limiting)
5. [Input Validation](#input-validation)
6. [Security Headers](#security-headers)
7. [Environment Configuration](#environment-configuration)
8. [Best Practices](#best-practices)
9. [Security Checklist](#security-checklist)

---

## Security Architecture

### Defense-in-Depth Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Network (HTTPS/TLS, Reverse Proxy)                │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Security Headers (XSS, Clickjacking Protection)   │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: CORS (Cross-Origin Request Control)               │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: Rate Limiting (Brute Force Prevention)            │
├─────────────────────────────────────────────────────────────┤
│  Layer 5: Request Validation (Size & Content Type Limits)   │
├─────────────────────────────────────────────────────────────┤
│  Layer 6: Authentication (JWT Token Validation)             │
├─────────────────────────────────────────────────────────────┤
│  Layer 7: Authorization (Role-Based Access Control)         │
├─────────────────────────────────────────────────────────────┤
│  Layer 8: Input Validation (Pydantic Models)                │
└─────────────────────────────────────────────────────────────┘
```

**Middleware Execution Order** (innermost to outermost):
1. **Request Validation** → Validates size and content type
2. **Rate Limiting** → Prevents brute force attacks
3. **CORS** → Controls cross-origin requests
4. **Security Headers** → Adds protective HTTP headers

---

## Authentication & Authorization

### JWT Token System

**Implementation**: `backend/app/core/security.py`

```python
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
import os

# Token Configuration
SECRET_KEY = os.getenv("SECRET_KEY")
REFRESH_SECRET_KEY = os.getenv("REFRESH_SECRET_KEY", SECRET_KEY)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_MINUTES = 10080  # 7 days

# Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    """Create JWT access token with 30-minute expiry."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    """Create JWT refresh token with 7-day expiry."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
```

### Security Features:
- **Access Token**: 30-minute expiry (short-lived for security)
- **Refresh Token**: 7-day expiry (long-lived for convenience)
- **Separate Secret Keys**: Different keys for access and refresh tokens
- **bcrypt Hashing**: Automatic salt generation, slow hashing (brute force resistant)
- **Algorithm**: HS256 (HMAC with SHA-256)

### Role-Based Access Control (RBAC)

```python
class UserRole(str, Enum):
    """User roles for access control."""
    ADMIN = "admin"
    LAWYER = "lawyer"
    USER = "user"

# Token includes role claim
token_claims = {"sub": user.email, "role": user.role.value}
access_token = create_access_token(data=token_claims)
```

**Roles**:
- **user**: Regular users (chat, document lookup, request services)
- **lawyer**: Lawyers (manage cases, conversations, service requests)
- **admin**: Administrators (user management, system configuration)

---

## Security Middleware

### 1. Security Headers Middleware

**File**: `backend/app/middleware/security_headers.py`

**Purpose**: Adds security headers to all HTTP responses to protect against common web vulnerabilities.

```python
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all HTTP responses.
    
    Headers added:
    - X-Content-Type-Options: nosniff (Prevent MIME-sniffing)
    - X-Frame-Options: DENY (Prevent clickjacking)
    - X-XSS-Protection: 1; mode=block (Enable XSS filter)
    - Strict-Transport-Security: max-age=31536000; includeSubDomains; preload (Force HTTPS)
    - Content-Security-Policy: Restrict resource loading
    - Referrer-Policy: strict-origin-when-cross-origin
    - Permissions-Policy: Disable unnecessary browser features
    """
    
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
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
        
        # Content Security Policy (CSP)
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "connect-src 'self'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ]
        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)
        
        # Control referrer information leakage
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions Policy (disable unnecessary features)
        permissions_directives = [
            "geolocation=()",
            "microphone=()",
            "camera=()",
            "payment=()",
        ]
        response.headers["Permissions-Policy"] = ", ".join(permissions_directives)
        
        # Remove server identification header
        response.headers.pop("Server", None)
        
        return response
```

**Protection Against**:
- **XSS (Cross-Site Scripting)**: CSP, X-XSS-Protection
- **Clickjacking**: X-Frame-Options, CSP frame-ancestors
- **MIME-Sniffing**: X-Content-Type-Options
- **Man-in-the-Middle**: HSTS (production only)
- **Information Leakage**: Referrer-Policy, Server header removal

---

### 2. Authentication Rate Limiting Middleware

**File**: `backend/app/middleware/rate_limit_auth.py`

**Purpose**: Prevents brute force attacks on authentication endpoints by limiting request rates per IP address.

```python
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
    
    RATE_LIMITS = {
        "/api/v1/auth/login": (5, 15),
        "/api/v1/auth/signup": (3, 60),
        "/api/v1/auth/verify-otp": (5, 15),
        "/api/v1/auth/resend-otp": (3, 15),
        "/api/v1/auth/forgot-password": (3, 60),
        "/api/v1/auth/reset-password": (5, 15),
        "/api/v1/password/change-password": (5, 15),
    }
    
    async def dispatch(self, request: Request, call_next):
        """Check rate limit before processing request."""
        
        # Only check POST requests to auth endpoints
        if request.method != "POST" or endpoint not in self.RATE_LIMITS:
            return await call_next(request)
        
        max_attempts, window_minutes = self.RATE_LIMITS[endpoint]
        client_ip = self.get_client_ip(request)
        
        # Check request count
        request_count = await rate_limit_store.get_request_count(
            client_ip, endpoint, window_minutes
        )
        
        if request_count >= max_attempts:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "Too many requests",
                    "message": f"Maximum {max_attempts} attempts allowed per {window_minutes} minutes.",
                    "retry_after_minutes": window_minutes
                }
            )
        
        # Record this request and continue
        await rate_limit_store.add_request(client_ip, endpoint)
        response = await call_next(request)
        
        # Add rate limit headers
        remaining = max_attempts - request_count - 1
        response.headers["X-RateLimit-Limit"] = str(max_attempts)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))
        response.headers["X-RateLimit-Window"] = f"{window_minutes}m"
        
        return response
```

**Features**:
- **Per-IP Tracking**: Tracks requests by client IP address
- **Sliding Window**: Time-based rate limiting with automatic cleanup
- **Reverse Proxy Support**: Handles X-Forwarded-For and X-Real-IP headers
- **Rate Limit Headers**: Returns X-RateLimit-* headers for client awareness
- **Background Cleanup**: Removes old entries every 5 minutes

**Response Headers**:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Window: 15m
```

---

### 3. Request Validation Middleware

**File**: `backend/app/middleware/request_validation.py`

**Purpose**: Validates request size and content type to prevent DoS attacks and malformed requests.

```python
class RequestValidationMiddleware(BaseHTTPMiddleware):
    """
    Middleware to validate incoming requests for size and content type.
    
    Size Limits:
    - Regular requests: 10 MB
    - File uploads: 50 MB (avatars, documents)
    
    Allowed Content Types:
    - application/json
    - multipart/form-data
    - application/x-www-form-urlencoded
    """
    
    MAX_REQUEST_SIZE = 10 * 1024 * 1024  # 10 MB
    MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50 MB
    
    UPLOAD_ENDPOINTS = [
        "/api/v1/users/me/avatar",
        "/api/v1/admin/documents/upload",
    ]
    
    async def dispatch(self, request: Request, call_next):
        """Validate request before processing."""
        
        # Check request size
        content_length = request.headers.get("content-length")
        if content_length:
            content_length = int(content_length)
            
            # Determine size limit based on endpoint
            if self.is_upload_endpoint(request.url.path):
                max_size = self.MAX_UPLOAD_SIZE
                size_label = "50MB"
            else:
                max_size = self.MAX_REQUEST_SIZE
                size_label = "10MB"
            
            if content_length > max_size:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Request body too large. Maximum allowed size is {size_label}."
                )
        
        # Validate Content-Type for POST/PUT/PATCH requests
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "")
            base_content_type = content_type.split(";")[0].strip()
            
            allowed_types = [
                "application/json",
                "multipart/form-data",
                "application/x-www-form-urlencoded"
            ]
            
            is_allowed = any(
                base_content_type.startswith(allowed)
                for allowed in allowed_types
            )
            
            if not is_allowed and content_type:
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail=f"Unsupported content type: {base_content_type}"
                )
        
        return await call_next(request)
```

**Protection Against**:
- **DoS Attacks**: Request size limits prevent memory exhaustion
- **Malformed Requests**: Content-Type validation ensures proper format
- **File Upload Abuse**: Separate limits for file uploads

---

## Rate Limiting

### Gemini API Rate Limiter

**File**: `backend/app/utils/rate_limiter.py`

**Purpose**: Manages Google Gemini API free tier limits for the RAG system.

```python
class GeminiRateLimiter:
    """
    Token bucket rate limiter for Gemini API free tier.
    
    Free tier limits:
    - 15 requests per minute (RPM)
    - 1,500 requests per day (RPD)
    """
    
    def __init__(
        self,
        requests_per_minute: int = 15,
        requests_per_day: int = 1500,
        burst_allowance: float = 0.8  # Use 80% for safety margin
    ):
        self.rpm_limit = int(requests_per_minute * burst_allowance)
        self.rpd_limit = int(requests_per_day * burst_allowance)
        self.minute_requests = deque()
        self.daily_requests = 0
        self.lock = asyncio.Lock()
    
    async def acquire(self) -> bool:
        """
        Acquire permission to make an API request.
        Returns True if allowed, False if rate limit exceeded.
        """
        async with self.lock:
            # Reset daily counter if needed
            if datetime.now() >= self.daily_reset_time:
                self.daily_requests = 0
                self.daily_reset_time = datetime.now() + timedelta(days=1)
            
            # Check daily limit
            if self.daily_requests >= self.rpd_limit:
                return False
            
            # Remove requests older than 1 minute
            now = time.time()
            one_minute_ago = now - 60
            while self.minute_requests and self.minute_requests[0] < one_minute_ago:
                self.minute_requests.popleft()
            
            # Check minute limit
            if len(self.minute_requests) >= self.rpm_limit:
                return False
            
            # Grant permission
            self.minute_requests.append(now)
            self.daily_requests += 1
            return True
```

**Configuration** (`.env`):
```bash
GEMINI_RPM_LIMIT=15
GEMINI_RPD_LIMIT=1500
RATE_LIMIT_BURST_ALLOWANCE=0.8
```

---

## Input Validation

### Pydantic Models

All API endpoints use Pydantic models for input validation:

```python
from pydantic import BaseModel, EmailStr, Field, validator

class SignUpModel(BaseModel):
    """User signup validation."""
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr  # Validates email format
    phone: str = Field(..., pattern=r"^\+?[0-9]{10,15}$")
    pwd: str = Field(..., min_length=8, max_length=128)
    confirm_pwd: str
    
    @validator('pwd')
    def validate_password_strength(cls, v):
        """Enforce strong password requirements."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain digit')
        return v
```

**Validation Features**:
- **Email**: EmailStr validates proper email format
- **Phone**: Regex pattern for international phone numbers
- **Password**: Minimum 8 characters, complexity requirements
- **String Length**: min_length and max_length constraints
- **Custom Validators**: Business logic validation

---

## Security Headers

### Headers Added to All Responses

| Header | Value | Purpose |
|--------|-------|---------|
| **X-Content-Type-Options** | `nosniff` | Prevent MIME-type sniffing attacks |
| **X-Frame-Options** | `DENY` | Prevent clickjacking (no framing allowed) |
| **X-XSS-Protection** | `1; mode=block` | Enable XSS filter in older browsers |
| **Strict-Transport-Security** | `max-age=31536000; includeSubDomains; preload` | Force HTTPS (production only) |
| **Content-Security-Policy** | `default-src 'self'; ...` | Restrict resource loading |
| **Referrer-Policy** | `strict-origin-when-cross-origin` | Control referrer information |
| **Permissions-Policy** | `geolocation=(), camera=(), ...` | Disable unnecessary browser features |

### HSTS (HTTP Strict Transport Security)

**Production Only** - Forces HTTPS for 1 year:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Benefits**:
- Prevents SSL stripping attacks
- Automatic HTTPS redirect
- Browser preload list eligible

---

## Environment Configuration

### Configuration Validation

**File**: `backend/app/core/config_validation.py`

**Purpose**: Validates environment variables on startup to prevent runtime errors.

```python
class EnvironmentValidator:
    """
    Validates environment variables for security and correctness.
    
    Checks:
    - Required variables are present
    - Secret keys meet minimum security requirements (32+ characters)
    - Database URLs are properly formatted
    - API keys are not placeholder values
    """
    
    REQUIRED_VARS = [
        "SECRET_KEY",
        "DATABASE_URL",
        "GOOGLE_API_KEY",
    ]
    
    def validate_all(self) -> bool:
        """Run all validation checks."""
        self.validate_required_vars()
        self.validate_secret_keys()
        self.validate_database_urls()
        self.validate_api_keys()
        
        if self.errors:
            logger.error("Configuration validation failed:")
            for error in self.errors:
                logger.error(f"  - {error}")
            return False
        
        return True
```

**Example Validation**:
```python
# Check SECRET_KEY length
if secret_key and len(secret_key) < 32:
    self.errors.append(
        f"SECRET_KEY too short: {len(secret_key)} characters "
        "(minimum 32 characters required)"
    )

# Check for weak keys
weak_keys = ["changeme", "secret", "password"]
if secret_key.lower() in weak_keys:
    self.errors.append(
        f"SECRET_KEY is using weak/default value"
    )
```

### Required Environment Variables

```bash
# Core Security
SECRET_KEY="<64-character-random-string>"
REFRESH_SECRET_KEY="<different-64-character-string>"

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/vietjusticia"
MONGO_URL="mongodb://localhost:27017/"
QDRANT_URL="http://localhost:6333"

# API Keys
GOOGLE_API_KEY="<your-google-api-key>"
BREVO_API_KEY="<your-brevo-api-key>"

# Rate Limiting
GEMINI_RPM_LIMIT=15
GEMINI_RPD_LIMIT=1500

# Environment
ENVIRONMENT="production"  # or "development"
```

---

## Best Practices

### 1. Password Security
- **Hashing**: bcrypt with automatic salt generation
- **Minimum Length**: 8 characters
- **Complexity**: Uppercase, lowercase, digits required
- **Storage**: Never store plain text passwords

### 2. Token Management
- **Short Access Tokens**: 30 minutes (limits exposure if stolen)
- **Refresh Tokens**: 7 days (balance security and convenience)
- **Separate Secrets**: Different keys for access and refresh tokens
- **Secure Storage**: Use expo-secure-store on mobile (encrypted keychain)

### 3. API Security
- **Authentication**: JWT tokens on all protected endpoints
- **Authorization**: Role-based access control (RBAC)
- **Rate Limiting**: Prevent brute force and API abuse
- **Input Validation**: Pydantic models for all inputs

### 4. Production Deployment
- **HTTPS Only**: Force TLS with HSTS header
- **Reverse Proxy**: Nginx or similar for TLS termination
- **Environment Variables**: Never commit secrets to git
- **Monitoring**: Log security events (failed logins, rate limit violations)

### 5. Mobile App Security
- **Token Storage**: Use expo-secure-store (not AsyncStorage)
- **API URL**: Use HTTPS in production
- **Certificate Pinning**: Implement for production (optional)
- **Code Obfuscation**: Minify JavaScript bundle

---

## Security Checklist

### ✅ Implemented (Quick Wins)

- [x] **JWT Authentication** with access and refresh tokens
- [x] **bcrypt Password Hashing** with automatic salt generation
- [x] **Security Headers Middleware** (XSS, clickjacking, MIME-sniffing protection)
- [x] **Authentication Rate Limiting** (brute force prevention)
- [x] **Request Validation** (size limits, content type checking)
- [x] **Environment Configuration Validation**
- [x] **CORS Configuration** for mobile and web support
- [x] **Role-Based Access Control** (admin, lawyer, user)
- [x] **Input Validation** with Pydantic models
- [x] **Gemini API Rate Limiting** (free tier optimization)

### ⏳ Recommended for Production

- [ ] **HTTPS/TLS** - Deploy with SSL certificate (Let's Encrypt)
- [ ] **Reverse Proxy** - Nginx for TLS termination and load balancing
- [ ] **Database Encryption** - Encrypt sensitive fields at rest
- [ ] **Audit Logging** - Log security events to MongoDB system_logs
- [ ] **Dependency Scanning** - Regular security updates (Dependabot)
- [ ] **Penetration Testing** - External security audit
- [ ] **Backup Strategy** - Regular automated backups
- [ ] **Incident Response Plan** - Security breach procedures

### 🔒 Additional Security (Future Enhancements)

- [ ] **Redis Rate Limiting** - Distributed rate limiting for multi-instance
- [ ] **IP Whitelisting** - Admin endpoints restricted to specific IPs
- [ ] **Two-Factor Authentication (2FA)** - Additional security layer
- [ ] **OAuth 2.0** - Google/Apple sign-in integration
- [ ] **API Key Rotation** - Automated secret rotation
- [ ] **Web Application Firewall (WAF)** - Cloudflare or AWS WAF
- [ ] **DDoS Protection** - Cloud-based DDoS mitigation

---

## Monitoring & Logging

### Security Event Logging

**Logged Events**:
- Failed login attempts (with IP address)
- Rate limit violations
- Invalid token usage
- Configuration validation errors
- Request size violations

**Log Format**:
```python
logger.warning(
    f"Rate limit exceeded: ip={client_ip}, endpoint={endpoint}, "
    f"count={request_count}/{max_attempts}"
)
```

### Monitoring Endpoint

**GET** `/api/v1/monitoring/stats` (authenticated)

Returns rate limiter and cache statistics:
```json
{
  "rate_limiter": {
    "requests_this_minute": 8,
    "requests_today": 245,
    "rpm_limit": 12,
    "rpd_limit": 1200
  },
  "cache": {
    "size": 125,
    "hit_rate": 0.42,
    "hits": 520,
    "misses": 725
  },
  "rag_service": {
    "initialized": true
  }
}
```

---

## Testing Security

### Manual Testing

**Test Rate Limiting**:
```bash
# Send 6 login requests rapidly (should block 6th)
for i in {1..6}; do
  curl -X POST http://localhost:8000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"identifier": "test@example.com", "pwd": "password"}'
done
```

**Test Request Size Limit**:
```bash
# Send request larger than 10MB (should return 413)
dd if=/dev/zero bs=1M count=11 | curl -X POST \
  http://localhost:8000/api/v1/chat/query \
  -H "Content-Type: application/json" \
  --data-binary @-
```

**Check Security Headers**:
```bash
curl -I http://localhost:8000/health
# Should show X-Content-Type-Options, X-Frame-Options, etc.
```

### Automated Testing

**pytest Tests** (implement in `backend/tests/security/`):
- `test_rate_limiting.py` - Rate limit enforcement
- `test_security_headers.py` - Header presence and values
- `test_input_validation.py` - Pydantic validation
- `test_authentication.py` - JWT token validation

---

## Incident Response

### Security Breach Procedure

1. **Detect**: Monitor logs for suspicious activity
2. **Contain**: Block attacker IP, revoke compromised tokens
3. **Investigate**: Analyze logs, identify attack vector
4. **Remediate**: Patch vulnerability, rotate secrets
5. **Document**: Record incident details and response
6. **Prevent**: Update security measures, conduct review

### Emergency Actions

**Revoke All Tokens** (database query):
```sql
-- Force all users to re-login
UPDATE users SET updated_at = NOW();
```

**Block IP Address** (add to rate limiter):
```python
# Add to middleware blacklist
BLOCKED_IPS = ["1.2.3.4", "5.6.7.8"]
```

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security Best Practices](https://fastapi.tiangolo.com/tutorial/security/)
- [JWT Security Best Practices](https://tools.ietf.org/html/rfc8725)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [HSTS Specification](https://tools.ietf.org/html/rfc6797)

---

**Last Updated**: 2025-11-18  
**Maintained By**: VietJusticIA Development Team

