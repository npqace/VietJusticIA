from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base
from sqlalchemy import Enum as SqlEnum
import enum

# Field length constants
MAX_NAME_LENGTH = 100
MAX_EMAIL_LENGTH = 100
MAX_PHONE_LENGTH = 20
MAX_SHORT_TEXT = 255
MAX_OTP_LENGTH = 6

class User(Base):
    """
    User model for authentication and profile management.

    Supports three roles: admin, lawyer, user.
    Includes OTP fields for signup and password reset flows.
    """
    __tablename__ = "users"

    # columns
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(MAX_NAME_LENGTH))
    email = Column(String(MAX_EMAIL_LENGTH), unique=True, index=True)
    phone = Column(String(MAX_PHONE_LENGTH), unique=True, index=True)
    hashed_password = Column(String(MAX_SHORT_TEXT))
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False)
    
    # OTP fields are nullable because they are only set during specific flows (signup, reset password)
    otp = Column(String(MAX_OTP_LENGTH), nullable=True)
    otp_expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Temporary fields for profile updates (email/phone change verification)
    new_email = Column(String(MAX_EMAIL_LENGTH), nullable=True)
    new_phone = Column(String(MAX_PHONE_LENGTH), nullable=True)
    
    # Optional profile fields
    avatar_url = Column(String(MAX_SHORT_TEXT), nullable=True)
    
    # Password reset flow
    reset_password_otp = Column(String(MAX_SHORT_TEXT), nullable=True)  # Can store a hash of the OTP
    reset_password_otp_expires_at = Column(DateTime(timezone=True), nullable=True)

    class Role(enum.Enum):
        ADMIN = "admin"
        LAWYER = "lawyer"
        USER = "user"

    role = Column(SqlEnum(Role, native_enum=False), nullable=False, default=Role.USER)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    lawyer_profile = relationship("Lawyer", back_populates="user", uselist=False, cascade="all, delete-orphan")
    service_requests_made = relationship("ServiceRequest", foreign_keys="ServiceRequest.user_id", back_populates="user", cascade="all, delete-orphan")
    consultation_requests = relationship("ConsultationRequest", foreign_keys="ConsultationRequest.user_id", back_populates="user", cascade="all, delete-orphan")
    help_requests = relationship("HelpRequest", foreign_keys="HelpRequest.user_id", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role={self.role})>"


class Lawyer(Base):
    """
    Lawyer profile model linked to a User account.
    Contains professional information, verification status, and availability.
    """
    __tablename__ = "lawyers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # Professional Information
    specialization = Column(String(MAX_SHORT_TEXT), nullable=False)  # e.g., "Civil Law, Family Law"
    bio = Column(Text, nullable=True)  # Optional bio
    years_of_experience = Column(Integer, default=0)
    bar_license_number = Column(String(MAX_NAME_LENGTH), unique=True, nullable=False)

    # Location (Optional)
    city = Column(String(MAX_NAME_LENGTH), nullable=True)
    province = Column(String(MAX_NAME_LENGTH), nullable=True)

    # Ratings and Reviews
    rating = Column(Numeric(3, 2), default=0.0)  # e.g., 4.75
    total_reviews = Column(Integer, default=0)

    # Verification and Availability
    class VerificationStatus(enum.Enum):
        PENDING = "PENDING"
        APPROVED = "APPROVED"
        REJECTED = "REJECTED"

    verification_status = Column(SqlEnum(VerificationStatus, native_enum=False),
                                  nullable=False, default=VerificationStatus.PENDING)
    is_available = Column(Boolean, default=True)

    # Additional Info
    consultation_fee = Column(Numeric(10, 2), nullable=True)  # Hourly rate in VND, nullable if not set
    languages = Column(String(MAX_SHORT_TEXT), default="Vietnamese")  # e.g., "Vietnamese, English"

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="lawyer_profile")
    service_requests_received = relationship("ServiceRequest", foreign_keys="ServiceRequest.lawyer_id", back_populates="lawyer", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Lawyer(id={self.id}, user_id={self.user_id}, status={self.verification_status})>"


class ServiceRequest(Base):
    """
    Service request from a User to a specific Lawyer.
    Tracks the lifecycle of a legal service request.
    """
    __tablename__ = "service_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lawyer_id = Column(Integer, ForeignKey("lawyers.id"), nullable=False)

    # Request Details
    title = Column(String(MAX_SHORT_TEXT), nullable=False)
    description = Column(Text, nullable=False)

    # Status Management
    class RequestStatus(enum.Enum):
        PENDING = "PENDING"
        ACCEPTED = "ACCEPTED"
        REJECTED = "REJECTED"
        IN_PROGRESS = "IN_PROGRESS"
        COMPLETED = "COMPLETED"
        CANCELLED = "CANCELLED"

    status = Column(SqlEnum(RequestStatus, native_enum=False),
                    nullable=False, default=RequestStatus.PENDING)

    # Lawyer Response
    lawyer_response = Column(Text, nullable=True)  # Optional response message
    rejected_reason = Column(Text, nullable=True)  # Required if rejected

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="service_requests_made")
    lawyer = relationship("Lawyer", foreign_keys=[lawyer_id], back_populates="service_requests_received")

    def __repr__(self):
        return f"<ServiceRequest(id={self.id}, title='{self.title}', status={self.status})>"


