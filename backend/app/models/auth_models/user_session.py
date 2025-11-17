"""
UserSession model - tracks active user sessions with device metadata
Prevents multiple simultaneous logins from different devices
"""

import uuid
from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo
from sqlalchemy import String, DateTime, Boolean, Index, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base

UTC = ZoneInfo("UTC")


class UserSession(Base):
    """Track active user sessions with device and IP information"""

    __tablename__ = "user_sessions"
    __table_args__ = (
        Index("ix_user_sessions_user_id", "user_id"),
        Index("ix_user_sessions_token_hash", "token_hash"),
        Index("ix_user_sessions_is_active", "is_active"),
    )

    user = relationship("User", lazy="joined")
    refresh_token = relationship("RefreshToken", lazy="joined", foreign_keys="UserSession.refresh_token_id")
     
    # Primary fields
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    # Token tracking
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    refresh_token_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    refresh_token_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("refresh_tokens.id", ondelete="SET NULL"), nullable=True
    )

    # Device metadata
    device_id: Mapped[str] = mapped_column(String(100), nullable=False)
    device_name: Mapped[str] = mapped_column(String(255), nullable=False)
    device_type: Mapped[str] = mapped_column(String(50), nullable=False)  # mobile, desktop, tablet
    browser: Mapped[str] = mapped_column(String(100), nullable=False)
    browser_version: Mapped[str] = mapped_column(String(50), nullable=False)
    os: Mapped[str] = mapped_column(String(100), nullable=False)
    os_version: Mapped[str] = mapped_column(String(50), nullable=False)

    # Network information
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)  # IPv4 or IPv6
    user_agent: Mapped[str] = mapped_column(Text, nullable=False)

    # Session status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_activity: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    invalidated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Note: User model does NOT have a relationship to UserSession to avoid conflicts with Session model

    def is_expired(self) -> bool:
        """Check if session has expired"""
        return datetime.now(UTC) > self.expires_at

    def is_valid(self) -> bool:
        """Check if session is valid and active"""
        return self.is_active and not self.is_expired()

    def invalidate(self) -> None:
        """Invalidate the session"""
        self.is_active = False
        self.invalidated_at = datetime.now(UTC)

    def update_activity(self) -> None:
        """Update last activity timestamp"""
        self.last_activity = datetime.now(UTC)

    def __repr__(self) -> str:
        return f"<UserSession(id='{self.id}', user_id='{self.user_id}', device='{self.device_name}', ip='{self.ip_address}')>"
