import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import (
    Boolean, DateTime, Enum, ForeignKey, Index, Text, UniqueConstraint
)
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from app.core.database import Base
from app.core.uuid import UUIDColumn  # assumed to return mapped_column


class AssetCategoryType(str, enum.Enum):
    DEVICES = "devices"
    LAND_REGISTER = "land_register"
    BUILDINGS_REGISTER = "buildings_register"
    MOTOR_VEHICLES_REGISTER = "motor_vehicles_register"
    OFFICE_EQUIPMENT = "office_equipment"
    FURNITURE_FITTINGS_EQUIPMENT = "furniture_fittings_equipment"
    PLANT_MACHINERY = "plant_machinery"
    PORTABLE_ATTRACTIVE_ITEMS = "portable_attractive_items"
    ICT_ASSETS = "ict_assets"


class PermissionLevel(str, enum.Enum):
    NONE = "none"
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"


class AssetCategoryPermission(Base):
    __tablename__ = "asset_category_permissions"

    id: Mapped[UUID] = UUIDColumn()

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    granted_by: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
        index=True,
    )

    category: Mapped[AssetCategoryType] = mapped_column(
        Enum(AssetCategoryType),
        nullable=False,
        index=True,
    )

    permission_level: Mapped[PermissionLevel] = mapped_column(
        Enum(PermissionLevel),
        default=PermissionLevel.NONE,
        nullable=False,
        index=True
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False, index=True
    )

    reason: Mapped[Optional[str]] = mapped_column(Text)
    notes: Mapped[Optional[str]] = mapped_column(Text)

    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", foreign_keys=[user_id])
    granted_by_user = relationship("User", foreign_keys=[granted_by])

    __table_args__ = (
        UniqueConstraint("user_id", "category", name="unique_user_category_permission"),
        Index("idx_user_category_active", "user_id", "category", "is_active"),
        Index("idx_permission_level", "permission_level"),
        Index("idx_expiration_status", "expires_at", "is_active"),
    )

    # ----- Business logic helpers -----
    def is_expired(self) -> bool:
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at

    def has_access(self) -> bool:
        return (
            self.is_active
            and not self.is_expired()
            and self.permission_level != PermissionLevel.NONE
        )

    def can_read(self) -> bool:
        return (
            self.has_access()
            and self.permission_level in {
                PermissionLevel.READ,
                PermissionLevel.WRITE,
                PermissionLevel.ADMIN,
            }
        )

    def can_write(self) -> bool:
        return (
            self.has_access()
            and self.permission_level in {
                PermissionLevel.WRITE,
                PermissionLevel.ADMIN,
            }
        )

    def can_admin(self) -> bool:
        return (
            self.has_access()
            and self.permission_level == PermissionLevel.ADMIN
        )

    def __repr__(self):
        return (
            f"<AssetCategoryPermission id={self.id} "
            f"user_id={self.user_id} category={self.category} "
            f"level={self.permission_level}>"
        )
