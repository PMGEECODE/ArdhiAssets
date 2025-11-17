"""
Building Pydantic schemas
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
import json


# ============================================================
# Base Schema
# ============================================================
class BuildingBase(BaseModel):
    """
    Base schema for building data.
    Defines common attributes used across create, update, and response models.
    """

    # Identification and ownership
    description_name_of_building: str = Field(..., min_length=1, max_length=255, description="Name/description of the building")
    building_ownership: Optional[str] = Field(None, description="Ownership type (e.g., Government, Private, Lease)")
    category: Optional[str] = Field(None, description="Category of the building (e.g., Office, Residential, Institutional)")
    building_no: Optional[str] = Field(None, description="Building number/code")
    institution_no: Optional[str] = Field(None, description="Institution number if applicable")

    # Location fields
    nearest_town_shopping_centre: Optional[str] = Field(None, description="Nearest town or shopping centre")
    street: Optional[str] = Field(None, description="Street address")
    county: Optional[str] = Field(None, description="County where the building is located")
    sub_county: Optional[str] = Field(None, description="Sub-county")
    division: Optional[str] = Field(None, description="Administrative division")
    location: Optional[str] = Field(None, description="Location")
    sub_location: Optional[str] = Field(None, description="Sub-location")

    # Land and ownership details
    lr_no: Optional[str] = Field(None, description="Land Reference (L.R) number")
    size_of_land_ha: Optional[Decimal] = Field(None, ge=0, description="Size of the land in hectares")
    ownership_status: Optional[str] = Field(None, description="Ownership status (e.g., Freehold, Leasehold)")
    source_of_funds: Optional[str] = Field(None, description="Source of funds used for construction/acquisition")
    mode_of_acquisition: Optional[str] = Field(None, description="Mode of acquisition (e.g., Purchase, Transfer, Donation)")
    date_of_purchase_or_commissioning: Optional[datetime] = Field(None, description="Date of purchase or commissioning")

    # Building specifications
    type_of_building: Optional[str] = Field(None, description="Type of building (e.g., Bungalow, High-rise, Warehouse)")
    designated_use: Optional[str] = Field(None, description="Designated use (e.g., Office, Classroom, Residential)")
    estimated_useful_life: Optional[int] = Field(None, ge=0, description="Estimated useful life of the building in years")
    no_of_floors: Optional[int] = Field(None, ge=0, description="Number of floors")
    plinth_area: Optional[Decimal] = Field(None, ge=0, description="Plinth area in square meters")

    # Financial information
    cost_of_construction_or_valuation: Optional[Decimal] = Field(None, ge=0, description="Cost of construction or valuation amount")
    annual_depreciation: Optional[Decimal] = Field(None, ge=0, description="Annual depreciation amount")
    accumulated_depreciation_to_date: Optional[Decimal] = Field(None, ge=0, description="Total accumulated depreciation")
    net_book_value: Optional[Decimal] = Field(None, description="Net book value of the building")
    annual_rental_income: Optional[Decimal] = Field(None, ge=0, description="Annual rental income if leased")

    # Additional info
    remarks: Optional[str] = Field(None, description="Any additional remarks or notes")


# ============================================================
# Create Schema
# ============================================================
class BuildingCreate(BuildingBase):
    """
    Schema for creating a new building.
    Inherits all fields from BuildingBase.
    """
    pass


# ============================================================
# Update Schema
# ============================================================
class BuildingUpdate(BaseModel):
    """
    Schema for updating building details.
    All fields are optional to allow partial updates.
    """

    # Identification and ownership
    description_name_of_building: Optional[str] = Field(None, min_length=1, max_length=255, description="Name/description of the building")
    building_ownership: Optional[str] = Field(None, description="Ownership type")
    category: Optional[str] = Field(None, description="Building category")
    building_no: Optional[str] = Field(None, description="Building number/code")
    institution_no: Optional[str] = Field(None, description="Institution number if applicable")

    # Location fields
    nearest_town_shopping_centre: Optional[str] = Field(None, description="Nearest town/shopping centre")
    street: Optional[str] = Field(None, description="Street address")
    county: Optional[str] = Field(None, description="County")
    sub_county: Optional[str] = Field(None, description="Sub-county")
    division: Optional[str] = Field(None, description="Administrative division")
    location: Optional[str] = Field(None, description="Location")
    sub_location: Optional[str] = Field(None, description="Sub-location")

    # Land and ownership details
    lr_no: Optional[str] = Field(None, description="Land Reference (L.R) number")
    size_of_land_ha: Optional[Decimal] = Field(None, ge=0, description="Size of land in hectares")
    ownership_status: Optional[str] = Field(None, description="Ownership status")
    source_of_funds: Optional[str] = Field(None, description="Source of funds")
    mode_of_acquisition: Optional[str] = Field(None, description="Mode of acquisition")
    date_of_purchase_or_commissioning: Optional[datetime] = Field(None, description="Date of purchase/commissioning")

    # Building specifications
    type_of_building: Optional[str] = Field(None, description="Type of building")
    designated_use: Optional[str] = Field(None, description="Designated use")
    estimated_useful_life: Optional[int] = Field(None, ge=0, description="Estimated useful life (years)")
    no_of_floors: Optional[int] = Field(None, ge=0, description="Number of floors")
    plinth_area: Optional[Decimal] = Field(None, ge=0, description="Plinth area")

    # Financial information
    cost_of_construction_or_valuation: Optional[Decimal] = Field(None, ge=0, description="Cost of construction/valuation")
    annual_depreciation: Optional[Decimal] = Field(None, ge=0, description="Annual depreciation")
    accumulated_depreciation_to_date: Optional[Decimal] = Field(None, ge=0, description="Accumulated depreciation")
    net_book_value: Optional[Decimal] = Field(None, description="Net book value")
    annual_rental_income: Optional[Decimal] = Field(None, ge=0, description="Annual rental income")

    # Additional info
    remarks: Optional[str] = Field(None, description="Additional remarks")


# ============================================================
# Response Schema
# ============================================================
class BuildingResponse(BuildingBase):
    """
    Schema returned in API responses for building details.
    Extends BuildingBase with identifiers and timestamps.
    """

    id: str = Field(..., description="Unique identifier of the building")
    created_at: datetime = Field(..., description="Timestamp when the record was created")
    updated_at: datetime = Field(..., description="Timestamp when the record was last updated")
    support_files: Optional[List[str]] = Field(None, description="List of support file URLs")

    class Config:
        from_attributes = True  # Enables ORM-to-Pydantic conversion
        json_encoders = {
            datetime: lambda v: v.isoformat(timespec="milliseconds") if v else None,
            Decimal: lambda v: float(v) if v else None
        }

    @field_validator("support_files", mode="before")
    @classmethod
    def parse_support_files(cls, v):
        """Parse support_files from JSON string to list"""
        if v is None:
            return []
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                return parsed if isinstance(parsed, list) else []
            except (json.JSONDecodeError, TypeError):
                return []
        return []
# ============================================================