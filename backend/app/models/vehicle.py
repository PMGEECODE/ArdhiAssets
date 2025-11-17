"""
Motor Vehicle model for motor vehicles register
"""

import uuid
from sqlalchemy import Column, String, DateTime, Numeric, Index, JSON
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Vehicle(Base):
    """Vehicle model for motor vehicles register management"""

    __tablename__ = "motor_vehicles_register"

    # Primary identification (✅ UUIDv4)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    registration_number = Column(String, nullable=False, unique=True)

    # Vehicle identification
    chassis_number = Column(String, nullable=True)
    engine_number = Column(String, nullable=True)
    tag_number = Column(String, nullable=True)

    # Vehicle information
    make_model = Column(String, nullable=True)
    color = Column(String, nullable=True)
    asset_condition = Column(String, nullable=True)

    # Acquisition and ownership
    year_of_purchase = Column(String, nullable=True)
    pv_number = Column(String, nullable=True)
    financed_by = Column(String, nullable=True)

    # Financials / Depreciation
    amount = Column(Numeric(15, 2), nullable=True)
    depreciation_rate = Column(Numeric(5, 2), nullable=True)
    annual_depreciation = Column(Numeric(15, 2), nullable=True)
    accumulated_depreciation = Column(Numeric(15, 2), nullable=True)
    net_book_value = Column(Numeric(15, 2), nullable=True)
    date_of_disposal = Column(DateTime, nullable=True)
    disposal_value = Column(Numeric(15, 2), nullable=True)
    replacement_date = Column(DateTime, nullable=True)

    # Log book and notes
    has_logbook = Column(String, default="N")
    responsible_officer = Column(String, nullable=True)
    original_location = Column(String, nullable=True)
    current_location = Column(String, nullable=True)
    notes = Column(String, nullable=True)

    # Images
    image_urls = Column(JSON, nullable=True)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


# ✅ Useful indexes
Index("idx_vehicle_registration_number", Vehicle.registration_number)
Index("idx_vehicle_make_model", Vehicle.make_model)
Index("idx_vehicle_chassis_number", Vehicle.chassis_number)
Index("idx_vehicle_engine_number", Vehicle.engine_number)
Index("idx_vehicle_year_of_purchase", Vehicle.year_of_purchase)
Index("idx_vehicle_color", Vehicle.color)
Index("idx_vehicle_asset_condition", Vehicle.asset_condition)
Index("idx_vehicle_current_location", Vehicle.current_location)
Index("idx_vehicle_date_of_disposal", Vehicle.date_of_disposal)
Index("idx_vehicle_replacement_date", Vehicle.replacement_date)

# ✅ Composite Indexes
Index("idx_vehicle_location_condition", Vehicle.current_location, Vehicle.asset_condition)
Index("idx_vehicle_purchase_value", Vehicle.year_of_purchase, Vehicle.amount)
Index("idx_vehicle_disposal_status", Vehicle.date_of_disposal, Vehicle.net_book_value)

# ✅ Functional index for case-insensitive search
Index("idx_vehicle_reg_number_lower", func.lower(Vehicle.registration_number), postgresql_using="btree")
Index("idx_vehicle_make_model_lower", func.lower(Vehicle.make_model), postgresql_using="btree")