from pydantic import BaseModel, EmailStr, field_validator, Field
from typing import Optional
from datetime import datetime
import re

class UserBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(..., pattern=r'^\+?84?[0-9]{9,10}$')  # Vietnamese phone format

class SignUpModel(UserBase):
    pwd: str = Field(..., min_length=8)
    confirm_pwd: str

    @field_validator('full_name')
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Full name cannot be empty')
        if len(v.strip()) < 2:
            raise ValueError('Full name must be at least 2 characters')
        if not re.match(r'^[a-zA-ZÀ-ỹ\s]+$', v):
            raise ValueError('Full name can only contain letters and spaces')
        return v.strip()

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        # Remove spaces and dashes
        cleaned = re.sub(r'[\s\-]', '', v)
        
        # Vietnamese phone patterns: 84xxxxxxxxx or 0xxxxxxxxx
        if not re.match(r'^(\+?84|0)[0-9]{9,10}$', cleaned):
            raise ValueError('Invalid Vietnamese phone number format')
        
        # Normalize to format: 0xxxxxxxxx
        if cleaned.startswith('+84'):
            cleaned = '0' + cleaned[3:]
        elif cleaned.startswith('84'):
            cleaned = '0' + cleaned[2:]
            
        return cleaned

    @field_validator('pwd')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one number')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v

    @field_validator('confirm_pwd')
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if 'pwd' in info.data and v != info.data['pwd']:
            raise ValueError('Passwords do not match')
        return v

class LoginModel(BaseModel):
    identifier: str  # Can be either email or phone
    pwd: str

class UserResponse(UserBase):
    id: int
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True