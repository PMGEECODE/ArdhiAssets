import uuid
from sqlalchemy import (
    Column, String, Text, DateTime, Numeric, Boolean, JSON, Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base


class LandAsset(Base):
    __tablename__ = "land_assets"

    __table_args__ = (
        UniqueConstraint("lr_certificate_no", name="uq_land_lr_certificate"),
        Index("idx_land_county", "county"),
        Index("idx_land_sub_county", "sub_county"),
        Index("idx_land_category", "category"),
        Index("idx_land_acquisition_date", "acquisition_date"),
        Index("idx_land_purpose_use", "purpose_use_of_land"),
        Index("idx_land_created_at", "created_at"),
    )

    # Primary key as UUIDv4
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        unique=True,
        nullable=False,
        index=True
    )

    # Basic information
    description_of_land = Column(Text, nullable=False)
    mode_of_acquisition = Column(String(100), nullable=True)
    category = Column(String(50), nullable=True)

    # Location
    county = Column(String(100), nullable=True)
    sub_county = Column(String(100), nullable=True)
    division = Column(String(100), nullable=True)
    location = Column(String(200), nullable=True)
    sub_location = Column(String(200), nullable=True)
    nearest_town_location = Column(String(200), nullable=True)
    gps_coordinates = Column(String(100), nullable=True)  # optional raw GPS string
    polygon = Column(JSON, nullable=True)  # geojson polygon shape

    # Legal documentation
    lr_certificate_no = Column(String(100), unique=True, index=True, nullable=True)
    document_of_ownership = Column(String(200), nullable=True)
    proprietorship_details = Column(Text, nullable=True)

    # Physical
    size_ha = Column(Numeric(10, 4), nullable=True)
    land_tenure = Column(String(50), nullable=True)
    surveyed = Column(String(20), nullable=True)

    # Dates
    acquisition_date = Column(DateTime(timezone=True), nullable=True)
    registration_date = Column(DateTime(timezone=True), nullable=True)
    disposal_date = Column(DateTime(timezone=True), nullable=True)
    change_of_use_date = Column(DateTime(timezone=True), nullable=True)

    # Legal status
    disputed = Column(String(20), nullable=True)
    encumbrances = Column(Text, nullable=True)
    planned_unplanned = Column(String(50), nullable=True)

    # Purpose
    purpose_use_of_land = Column(Text, nullable=True)

    # Financials
    acquisition_amount = Column(Numeric(15, 2), nullable=True)
    fair_value = Column(Numeric(15, 2), nullable=True)
    disposal_value = Column(Numeric(15, 2), nullable=True)
    annual_rental_income = Column(Numeric(15, 2), nullable=True)

    # Extra
    remarks = Column(Text, nullable=True)

    # Audit
    created_by = Column(String(100), nullable=True)
    updated_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return (
            f"<LandAsset(id={self.id}, description='{self.description_of_land[:30]}', "
            f"lr_no='{self.lr_certificate_no}')>"
        )
