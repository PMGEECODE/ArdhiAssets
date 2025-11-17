import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class OfficeEquipmentTransfer(Base):
    """
    SQLAlchemy model representing transfer history for Office Equipment.
    Tracks asset re-assignments, location changes, and transfer metadata.
    """

    __tablename__ = "office_equipment_transfers"

    # =====================
    # Table Indexes
    # =====================
    __table_args__ = (
        Index("idx_office_transfer_asset_date", "office_equipment_id", "transfer_date"),
        Index("idx_office_transfer_location", "transfer_location"),
        Index("idx_office_transfer_assigned_to", "assigned_to"),
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
    )

    # =====================
    # Asset Relationship
    # =====================
    office_equipment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("office_equipment_register.id"),
        nullable=False,
        index=True,
    )

    # =====================
    # Transfer Parties
    # =====================
    previous_owner = Column(String(255), nullable=True)
    assigned_to = Column(String(255), nullable=False)

    # =====================
    # Previous Location Details
    # =====================
    location = Column(String(255), nullable=True)
    room_or_floor = Column(String(255), nullable=True)

    # =====================
    # New Location Details
    # =====================
    transfer_department = Column(String(255), nullable=True)
    transfer_location = Column(String(255), nullable=False)
    transfer_room_or_floor = Column(String(255), nullable=True)
    transfer_reason = Column(Text, nullable=True)

    # =====================
    # Transfer Metadata
    # =====================
    transfer_date = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    created_by = Column(String(150), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # =====================
    # Relationships
    # =====================
    office_equipment = relationship("OfficeEquipment", backref="transfers")

    def __repr__(self):
        return (
            f"<OfficeEquipmentTransfer(id={self.id}, office_equipment_id={self.office_equipment_id}, "
            f"assigned_to='{self.assigned_to}', transfer_date='{self.transfer_date}')>"
        )
