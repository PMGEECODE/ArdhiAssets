# backend/app/models/auth_models/session.py
from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Optional

from zoneinfo import ZoneInfo

# ---- SQLAlchemy core types -------------------------------------------------
from sqlalchemy import (
    String,
    DateTime,      # <-- added
    Boolean,       # (optional – if you ever need it)
    ForeignKey,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, INET

# ---- ORM mapping helpers ---------------------------------------------------
from sqlalchemy.orm import Mapped, mapped_column, relationship

# ---- Your project imports --------------------------------------------------
from app.core.database import Base
from app.core.config import settings

# ---- Related models (import them so Pylance sees the names) ---------------
from app.models.auth_models.user import User
from app.models.auth_models.refresh_token import RefreshToken

# ---------------------------------------------------------------------------
UTC = ZoneInfo("UTC")


def utc_now() -> datetime:
    """Current UTC datetime (aware)."""
    return datetime.now(UTC)


class Session(Base):
    __tablename__ = "sessions"
    __table_args__ = (
        Index("idx_sessions_user_id", "user_id"),
        Index("idx_sessions_refresh_token_id", "refresh_token_id"),
        Index("idx_sessions_last_seen", "last_seen"),
    )

    # ---------- Primary / foreign keys (real UUID on the instance) ----------
    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    refresh_token_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("refresh_tokens.id", ondelete="CASCADE"),
        nullable=False,
    )

    # ---------- Optional string columns ------------------------------------
    ip_address: Mapped[Optional[str]] = mapped_column(INET, nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)

    # ---------- Timestamps (real datetime on the instance) -----------------
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    last_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: utc_now() + timedelta(minutes=settings.DEFAULT_SESSION_TIMEOUT),
        nullable=False,
    )

    # ---------- Relationships ------------------------------------------------
    user: Mapped[User] = relationship("User", back_populates="sessions")
    refresh_token: Mapped[RefreshToken] = relationship(
        "RefreshToken", back_populates="sessions"
    )

    # ------------------------------------------------------------------------
    def __repr__(self) -> str:
        return f"<Session id={self.id} user_id={self.user_id}>"