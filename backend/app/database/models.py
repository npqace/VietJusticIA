from sqlalchemy import Column, Integer, String, DateTime
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
    # New role column with default value "user"
    class Role(enum.Enum):
        ADMIN = "admin"
        LAWYER = "lawyer"
        USER = "user"

    role = Column(SqlEnum(Role, native_enum=False), nullable=False, default=Role.USER)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())