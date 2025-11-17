# backend/app/models/auth_models/audit_log.py

import uuid
from typing import Optional
from uuid import UUID
from sqlalchemy import String, Text, DateTime, ForeignKey, func, JSON, Index
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.uuid import UUIDColumn  # mapped_column-based UUID helper


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[UUID] = UUIDColumn()  # primary key UUID

    user_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    username: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    action: Mapped[str] = mapped_column(String, nullable=False)
    entity_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    entity_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), nullable=True)
    event_category: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    role: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="success")
    old_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    new_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    timestamp: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user = relationship("User", back_populates="audit_logs")

    def __repr__(self) -> str:
        return (
            f"<AuditLog id={self.id} action={self.action} "
            f"entity={self.entity_type}:{self.entity_id}>"
        )


# ✅ Performance Indexes
Index('idx_auditlog_user_id', AuditLog.user_id)
Index('idx_auditlog_username', AuditLog.username)
Index('idx_auditlog_action', AuditLog.action)
Index('idx_auditlog_status', AuditLog.status)
Index('idx_auditlog_event_category', AuditLog.event_category)
Index('idx_auditlog_role', AuditLog.role)
Index('idx_auditlog_timestamp', AuditLog.timestamp)
Index('idx_auditlog_entity', AuditLog.entity_type, AuditLog.entity_id)
Index('idx_auditlog_user_action', AuditLog.user_id, AuditLog.action)
Index('idx_auditlog_user_time', AuditLog.user_id, AuditLog.timestamp)
Index('idx_auditlog_entity_action', AuditLog.entity_type, AuditLog.action)
Index('idx_auditlog_action_time', AuditLog.action, AuditLog.timestamp)
Index('idx_auditlog_status_time', AuditLog.status, AuditLog.timestamp)
Index('idx_auditlog_event_time', AuditLog.event_category, AuditLog.timestamp)
