# fastapi-server/app/models/ict_asset.py

import uuid
from sqlalchemy import Column, String, Text, DateTime, Numeric, Index
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.core.database import Base


class IctAsset(Base):
    """
    SQLAlchemy model representing ICT Assets.
    Tracks asset details, specifications, financials, locations,
    responsible officers, transfers, and lifecycle events.
    """

    __tablename__ = "ict_assets"

    # =====================
    # Table Indexes
    # =====================
    __table_args__ = (
        Index(
            "idx_location_responsible",
            "current_location",
            "responsible_officer",
        ),
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
    )  # Unique identifier for each ICT asset

    # =====================
    # Basic Information
    # =====================
    asset_description = Column(String(255), nullable=False)  # Description of the asset
    financed_by = Column(String(255), nullable=False)  # Financing source
    serial_number = Column(
        String(100), nullable=False, unique=True, index=True
    )  # Manufacturer serial number (unique + indexed)
    tag_number = Column(
        String(100), nullable=False, unique=True, index=True
    )  # Internal asset tag/label number (unique + indexed)
    make_model = Column(String(255), nullable=False)  # Brand and model
    pv_number = Column(String(100), nullable=True)  # Payment voucher number (if available)

    # =====================
    # ICT-Specific Details
    # =====================
    asset_type = Column(String(100), nullable=True)  # Asset category/type
    specifications = Column(Text, nullable=True)  # Technical specifications
    software_licenses = Column(Text, nullable=True)  # Associated software licenses
    warranty_expiry = Column(DateTime, nullable=True)  # Warranty expiration date (optional)
    ip_address = Column(String(45), nullable=True)  # IPv4/IPv6 address
    mac_address = Column(String(17), nullable=True)  # MAC address
    operating_system = Column(String(100), nullable=True)  # Operating system installed

    # =====================
    # Location & Assignment
    # =====================
    original_location = Column(String(255), nullable=True)  # Initial deployment location
    current_location = Column(String(255), nullable=True, index=True)  # Current location of asset (indexed)
    responsible_officer = Column(
        String(255), nullable=True, index=True
    )  # Officer responsible for asset (indexed)

    # =====================
    # Lifecycle Dates (optional)
    # =====================
    delivery_installation_date = Column(DateTime, nullable=True)  # Delivery/installation date
    replacement_date = Column(DateTime, nullable=True)  # Date of replacement (if replaced)
    disposal_date = Column(DateTime, nullable=True)  # Date asset was disposed

    # =====================
    # Financial Information
    # =====================
    purchase_amount = Column(Numeric(15, 2), nullable=False)  # Purchase cost
    depreciation_rate = Column(Numeric(5, 2), nullable=True)  # Depreciation rate (%)
    annual_depreciation = Column(Numeric(15, 2), nullable=True)  # Annual depreciation value
    accumulated_depreciation = Column(Numeric(15, 2), nullable=True)  # Total depreciation to date
    net_book_value = Column(Numeric(15, 2), nullable=True)  # Current asset value
    disposal_value = Column(Numeric(15, 2), nullable=True)  # Value realized at disposal

    # =====================
    # Condition & Notes
    # =====================
    asset_condition = Column(String(50), nullable=True)  # Asset condition (e.g., New, Good, Faulty)
    notes = Column(Text, nullable=True)  # Additional notes or remarks

    # =====================
    # Transfer Information
    # =====================
    previous_owner = Column(String(255), nullable=True)  # Last officer responsible
    transfer_department = Column(String(255), nullable=True)  # Department to which asset was transferred
    transfer_location = Column(String(255), nullable=True)  # Location of transfer
    transfer_room_or_floor = Column(String(255), nullable=True)  # Specific room or floor
    transfer_reason = Column(Text, nullable=True)  # Reason for transfer

    # =====================
    # Audit Fields
    # =====================
    created_by = Column(String(150), nullable=True)  # User who created the record
    updated_by = Column(String(150), nullable=True)  # User who last updated the record
    created_at = Column(
        DateTime, default=datetime.utcnow, nullable=False
    )  # Record creation timestamp
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )  # Record last update timestamp

    def __repr__(self):
        return (
            f"<IctAsset(id={self.id}, asset_description='{self.asset_description[:30]}', "
            f"serial_number='{self.serial_number}', tag_number='{self.tag_number}')>"
        )
