import uuid
import enum
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional

from sqlalchemy import String, Integer, DateTime, Boolean, Enum, Index
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func 

from app.core.database import Base
from app.core.uuid import UUIDColumn

UTC = ZoneInfo("UTC")


def utc_now() -> datetime:
    return datetime.now(UTC)


class BackupType(str, enum.Enum):
    FULL = "full"
    DATABASE = "database"
    FILES = "files"


class BackupStatus(str, enum.Enum):
    COMPLETED = "completed"
    FAILED = "failed"
    IN_PROGRESS = "in_progress"
    RESTORING = "restoring"


class Backup(Base):
    __tablename__ = "backups"
    __table_args__ = (
        Index("idx_backups_status", "status"),
        Index("idx_backups_created_by", "created_by"),
        Index("idx_backups_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = UUIDColumn()  # primary key UUID
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)  # Size in bytes
    backup_type: Mapped[BackupType] = mapped_column(Enum(BackupType), nullable=False)
    status: Mapped[BackupStatus] = mapped_column(
        Enum(BackupStatus), nullable=False, default=BackupStatus.COMPLETED
    )
    created_by: Mapped[str] = mapped_column(String(120), nullable=False)  # user ID or system
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    error_message: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    progress_percentage: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    progress_message: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    encrypted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    encrypted_password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    def __repr__(self) -> str:
        return (
            f"<Backup id={self.id} type={self.backup_type} "
            f"status={self.status} progress={self.progress_percentage}% "
            f"encrypted={self.encrypted}>"
        )
