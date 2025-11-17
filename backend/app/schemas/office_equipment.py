"""
Office Equipment Pydantic schemas
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Union
from datetime import datetime
from uuid import UUID

# ============================================================
# Base Schema
# ============================================================
class OfficeEquipmentBase(BaseModel):
    """Base office equipment schema"""

    # Basic information
    asset_description: str = Field(..., min_length=1, max_length=255)
    financed_by: str = Field(..., min_length=1, max_length=255)
    serial_number: str = Field(..., min_length=1, max_length=100)
    tag_number: str = Field(..., min_length=1, max_length=100)
    make_model: str = Field(..., min_length=1, max_length=255)
    pv_number: Optional[str] = None

    # Location tracking
    original_location: Optional[str] = None
    current_location: Optional[str] = None
    responsible_officer: Optional[str] = None

    # Dates (renamed to match frontend + DB)
    date_of_delivery: Optional[Union[str, datetime]] = None
    replacement_date: Optional[Union[str, datetime]] = None
    date_of_disposal: Optional[Union[str, datetime]] = None

    # Financial information
    purchase_amount: float = Field(..., ge=0)
    depreciation_rate: Optional[float] = Field(None, ge=0, le=100)
    annual_depreciation: Optional[float] = Field(None, ge=0)
    accumulated_depreciation: Optional[float] = Field(None, ge=0)
    net_book_value: Optional[float] = None
    disposal_value: Optional[float] = Field(None, ge=0)

    # Other details
    asset_condition: Optional[str] = None
    notes: Optional[str] = None

    # Audit fields
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    # Date parsing validator
    @field_validator("date_of_delivery", "replacement_date", "date_of_disposal", mode="before")
    @classmethod
    def parse_dates(cls, v):
        """Convert date strings (ISO or date-only) into datetime objects"""
        if v is None or v == "":
            return None
        if isinstance(v, str):
            try:
                if "T" in v:  # ISO datetime from frontend
                    return datetime.fromisoformat(v.replace("Z", "+00:00"))
                return datetime.fromisoformat(v)  # date-only
            except ValueError:
                return None
        return v


# ============================================================
# Create Schema
# ============================================================
class OfficeEquipmentCreate(OfficeEquipmentBase):
    """Schema for creating office equipment"""
    pass


# ============================================================
# Update Schema
# ============================================================
class OfficeEquipmentUpdate(BaseModel):
    """Schema for updating office equipment"""

    # Basic information
    asset_description: Optional[str] = Field(None, min_length=1, max_length=255)
    financed_by: Optional[str] = None
    serial_number: Optional[str] = None
    tag_number: Optional[str] = None
    make_model: Optional[str] = None
    pv_number: Optional[str] = None

    # Location tracking
    original_location: Optional[str] = None
    current_location: Optional[str] = None
    responsible_officer: Optional[str] = None

    # Dates (renamed to match frontend + DB)
    date_of_delivery: Optional[Union[str, datetime]] = None
    replacement_date: Optional[Union[str, datetime]] = None
    date_of_disposal: Optional[Union[str, datetime]] = None

    # Financial information
    purchase_amount: Optional[float] = Field(None, ge=0)
    depreciation_rate: Optional[float] = Field(None, ge=0, le=100)
    annual_depreciation: Optional[float] = Field(None, ge=0)
    accumulated_depreciation: Optional[float] = Field(None, ge=0)
    net_book_value: Optional[float] = None
    disposal_value: Optional[float] = Field(None, ge=0)

    # Other details
    asset_condition: Optional[str] = None
    notes: Optional[str] = None

    # Audit fields
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    # Date parsing validator
    @field_validator("date_of_delivery", "replacement_date", "date_of_disposal", mode="before")
    @classmethod
    def parse_dates(cls, v):
        """Convert date strings (ISO or date-only) into datetime objects"""
        if v is None or v == "":
            return None
        if isinstance(v, str):
            try:
                if "T" in v:
                    return datetime.fromisoformat(v.replace("Z", "+00:00"))
                return datetime.fromisoformat(v)
            except ValueError:
                return None
        return v


# ============================================================
# Response Schema
# ============================================================
class OfficeEquipmentResponse(OfficeEquipmentBase):
    """Response schema for office equipment"""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(timespec="milliseconds") if v else None
        }
