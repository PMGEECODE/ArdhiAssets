# fastapi-server/app/models/ict_asset_transfer.py

import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class IctAssetTransfer(Base):
    """
    SQLAlchemy model representing transfer history for ICT assets.
    Tracks asset re-assignments, location changes, and transfer metadata.
    """

    __tablename__ = "ict_asset_transfers"

    # =====================
    # Table Indexes
    # =====================
    __table_args__ = (
        Index("idx_transfer_asset_date", "ict_asset_id", "transfer_date"),  # Optimize lookup by asset & date
        Index("idx_transfer_location", "transfer_location"),  # Optimize queries by location
        Index("idx_transfer_assigned_to", "assigned_to"),  # Optimize queries by assignee
    )

    # =====================
    # Primary Identification
    # =====================
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
        unique=True,
    )  # Unique identifier for each transfer record

    # =====================
    # Asset Relationship
    # =====================
    ict_asset_id = Column(
        UUID(as_uuid=True),
        ForeignKey("ict_assets.id"),
        nullable=False,
        index=True,
    )  # Foreign key linking transfer to ICT asset

    # =====================
    # Transfer Parties
    # =====================
    previous_owner = Column(String(255), nullable=True)  # Officer who previously had the asset
    assigned_to = Column(
        String(255), nullable=False
    )  # Officer/employee the asset was reassigned to

    # =====================
    # Previous Location Details
    # =====================
    location = Column(String(255), nullable=True)  # Previous department/location
    room_or_floor = Column(String(255), nullable=True)  # Specific room/floor (if known)

    # =====================
    # New Location Details
    # =====================
    transfer_department = Column(
        String(255), nullable=True
    )  # Department the asset is moved to
    transfer_location = Column(
        String(255), nullable=False
    )  # New location of the asset (indexed)
    transfer_room_or_floor = Column(
        String(255), nullable=True
    )  # Specific room/floor in the new location
    transfer_reason = Column(Text, nullable=True)  # Reason for the transfer

    # =====================
    # Transfer Metadata
    # =====================
    transfer_date = Column(
        DateTime, default=datetime.utcnow, nullable=False, index=True
    )  # When the transfer occurred
    created_by = Column(
        String(150), nullable=True
    )  # User who created this transfer record
    created_at = Column(
        DateTime, default=datetime.utcnow, nullable=False
    )  # Record creation timestamp

    # =====================
    # Relationships
    # =====================
    ict_asset = relationship("IctAsset", backref="transfers")  # Link back to parent ICT asset

    def __repr__(self):
        return (
            f"<IctAssetTransfer(id={self.id}, ict_asset_id={self.ict_asset_id}, "
            f"assigned_to='{self.assigned_to}', transfer_date='{self.transfer_date}')>"
        )
