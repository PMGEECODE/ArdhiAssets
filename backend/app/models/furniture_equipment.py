import uuid
from sqlalchemy import (
    Column, String, Text, DateTime, Numeric, Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base


class FurnitureEquipment(Base):
    __tablename__ = "furniture_equipment"

    __table_args__ = (
        UniqueConstraint("serial_number", name="uq_furniture_serial"),
        UniqueConstraint("tag_number", name="uq_furniture_tag"),
        Index("idx_furniture_asset_description", "asset_description"),
        Index("idx_furniture_current_location", "current_location"),
        Index("idx_furniture_responsible_officer", "responsible_officer"),
        Index("idx_furniture_created_at", "created_at"),
        Index("idx_furniture_replacement_date", "replacement_date"),
    )

    # Primary key
    id = Column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4, 
        nullable=False, 
        unique=True, 
        index=True
    )

    # Basic info
    asset_description = Column(String(255), nullable=False)
    financed_by = Column(String(255), nullable=False)
    serial_number = Column(String(100), nullable=False)
    tag_number = Column(String(100), nullable=False)
    make_model = Column(String(255), nullable=False)
    pv_number = Column(String(100), nullable=True)

    # Locations
    original_location = Column(String(255), nullable=True)
    current_location = Column(String(255), nullable=True)
    responsible_officer = Column(String(255), nullable=True)

    # Dates
    delivery_installation_date = Column(DateTime(timezone=True), nullable=True)
    replacement_date = Column(DateTime(timezone=True), nullable=True)
    disposal_date = Column(DateTime(timezone=True), nullable=True)

    # Financials
    purchase_amount = Column(Numeric(15, 2), nullable=False)
    depreciation_rate = Column(Numeric(5, 2), nullable=True)
    annual_depreciation = Column(Numeric(15, 2), nullable=True)
    accumulated_depreciation = Column(Numeric(15, 2), nullable=True)
    net_book_value = Column(Numeric(15, 2), nullable=True)
    disposal_value = Column(Numeric(15, 2), nullable=True)

    # Other
    asset_condition = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    # Audit
    created_by = Column(String(150), nullable=True)
    updated_by = Column(String(150), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return (
            f"<FurnitureEquipment(id={self.id}, asset_description='{self.asset_description[:30]}', "
            f"serial_number='{self.serial_number}', tag_number='{self.tag_number}')>"
        )
