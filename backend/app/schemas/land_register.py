"""
Land Register Pydantic schemas
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Dict
from datetime import datetime
from decimal import Decimal

# ============================================================
# Helper: Polygon Sanitizer
# ============================================================
def sanitize_polygon(v: Optional[Dict[str, str]]):
    """Clean polygon by removing empty keys/values"""
    if not v:
        return None
    cleaned = {k: v.strip() for k, v in v.items() if v and v.strip()}
    return cleaned or None

# ============================================================
# Base Schema
# ============================================================
class LandRegisterBase(BaseModel):
    """Base land register schema"""
    description_of_land: str = Field(..., min_length=1, max_length=255)
    mode_of_acquisition: Optional[str] = None
    category: Optional[str] = None

    # Location details
    county: Optional[str] = None
    sub_county: Optional[str] = None
    division: Optional[str] = None
    location: Optional[str] = None
    sub_location: Optional[str] = None
    nearest_town_location: Optional[str] = None

    # Geographic and identification
    gps_coordinates: Optional[str] = None
    polygon: Optional[Dict[str, str]] = Field(
        None, description="Survey points (A,B,C...)"
    )
    lr_certificate_no: Optional[str] = None

    # Ownership documentation
    document_of_ownership_held: Optional[str] = None
    proprietorship_ownership_details: Optional[str] = None

    # Land specifications
    size_ha: Optional[Decimal] = Field(None, ge=0)
    land_tenure: Optional[str] = None

    # Important dates
    acquisition_date: Optional[datetime] = None
    registration_date: Optional[datetime] = None
    disposal_date: Optional[datetime] = None

    # Status and conditions
    disputed_undisputed: Optional[str] = None
    encumbrances: Optional[str] = None
    planned_unplanned: Optional[str] = None
    purpose_use_of_land: Optional[str] = None
    surveyed_not_surveyed: Optional[str] = None

    # Financial information
    acquisition_amount: Optional[Decimal] = Field(None, ge=0)
    fair_value: Optional[Decimal] = Field(None, ge=0)
    disposal_value: Optional[Decimal] = Field(None, ge=0)
    annual_rental_income: Optional[Decimal] = Field(None, ge=0)

    # Additional info
    remarks: Optional[str] = None

    @validator("polygon", pre=True)
    def clean_polygon(cls, v):
        return sanitize_polygon(v)

# ============================================================
# Create Schema
# ============================================================
class LandRegisterCreate(LandRegisterBase):
    """Land register creation schema"""
    pass


# ============================================================
# Update Schema
# ============================================================
class LandRegisterUpdate(BaseModel):
    """Land register update schema."""
    description_of_land: Optional[str] = Field(None, min_length=1, max_length=255)
    mode_of_acquisition: Optional[str] = None
    category: Optional[str] = None

    # Location details
    county: Optional[str] = None
    sub_county: Optional[str] = None
    division: Optional[str] = None
    location: Optional[str] = None
    sub_location: Optional[str] = None
    nearest_town_location: Optional[str] = None

    # Geographic and identification
    gps_coordinates: Optional[str] = None
    polygon: Optional[Dict[str, str]] = None
    lr_certificate_no: Optional[str] = None

    # Ownership documentation
    document_of_ownership_held: Optional[str] = None
    proprietorship_ownership_details: Optional[str] = None

    # Land specifications
    size_ha: Optional[Decimal] = Field(None, ge=0)
    land_tenure: Optional[str] = None

    # Important dates
    acquisition_date: Optional[datetime] = None
    registration_date: Optional[datetime] = None
    disposal_date: Optional[datetime] = None

    # Status and conditions
    disputed_undisputed: Optional[str] = None
    encumbrances: Optional[str] = None
    planned_unplanned: Optional[str] = None
    purpose_use_of_land: Optional[str] = None
    surveyed_not_surveyed: Optional[str] = None

    # Financial information
    acquisition_amount: Optional[Decimal] = Field(None, ge=0)
    fair_value: Optional[Decimal] = Field(None, ge=0)
    disposal_value: Optional[Decimal] = Field(None, ge=0)
    annual_rental_income: Optional[Decimal] = Field(None, ge=0)

    # Additional info
    remarks: Optional[str] = None

    @validator("polygon", pre=True)
    def clean_polygon(cls, v):
        return sanitize_polygon(v)

# ============================================================
# Response Schema
# ============================================================
class LandRegisterResponse(LandRegisterBase):
    """Land register response schema"""
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(timespec="milliseconds") if v else None,
            Decimal: lambda v: float(v) if v else None,
        }
# ============================================================