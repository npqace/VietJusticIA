from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
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

    # Relationships
    lawyer_profile = relationship("Lawyer", back_populates="user", uselist=False)
    service_requests_made = relationship("ServiceRequest", foreign_keys="ServiceRequest.user_id", back_populates="user")


class Lawyer(Base):
    __tablename__ = "lawyers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # Professional Information
    specialization = Column(String(255), nullable=False)  # e.g., "Civil Law, Family Law"
    bio = Column(Text, nullable=True)
    years_of_experience = Column(Integer, default=0)
    bar_license_number = Column(String(100), unique=True, nullable=False)

    # Location
    city = Column(String(100), nullable=True)
    province = Column(String(100), nullable=True)

    # Ratings and Reviews
    rating = Column(Numeric(3, 2), default=0.0)  # e.g., 4.75
    total_reviews = Column(Integer, default=0)

    # Verification and Availability
    class VerificationStatus(enum.Enum):
        PENDING = "pending"
        APPROVED = "approved"
        REJECTED = "rejected"

    verification_status = Column(SqlEnum(VerificationStatus, native_enum=False),
                                  nullable=False, default=VerificationStatus.PENDING)
    is_available = Column(Boolean, default=True)

    # Additional Info
    consultation_fee = Column(Numeric(10, 2), nullable=True)  # Hourly rate in VND
    languages = Column(String(255), default="Vietnamese")  # e.g., "Vietnamese, English"

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="lawyer_profile")
    service_requests_received = relationship("ServiceRequest", foreign_keys="ServiceRequest.lawyer_id", back_populates="lawyer")


class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lawyer_id = Column(Integer, ForeignKey("lawyers.id"), nullable=False)

    # Request Details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)

    # Status Management
    class RequestStatus(enum.Enum):
        PENDING = "pending"
        ACCEPTED = "accepted"
        REJECTED = "rejected"
        IN_PROGRESS = "in_progress"
        COMPLETED = "completed"
        CANCELLED = "cancelled"

    status = Column(SqlEnum(RequestStatus, native_enum=False),
                    nullable=False, default=RequestStatus.PENDING)

    # Lawyer Response
    lawyer_response = Column(Text, nullable=True)
    rejected_reason = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="service_requests_made")
    lawyer = relationship("Lawyer", foreign_keys=[lawyer_id], back_populates="service_requests_received")