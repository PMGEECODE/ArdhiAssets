"""
User model - Authentication, MFA, Roles, Security, Profile
Clean version using UUID4 + Optimized Indexes
"""

import uuid
import enum
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import (
    String, Boolean, DateTime, Enum, Integer, Text,
    ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from passlib.context import CryptContext

from app.core.database import Base
from app.core.config import settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"
    VIEWER = "viewer"


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("ix_users_username", "username", unique=True),
        Index("ix_users_email", "email", unique=True),
        Index("ix_users_role", "role"),
        Index("ix_users_last_login", "last_login"),
        Index("ix_users_reset_token", "reset_token"),
        Index("ix_users_two_factor_code", "two_factor_code"),
        Index("ix_users_created_at", "created_at"),
        Index("ix_users_password_changed_at", "password_changed_at"),
    )

    # Identity
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    username: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)

    # Security
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, index=True, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # Role
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.USER)

    # Login protection
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # 2FA
    two_factor_auth: Mapped[bool] = mapped_column(Boolean, default=False)
    two_factor_secret: Mapped[Optional[str]] = mapped_column(String(255))
    two_factor_code: Mapped[Optional[str]] = mapped_column(String(10))
    two_factor_code_expires: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Password lifecycle
    password_expiration: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.utcnow() + timedelta(days=90)
    )
    reset_token: Mapped[Optional[str]] = mapped_column(String(100))
    reset_token_expiry: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # tracks when the user last changed their password (set to now when user creates account or changes password)
    password_changed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=None)
    # flag to enforce password change within 5 days of account creation
    requires_password_change: Mapped[bool] = mapped_column(Boolean, default=True)
    # stores hash of previous password to prevent reuse
    previous_password_hash: Mapped[Optional[str]] = mapped_column(String(255), default=None)

    session_timeout: Mapped[int] = mapped_column(
        Integer, default=settings.DEFAULT_SESSION_TIMEOUT
    )

    # Profile
    first_name: Mapped[Optional[str]] = mapped_column(String(50))
    last_name: Mapped[Optional[str]] = mapped_column(String(50))
    department: Mapped[Optional[str]] = mapped_column(String(100))
    personal_number: Mapped[Optional[str]] = mapped_column(String(20))

    # Status
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime)
    deactivation_reason: Mapped[Optional[str]] = mapped_column(Text)
    deactivated_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Notifications
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True)
    device_alerts: Mapped[bool] = mapped_column(Boolean, default=True)  # ✅ added
    security_alerts: Mapped[bool] = mapped_column(Boolean, default=True)
    maintenance_alerts: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")
    failed_logins = relationship("FailedLoginAttempt", back_populates="user", cascade="all, delete-orphan")
    mfa_secret_rel = relationship("MFASecret", back_populates="user", cascade="all, delete-orphan", uselist=False)
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    requested_approvals = relationship(
        "ApprovalRequest",
        foreign_keys="ApprovalRequest.requester_id",
        back_populates="requester"
    )
    approved_requests = relationship(
        "ApprovalRequest",
        foreign_keys="ApprovalRequest.approver_id",
        back_populates="approver"
    )
    device_otps = relationship("DeviceOTP", back_populates="user", cascade="all, delete-orphan")

    # Password methods
    def set_password(self, password: str) -> None:
        self.password_hash = pwd_context.hash(password)

    def verify_password(self, password: str) -> bool:
        return pwd_context.verify(password, self.password_hash)

    def is_password_expired(self) -> bool:
        return datetime.utcnow() > self.password_expiration

    def is_password_change_required(self) -> bool:
        """
        Returns True if user is within 5 days of account creation and hasn't changed password yet,
        or if they're past 5 days and haven't changed password.
        """
        if not self.requires_password_change:
            return False
        
        days_since_creation = (datetime.utcnow() - self.created_at).days
        
        # If password has never been changed
        if self.password_changed_at is None:
            # Within 5 days: show warning
            if days_since_creation < 5:
                return False  # Within grace period, just warn
            # After 5 days: enforce
            return days_since_creation >= 5
        
        return False

    def is_password_change_overdue(self) -> bool:
        """
        Returns True if user created account more than 5 days ago and hasn't changed password.
        This is the hard enforcement after the grace period.
        """
        if self.password_changed_at is not None:
            return False  # Password was changed
        
        days_since_creation = (datetime.utcnow() - self.created_at).days
        return days_since_creation > 5

    def can_use_new_password(self, new_password: str) -> bool:
        """
        Returns False if the new password matches the previous password hash.
        Used to prevent password reuse.
        """
        if self.previous_password_hash is None:
            return True  # No previous password to compare
        
        return not pwd_context.verify(new_password, self.previous_password_hash)

    def deactivate(self, reason: Optional[str] = None) -> None:
        self.is_active = False
        self.deactivation_reason = reason
        self.deactivated_at = datetime.utcnow()

    def reactivate(self) -> None:
        self.is_active = True
        self.deactivation_reason = None
        self.deactivated_at = None

    @property
    def full_name(self) -> str:
        return (f"{self.first_name or ''} {self.last_name or ''}").strip() or self.username

    def __repr__(self):
        return f"<User {self.username} ({self.email})>"
