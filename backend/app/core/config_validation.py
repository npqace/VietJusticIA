"""
Environment variable validation.

Ensures all required configuration is present and valid before application startup.
Prevents runtime errors due to missing or malformed environment variables.
"""

import os
import sys
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)


class ConfigValidationError(Exception):
    """Raised when configuration validation fails."""
    pass


class EnvironmentValidator:
    """
    Validates environment variables for security and correctness.
    
    Validates:
    - Required variables are present
    - Secret keys meet minimum security requirements
    - Database URLs are properly formatted
    - API keys are configured
    """
    
    # Required environment variables
    REQUIRED_VARS = [
        "SECRET_KEY",
        "DATABASE_URL",
        "GOOGLE_API_KEY",
    ]
    
    # Optional but recommended variables
    RECOMMENDED_VARS = [
        "REFRESH_SECRET_KEY",
        "MONGO_URL",
        "QDRANT_URL",
        "BREVO_API_KEY",
    ]
    
    def __init__(self):
        self.errors: List[str] = []
        self.warnings: List[str] = []
    
    def validate_all(self) -> bool:
        """
        Run all validation checks.
        
        Returns:
            bool: True if validation passes, False otherwise
        """
        self.validate_required_vars()
        self.validate_secret_keys()
        self.validate_database_urls()
        self.validate_api_keys()
        self.check_recommended_vars()
        
        # Log results
        if self.errors:
            logger.error("Configuration validation failed:")
            for error in self.errors:
                logger.error(f"  - {error}")
            return False
        
        if self.warnings:
            logger.warning("Configuration warnings:")
            for warning in self.warnings:
                logger.warning(f"  - {warning}")
        
        logger.info("Configuration validation passed")
        return True
    
    def validate_required_vars(self):
        """Check that all required variables are present."""
        for var in self.REQUIRED_VARS:
            value = os.getenv(var)
            if not value:
                self.errors.append(f"Required environment variable missing: {var}")
            elif not value.strip():
                self.errors.append(f"Required environment variable empty: {var}")
    
    def validate_secret_keys(self):
        """Validate secret keys meet minimum security requirements."""
        secret_key = os.getenv("SECRET_KEY", "")
        refresh_secret_key = os.getenv("REFRESH_SECRET_KEY", "")
        
        # Check SECRET_KEY length (minimum 32 characters)
        if secret_key and len(secret_key) < 32:
            self.errors.append(
                f"SECRET_KEY too short: {len(secret_key)} characters "
                "(minimum 32 characters required for security)"
            )
        
        # Check if using default/weak keys
        weak_keys = ["changeme", "secret", "password", "12345", "test"]
        if secret_key.lower() in weak_keys:
            self.errors.append(
                f"SECRET_KEY is using weak/default value: {secret_key}. "
                "Use a strong random key in production."
            )
        
        # Warn if SECRET_KEY and REFRESH_SECRET_KEY are identical
        if secret_key and refresh_secret_key and secret_key == refresh_secret_key:
            self.warnings.append(
                "SECRET_KEY and REFRESH_SECRET_KEY are identical. "
                "Consider using different keys for better security."
            )
    
    def validate_database_urls(self):
        """Validate database connection strings."""
        database_url = os.getenv("DATABASE_URL", "")
        mongo_url = os.getenv("MONGO_URL", "")
        
        # Validate PostgreSQL URL format
        if database_url:
            if not database_url.startswith(("postgresql://", "postgres://")):
                self.errors.append(
                    "DATABASE_URL must start with 'postgresql://' or 'postgres://'"
                )
            
            # Warn about default credentials
            if "postgres:postgres" in database_url or "password" in database_url:
                self.warnings.append(
                    "DATABASE_URL contains default/weak credentials. "
                    "Use strong passwords in production."
                )
        
        # Validate MongoDB URL format
        if mongo_url:
            if not mongo_url.startswith("mongodb://") and not mongo_url.startswith("mongodb+srv://"):
                self.errors.append(
                    "MONGO_URL must start with 'mongodb://' or 'mongodb+srv://'"
                )
    
    def validate_api_keys(self):
        """Validate API keys are present and not placeholder values."""
        google_api_key = os.getenv("GOOGLE_API_KEY", "")
        
        # Check for placeholder values
        placeholders = ["your-api-key", "changeme", "xxx", "abc123", "<your"]
        if any(placeholder in google_api_key.lower() for placeholder in placeholders):
            self.errors.append(
                "GOOGLE_API_KEY contains placeholder value. "
                "Replace with actual API key from Google Cloud Console."
            )
        
        # Warn about missing optional API keys
        if not os.getenv("BREVO_API_KEY"):
            self.warnings.append(
                "BREVO_API_KEY not set. Email functionality will not work."
            )
    
    def check_recommended_vars(self):
        """Check for recommended but optional variables."""
        for var in self.RECOMMENDED_VARS:
            if not os.getenv(var):
                self.warnings.append(
                    f"Recommended environment variable not set: {var}"
                )
    
    def get_environment_info(self) -> dict:
        """Get current environment information for logging."""
        return {
            "environment": os.getenv("ENVIRONMENT", "development"),
            "backend_port": os.getenv("BACKEND_PORT", "8000"),
            "database_configured": bool(os.getenv("DATABASE_URL")),
            "mongodb_configured": bool(os.getenv("MONGO_URL")),
            "qdrant_configured": bool(os.getenv("QDRANT_URL")),
            "google_api_configured": bool(os.getenv("GOOGLE_API_KEY")),
            "email_configured": bool(os.getenv("BREVO_API_KEY")),
        }


def validate_environment(strict: bool = True) -> bool:
    """
    Validate environment configuration.
    
    Args:
        strict: If True, exit on validation errors. If False, only log errors.
        
    Returns:
        bool: True if validation passes, False otherwise
    """
    validator = EnvironmentValidator()
    is_valid = validator.validate_all()
    
    # Log environment info
    env_info = validator.get_environment_info()
    logger.info(f"Environment configuration: {env_info}")
    
    # Exit on errors if strict mode
    if not is_valid and strict:
        logger.critical("Application startup aborted due to configuration errors")
        sys.exit(1)
    
    return is_valid


# Run validation on import (can be disabled by setting SKIP_CONFIG_VALIDATION=1)
if not os.getenv("SKIP_CONFIG_VALIDATION"):
    # Non-strict mode: log errors but don't exit
    # Allows application to start for debugging, but logs critical issues
    validate_environment(strict=False)

