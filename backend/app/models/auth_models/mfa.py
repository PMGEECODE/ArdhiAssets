import uuid
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional, List

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Index, ARRAY
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.uuid import UUIDColumn

UTC = ZoneInfo("UTC")


def utc_now() -> datetime:
    return datetime.now(UTC)


class MFASecret(Base):
    __tablename__ = "mfa_secrets"
    __table_args__ = (
        Index("idx_mfa_user_id", "user_id"),
        Index("idx_mfa_enabled", "enabled"),
    )

    id: Mapped[uuid.UUID] = UUIDColumn()
    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True  # One MFA record per user
    )
    secret_encrypted: Mapped[str] = mapped_column(String(255), nullable=False)
    backup_codes: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="mfa_secret_rel")

    def __repr__(self) -> str:
        return f"<MFASecret user_id={self.user_id} enabled={self.enabled}>"
