"""
Vehicle Pydantic Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
import json


# ============================================================
# Base Schema
# ============================================================
class VehicleBase(BaseModel):
    """Base vehicle schema"""

    # Identification
    registration_number: str = Field(..., min_length=1, max_length=50)
    financed_by: Optional[str] = None
    engine_number: Optional[str] = None
    chassis_number: Optional[str] = None
    tag_number: Optional[str] = None
    make_model: Optional[str] = None
    color: Optional[str] = None  # ✅ Added color field
    year_of_purchase: Optional[str] = None
    pv_number: Optional[str] = None
    original_location: Optional[str] = None
    current_location: Optional[str] = None
    replacement_date: Optional[datetime] = None

    # Financial info
    amount: Optional[Decimal] = Field(None, ge=0)
    depreciation_rate: Optional[Decimal] = Field(None, ge=0)
    annual_depreciation: Optional[Decimal] = Field(None, ge=0)
    accumulated_depreciation: Optional[Decimal] = Field(None, ge=0)
    net_book_value: Optional[Decimal] = Field(None, ge=0)

    # Disposal info
    date_of_disposal: Optional[datetime] = None
    disposal_value: Optional[Decimal] = Field(None, ge=0)

    # Other info
    responsible_officer: Optional[str] = None
    asset_condition: Optional[str] = None
    has_logbook: Optional[str] = "N"
    notes: Optional[str] = None


# ============================================================
# Create Schema
# ============================================================
class VehicleCreate(VehicleBase):
    """Vehicle creation schema"""
    image_urls: Optional[List[str]] = None


# ============================================================
# Update Schema
# ============================================================
class VehicleUpdate(BaseModel):
    """Vehicle update schema"""

    registration_number: Optional[str] = Field(None, min_length=1, max_length=50)
    financed_by: Optional[str] = None
    engine_number: Optional[str] = None
    chassis_number: Optional[str] = None
    tag_number: Optional[str] = None
    make_model: Optional[str] = None
    color: Optional[str] = None  # ✅ Added color field
    year_of_purchase: Optional[str] = None
    pv_number: Optional[str] = None
    original_location: Optional[str] = None
    current_location: Optional[str] = None
    replacement_date: Optional[datetime] = None

    # Financial info
    amount: Optional[Decimal] = Field(None, ge=0)
    depreciation_rate: Optional[Decimal] = Field(None, ge=0)
    annual_depreciation: Optional[Decimal] = Field(None, ge=0)
    accumulated_depreciation: Optional[Decimal] = Field(None, ge=0)
    net_book_value: Optional[Decimal] = Field(None, ge=0)

    # Disposal info
    date_of_disposal: Optional[datetime] = None
    disposal_value: Optional[Decimal] = Field(None, ge=0)

    # Other info
    responsible_officer: Optional[str] = None
    asset_condition: Optional[str] = None
    has_logbook: Optional[str] = None
    notes: Optional[str] = None
    image_urls: Optional[List[str]] = None


# ============================================================
# Response Schema
# ============================================================
class VehicleResponse(VehicleBase):
    """Vehicle response schema"""

    id: str
    color: Optional[str] = None  # ✅ Included for consistency
    created_at: datetime
    updated_at: datetime
    image_urls: Optional[List[str]] = None

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(timespec="milliseconds") if v else None,
            Decimal: lambda v: float(v) if v is not None else None,
        }

    @classmethod
    def from_orm(cls, obj):
        """Custom from_orm to handle JSON parsing of image_urls"""
        data = obj.__dict__.copy()

        # Parse image_urls from JSON string to list
        if hasattr(obj, "image_urls") and obj.image_urls:
            try:
                if isinstance(obj.image_urls, str):
                    data["image_urls"] = json.loads(obj.image_urls)
                else:
                    data["image_urls"] = obj.image_urls
            except (json.JSONDecodeError, TypeError):
                data["image_urls"] = []
        else:
            data["image_urls"] = []

        return cls(**data)
