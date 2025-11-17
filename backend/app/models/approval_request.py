"""
Approval Request model for transfer approvals
Uses UUID for consistency with other models
"""

import uuid
import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import String, DateTime, Text, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class ApprovalStatus(str, enum.Enum):
    """Approval request status enumeration"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class ApprovalRequest(Base):
    """Generic approval request model for asset transfers and other approvals"""

    __tablename__ = "approval_requests"
    __table_args__ = (
        Index("idx_approval_requester_id", "requester_id"),
        Index("idx_approval_approver_id", "approver_id"),
        Index("idx_approval_status", "status"),
        Index("idx_approval_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    requester_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    approver_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Request details
    request_title: Mapped[str] = mapped_column(String(120), nullable=False)
    request_description: Mapped[str] = mapped_column(Text, nullable=False)

    # Status and timestamps
    status: Mapped[ApprovalStatus] = mapped_column(
        SQLEnum(ApprovalStatus), default=ApprovalStatus.PENDING, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Approval/rejection notes
    approval_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    requester = relationship("User", foreign_keys=[requester_id], back_populates="requested_approvals")
    approver = relationship("User", foreign_keys=[approver_id], back_populates="approved_requests")

    def __repr__(self) -> str:
        return f"<ApprovalRequest(id={self.id}, status={self.status})>"
