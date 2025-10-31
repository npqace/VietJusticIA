from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from .database import Base
from sqlalchemy import Enum as SqlEnum
import enum

class User(Base):
    __tablename__ = "users"

    # columns
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100))
    email = Column(String(100), unique=True, index=True)
    phone = Column(String(20), unique=True, index=True)
    hashed_password = Column(String(255))
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False)
    otp = Column(String(6), nullable=True)
    otp_expires_at = Column(DateTime(timezone=True), nullable=True)
    new_email = Column(String(100), nullable=True)
    new_phone = Column(String(20), nullable=True)
    avatar_url = Column(String(255), nullable=True)
    reset_password_otp = Column(String(255), nullable=True)  # Can store a hash of the OTP
    reset_password_otp_expires_at = Column(DateTime(timezone=True), nullable=True)

    # New role column with default value "user"
    class Role(enum.Enum):
        ADMIN = "admin"
        LAWYER = "lawyer"
        USER = "user"

    role = Column(SqlEnum(Role, native_enum=False), nullable=False, default=Role.USER)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())