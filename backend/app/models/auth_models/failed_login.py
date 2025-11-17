import uuid
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID as PGUUID, INET
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.uuid import UUIDColumn  # mapped_column-based UUID helper

UTC = ZoneInfo("UTC")


def utc_now() -> datetime:
    return datetime.now(UTC)


class FailedLoginAttempt(Base):
    __tablename__ = "failed_login_attempts"
    __table_args__ = (
        Index("idx_failed_logins_user_id", "user_id"),
        Index("idx_failed_logins_username", "username"),
        Index("idx_failed_logins_ip", "ip_address"),
        Index("idx_failed_logins_time", "attempted_at"),
    )

    id: Mapped[uuid.UUID] = UUIDColumn()  # primary key UUID

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True
    )

    username: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[str] = mapped_column(INET, nullable=False)
    attempted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    user = relationship("User", back_populates="failed_logins")

    def __repr__(self) -> str:
        return f"<FailedLoginAttempt user={self.username or 'unknown'} ip={self.ip_address}>"
