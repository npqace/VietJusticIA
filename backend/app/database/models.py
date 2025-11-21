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
        PENDING = "PENDING"
        APPROVED = "APPROVED"
        REJECTED = "REJECTED"

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
        PENDING = "PENDING"
        ACCEPTED = "ACCEPTED"
        REJECTED = "REJECTED"
        IN_PROGRESS = "IN_PROGRESS"
        COMPLETED = "COMPLETED"
        CANCELLED = "CANCELLED"

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


class ConsultationRequest(Base):
    __tablename__ = "consultation_requests"

    id = Column(Integer, primary_key=True, index=True)

    # User Information (nullable for guest submissions)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False, index=True)
    phone = Column(String(20), nullable=False)

    # Location
    province = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)

    # Request Details
    content = Column(Text, nullable=False)

    # Status Management
    class ConsultationStatus(enum.Enum):
        PENDING = "pending"
        IN_PROGRESS = "in_progress"
        COMPLETED = "completed"
        REJECTED = "rejected"

    status = Column(SqlEnum(ConsultationStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]),
                    nullable=False, default=ConsultationStatus.PENDING.value, index=True)

    # Priority for Admin
    class Priority(enum.Enum):
        LOW = "low"
        MEDIUM = "medium"
        HIGH = "high"

    priority = Column(SqlEnum(Priority, native_enum=False, values_callable=lambda x: [e.value for e in x]),
                     nullable=False, default=Priority.MEDIUM.value)

    # Admin Management
    admin_notes = Column(Text, nullable=True)
    assigned_lawyer_id = Column(Integer, ForeignKey("lawyers.id"), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    assigned_lawyer = relationship("Lawyer", foreign_keys=[assigned_lawyer_id])


class HelpRequest(Base):
    __tablename__ = "help_requests"

    id = Column(Integer, primary_key=True, index=True)

    # User Information (nullable for guest submissions)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False, index=True)

    # Request Details
    subject = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)

    # Status Management
    class HelpStatus(enum.Enum):
        PENDING = "pending"
        IN_PROGRESS = "in_progress"
        RESOLVED = "resolved"
        CLOSED = "closed"

    status = Column(SqlEnum(HelpStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]),
                    nullable=False, default=HelpStatus.PENDING.value, index=True)

    # Admin Management
    admin_notes = Column(Text, nullable=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Admin who handled it

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    admin = relationship("User", foreign_keys=[admin_id])


class SystemLog(Base):
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