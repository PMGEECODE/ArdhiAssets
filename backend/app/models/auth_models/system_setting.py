import uuid
from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy import Column, String, DateTime, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base

UTC = ZoneInfo("UTC")

def utc_now() -> datetime:
    return datetime.now(UTC)

class SystemSetting(Base):
    """System settings table for storing global configurations"""
    __tablename__ = "system_settings"
    __table_args__ = (
        Index("idx_system_settings_key", "key"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    key = Column(String(100), nullable=False, unique=True, index=True)  # Ensure fast lookup
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)

    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    updated_by = Column(UUID(as_uuid=True), nullable=True)  # stores user id

    def __repr__(self):
        return f"<SystemSetting(id={self.id}, key={self.key})>"
