# fastapi-server/app/schemas/land_asset.py

from pydantic import BaseModel, Field, validator
from typing import Optional, Dict
from datetime import datetime
from decimal import Decimal
from uuid import UUID


# ============================================================
# Helper functions
# ============================================================

def sanitize_polygon(v: Optional[Dict[str, str]]):
    """Clean empty polygon values safely."""
    if not v:
        return None
    cleaned = {k: v.strip() for k, v in v.items() if v and isinstance(v, str) and v.strip()}
    return cleaned or None


# ============================================================
# Base Schema
# ============================================================

class LandAssetBase(BaseModel):
    """Shared schema fields for land asset."""

    # Basic details
    description_of_land: str = Field(..., description="Description of the land")
    mode_of_acquisition: Optional[str] = None
    category: Optional[str] = None

    # Location
    county: Optional[str] = None
    sub_county: Optional[str] = None
    division: Optional[str] = None
    location: Optional[str] = None
    sub_location: Optional[str] = None
    nearest_town_location: Optional[str] = None
    gps_coordinates: Optional[str] = None

    # Polygon Support
    polygon: Optional[Dict[str, str]] = Field(
        None, description="Survey polygon points e.g. {'A': '1.234,-2.456'}"
    )

    # Legal details
    lr_certificate_no: Optional[str] = None
    document_of_ownership: Optional[str] = None
    proprietorship_details: Optional[str] = None

    # Physical info
    size_ha: Optional[Decimal] = Field(None, ge=0)
    land_tenure: Optional[str] = None
    surveyed: Optional[str] = None

    # Dates
    acquisition_date: Optional[datetime] = None
    registration_date: Optional[datetime] = None
    disposal_date: Optional[datetime] = None
    change_of_use_date: Optional[datetime] = None

    # Legal status
    disputed: Optional[str] = None
    encumbrances: Optional[str] = None
    planned_unplanned: Optional[str] = None

    # Use + Finance
    purpose_use_of_land: Optional[str] = None
    acquisition_amount: Optional[Decimal] = Field(None, ge=0)
    fair_value: Optional[Decimal] = Field(None, ge=0)
    disposal_value: Optional[Decimal] = Field(None, ge=0)
    annual_rental_income: Optional[Decimal] = Field(None, ge=0)

    # Other
    remarks: Optional[str] = None

    # ✅ Clean polygon safely (no crashes)
    @validator("polygon", pre=True)
    def clean_polygon(cls, v):
        return sanitize_polygon(v)


# ============================================================
# Create Schema
# ============================================================

class LandAssetCreate(LandAssetBase):
    """Schema for creating land asset."""
    pass


# ============================================================
# Update Schema
# ============================================================

class LandAssetUpdate(BaseModel):
    """Schema for updating asset – all fields optional."""

    description_of_land: Optional[str] = None
    mode_of_acquisition: Optional[str] = None
    category: Optional[str] = None
    county: Optional[str] = None
    sub_county: Optional[str] = None
    division: Optional[str] = None
    location: Optional[str] = None
    sub_location: Optional[str] = None
    nearest_town_location: Optional[str] = None
    gps_coordinates: Optional[str] = None
    polygon: Optional[Dict[str, str]] = None
    lr_certificate_no: Optional[str] = None
    document_of_ownership: Optional[str] = None
    proprietorship_details: Optional[str] = None
    size_ha: Optional[Decimal] = None
    land_tenure: Optional[str] = None
    surveyed: Optional[str] = None
    acquisition_date: Optional[datetime] = None
    registration_date: Optional[datetime] = None
    disposal_date: Optional[datetime] = None
    change_of_use_date: Optional[datetime] = None
    disputed: Optional[str] = None
    encumbrances: Optional[str] = None
    planned_unplanned: Optional[str] = None
    purpose_use_of_land: Optional[str] = None
    acquisition_amount: Optional[Decimal] = None
    fair_value: Optional[Decimal] = None
    disposal_value: Optional[Decimal] = None
    annual_rental_income: Optional[Decimal] = None
    remarks: Optional[str] = None

    @validator("polygon", pre=True)
    def clean_polygon(cls, v):
        return sanitize_polygon(v)


# ============================================================
# Database Schema
# ============================================================

class LandAssetInDBBase(LandAssetBase):
    id: UUID  # Changed from int to UUID to match database model
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(timespec="milliseconds") if v else None,
            Decimal: lambda v: float(v) if v else None,
        }


# ============================================================
# Response Schema
# ============================================================

class LandAsset(LandAssetInDBBase):
    """Response schema"""
    pass


class LandAssetInDB(LandAssetInDBBase):
    """Internal DB schema"""
    pass


# ============================================================