class HelpRequest(Base):
    """
    Help/Support request submitted by users to Admins.
    """
    __tablename__ = "help_requests"

    id = Column(Integer, primary_key=True, index=True)

    # User Information (nullable for guest submissions)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    full_name = Column(String(MAX_NAME_LENGTH), nullable=False)
    email = Column(String(MAX_EMAIL_LENGTH), nullable=False, index=True)
    # Request Details
    subject = Column(String(MAX_SHORT_TEXT), nullable=False)
    content = Column(Text, nullable=False)

    # Status Management
    class HelpStatus(enum.Enum):
        PENDING = "pending"
        IN_PROGRESS = "in_progress"
        RESOLVED = "resolved"
        CLOSED = "closed"

    status = Column(String(20), nullable=False, default="pending", index=True)

    # Admin Management
    admin_notes = Column(Text, nullable=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Admin who handled it

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="help_requests")
    admin = relationship("User", foreign_keys=[admin_id])

    def __repr__(self):
        return f"<HelpRequest(id={self.id}, email='{self.email}', status={self.status})>"


class ConsultationRequest(Base):
    """
    Consultation request submitted by users (form-based).
    """
    __tablename__ = "consultation_requests"

    id = Column(Integer, primary_key=True, index=True)

    # User Information (nullable for guest submissions)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    full_name = Column(String(MAX_NAME_LENGTH), nullable=False)
    email = Column(String(MAX_EMAIL_LENGTH), nullable=False, index=True)
    phone = Column(String(MAX_PHONE_LENGTH), nullable=False)
    
    # Location
    province = Column(String(MAX_NAME_LENGTH), nullable=False)
    district = Column(String(MAX_NAME_LENGTH), nullable=False)

    # Request Details
    content = Column(Text, nullable=False)

    # Status Management
    class ConsultationStatus(enum.Enum):
        PENDING = "pending"
        IN_PROGRESS = "in_progress"
        COMPLETED = "completed"
        REJECTED = "rejected"

    # Using String instead of SqlEnum to handle legacy data (uppercase)
    status = Column(String(20), nullable=False, default="pending", index=True)
    
    # Priority
    class Priority(enum.Enum):
        LOW = "low"
        MEDIUM = "medium"
        HIGH = "high"
    
    priority = Column(String(10), nullable=False, default="medium")

    # Admin Management
    admin_notes = Column(Text, nullable=True)
    assigned_lawyer_id = Column(Integer, ForeignKey("lawyers.id"), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="consultation_requests")
    assigned_lawyer = relationship("Lawyer", foreign_keys=[assigned_lawyer_id])

    def __repr__(self):
        return f"<ConsultationRequest(id={self.id}, email='{self.email}', status={self.status})>"


class SystemLog(Base):
    """
    Audit log for system actions performed by Admins.
    """
    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, index=True)
    
    # Who performed the action
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # What they did
    action = Column(String(50), nullable=False, index=True)  # e.g., "BAN_USER", "DELETE_DOCUMENT"
    
    # What/Who was affected
    target_id = Column(String(100), nullable=True)  # Can be int ID or string ID (like mongo/qdrant IDs)
    target_type = Column(String(50), nullable=False)  # e.g., "USER", "LAWYER", "DOCUMENT"
    
    # Context
    details = Column(Text, nullable=True)  # JSON string or plain text details
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    
    # When
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    admin = relationship("User", foreign_keys=[admin_id])

    def __repr__(self):
        return f"<SystemLog(id={self.id}, action='{self.action}', admin_id={self.admin_id})>"