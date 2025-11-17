# fastapi-server/app/models/plant_machinery.py

import uuid
from sqlalchemy import Column, String, Text, DateTime, Numeric
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.core.database import Base


class PlantMachinery(Base):
    __tablename__ = "plant_machinery"

    # Primary key as UUID
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True, unique=True)

    # Basic information
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
    delivery_installation_date = Column(DateTime, nullable=True)
    replacement_date = Column(DateTime, nullable=True)
    disposal_date = Column(DateTime, nullable=True)

    # Financial information
    purchase_amount = Column(Numeric(15, 2), nullable=False)
    depreciation_rate = Column(Numeric(5, 2), nullable=True)
    annual_depreciation = Column(Numeric(15, 2), nullable=True)
    accumulated_depreciation = Column(Numeric(15, 2), nullable=True)
    net_book_value = Column(Numeric(15, 2), nullable=True)
    disposal_value = Column(Numeric(15, 2), nullable=True)

    # Other details
    asset_condition = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    # Audit fields
    created_by = Column(String(150), nullable=True)
    updated_by = Column(String(150), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return (
            f"<PlantMachinery(id={self.id}, asset_description='{self.asset_description[:30]}', "
            f"serial_number='{self.serial_number}', tag_number='{self.tag_number}')>"
        )

