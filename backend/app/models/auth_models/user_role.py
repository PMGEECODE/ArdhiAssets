"""
Enhanced User Role model for hierarchical permissions
Using UUIDv4 and SQLAlchemy 2.0 style
"""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, Text, JSON, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class UserRole(Base):
    __tablename__ = "user_roles"
    __table_args__ = (
        Index("ix_user_roles_name", "name", unique=True),
        Index("ix_user_roles_is_active", "is_active"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    default_permissions: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    parent_role_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("user_roles.id"), nullable=True
    )
    parent_role = relationship("UserRole", remote_side=[id])

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_system_role: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<UserRole(name='{self.name}', id='{self.id}')>"
