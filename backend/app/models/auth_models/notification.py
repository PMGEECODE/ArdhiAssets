import uuid
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.uuid import UUIDColumn  # mapped_column-based UUID helper

UTC = ZoneInfo("UTC")


def utc_now() -> datetime:
    return datetime.now(UTC)


class Notification(Base):
    """User notification model"""

    __tablename__ = "notifications"
    __table_args__ = (
        Index("idx_notifications_user_id", "user_id"),
        Index("idx_notifications_read", "read"),
        Index("idx_notifications_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = UUIDColumn()
    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    message: Mapped[str] = mapped_column(String(500), nullable=False)
    link: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    user = relationship("User", back_populates="notifications")

    def __repr__(self) -> str:
        return f"<Notification id={self.id} read={self.read}>"
