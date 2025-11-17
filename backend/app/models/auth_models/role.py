import uuid
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional, List

from sqlalchemy import String, Text, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.uuid import UUIDColumn

UTC = ZoneInfo("UTC")


def utc_now() -> datetime:
    return datetime.now(UTC)


class Role(Base):
    __tablename__ = "roles"
    __table_args__ = (
        Index("idx_role_name", "name"),
    )

    id: Mapped[uuid.UUID] = UUIDColumn()
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    # relationships
    permissions: Mapped[List["Permission"]] = relationship(
        "Permission",
        secondary="role_permissions",
        back_populates="roles"
    )

    def __repr__(self) -> str:
        return f"<Role id={self.id} name={self.name}>"


class Permission(Base):
    __tablename__ = "permissions"
    __table_args__ = (
        Index("idx_permission_code", "code"),
    )

    id: Mapped[uuid.UUID] = UUIDColumn()
    code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    roles: Mapped[List[Role]] = relationship(
        "Role",
        secondary="role_permissions",
        back_populates="permissions"
    )

    def __repr__(self) -> str:
        return f"<Permission id={self.id} code={self.code}>"


class RolePermission(Base):
    __tablename__ = "role_permissions"
    __table_args__ = (
        UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),
        Index("idx_role_permission_role_id", "role_id"),
        Index("idx_role_permission_permission_id", "permission_id"),
    )

    role_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="CASCADE"),
        primary_key=True
    )
    permission_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("permissions.id", ondelete="CASCADE"),
        primary_key=True
    )

    def __repr__(self) -> str:
        return f"<RolePermission role_id={self.role_id} permission_id={self.permission_id}>"
