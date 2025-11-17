import uuid
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional

from sqlalchemy import String, DateTime, Boolean, ForeignKey, JSON, Index
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.uuid import UUIDColumn  # mapped_column-based UUID helper

UTC = ZoneInfo("UTC")


def utc_now() -> datetime:
    return datetime.now(UTC)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    __table_args__ = (
        Index("idx_refresh_user_id", "user_id"),
        Index("idx_refresh_token_hash", "token_hash"),
        Index("idx_refresh_expires_at", "expires_at"),
        Index("idx_refresh_revoked", "revoked"),
    )

    id: Mapped[uuid.UUID] = UUIDColumn()
    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    device_info: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Token rotation support
    replaced_by_token_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("refresh_tokens.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    user = relationship("User", back_populates="refresh_tokens")
    replaced_by = relationship(
        "RefreshToken",
        remote_side=[id],
        foreign_keys=[replaced_by_token_id]
    )
    sessions = relationship(
        "Session",
        back_populates="refresh_token",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<RefreshToken id={self.id} user_id={self.user_id}>"
