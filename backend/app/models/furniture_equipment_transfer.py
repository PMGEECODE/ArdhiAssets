import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class FurnitureEquipmentTransfer(Base):
    """
    Tracks transfer history for furniture & equipment assets,
    including movement, assignment, and metadata.
    """

    __tablename__ = "furniture_equipment_transfers"

    __table_args__ = (
        Index(
            "idx_furniture_transfer_asset_date",
            "furniture_equipment_id",
            "transfer_date"
        ),
        Index("idx_furniture_transfer_assigned_to", "assigned_to"),
        Index("idx_furniture_transfer_transfer_location", "transfer_location"),
        Index("idx_furniture_transfer_created_at", "created_at"),
    )

    # Primary Key
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        unique=True,
        nullable=False,
        index=True,
    )

    # Foreign Key Relationship
    furniture_equipment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("furniture_equipment.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Transfer Parties
    previous_owner = Column(String(255), nullable=True)
    assigned_to = Column(String(255), nullable=False, index=True)

    # Previous Location
    location = Column(String(255), nullable=True)
    room_or_floor = Column(String(255), nullable=True)

    # New Transfer Details
    transfer_department = Column(String(255), nullable=True)
    transfer_location = Column(String(255), nullable=False)
    transfer_room_or_floor = Column(String(255), nullable=True)
    transfer_reason = Column(Text, nullable=True)

    # Transfer Metadata
    transfer_date = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    created_by = Column(String(150), nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationship
    furniture_equipment = relationship(
        "FurnitureEquipment", backref="transfers", passive_deletes=True
    )

    def __repr__(self):
        return (
            f"<FurnitureEquipmentTransfer(id={self.id}, asset={self.furniture_equipment_id}, "
            f"assigned_to='{self.assigned_to}', transfer_date='{self.transfer_date}')>"
        )
