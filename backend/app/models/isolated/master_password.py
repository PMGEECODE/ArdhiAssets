"""
Master Password Model for Isolated Database
Stores master password hash and metadata in isolated PostgreSQL database
"""

import uuid
from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy import Column, String, DateTime, Text, Index, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.types import Integer

from app.core.isolated_db import IsolatedBase

UTC = ZoneInfo("UTC")


def utc_now() -> datetime:
    """Get current UTC time"""
    return datetime.now(UTC)


class MasterPassword(IsolatedBase):
    """
    Master Password Storage in Isolated Database
    
    This table stores the master password hash in a completely separate,
    isolated PostgreSQL database for maximum security.
    
    Security Features:
    - Isolated from main application database
    - Separate authentication credentials
    - Encrypted at rest in database
    - Audit logging for all access
    - Restricted network access recommended
    """
    
    __tablename__ = "master_passwords"
    __table_args__ = (
        Index("idx_master_password_is_active", "is_active"),
        Index("idx_master_password_created_at", "created_at"),
    )
    
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        unique=True,
        nullable=False,
    )
    
    # Password hash (Argon2id for security)
    password_hash = Column(
        Text,
        nullable=False,
        comment="Argon2id hashed master password"
    )
    
    # Status tracking
    is_active = Column(
        Boolean,
        default=True,
        nullable=False,
        comment="Whether this master password is active"
    )
    
    # Metadata
    label = Column(
        String(255),
        nullable=True,
        comment="Optional label for identifying password version"
    )
    
    # Timestamp fields
    created_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )
    
    updated_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )
    
    # Audit fields
    created_by_username = Column(
        String(255),
        nullable=True,
        comment="Username of admin who created this password"
    )
    
    updated_by_username = Column(
        String(255),
        nullable=True,
        comment="Username of admin who last updated this password"
    )
    
    # Version tracking for rotation
    version = Column(
        Integer,
        default=1,
        nullable=False,
        comment="Password version for rotation tracking"
    )
    
    def __repr__(self):
        return f"<MasterPassword(id={self.id}, version={self.version}, is_active={self.is_active})>"
