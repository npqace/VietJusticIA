from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: str

class SignUpModel(UserBase):
    pwd: str
    confirm_pwd: str

class LoginModel(BaseModel):
    identifier: str  # Can be either email or phone
    pwd: str

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True