# fastapi-server/app/schemas/furniture_equipment.py

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal
from uuid import UUID


# ============================================================
# Base Schema
# ============================================================
class FurnitureEquipmentBase(BaseModel):
    """
    Base schema for Furniture Equipment.
    Defines the common fields shared across create, response,
    and database schemas.
    """

    # Basic information
    asset_description: str = Field(..., description="Description of the asset")
    financed_by: str = Field(..., description="Financed by")
    serial_number: str = Field(..., description="Serial number of the asset")
    tag_number: str = Field(..., description="Tag number of the asset")
    make_model: str = Field(..., description="Make and model of the asset")
    pv_number: Optional[str] = Field(None, description="PV number")

    # Locations
    original_location: Optional[str] = Field(None, description="Original location of the asset")
    current_location: Optional[str] = Field(None, description="Current location of the asset")
    responsible_officer: Optional[str] = Field(None, description="Responsible officer for the asset")

    # Dates
    delivery_installation_date: Optional[datetime] = Field(None, description="Delivery/installation date")
    replacement_date: Optional[datetime] = Field(None, description="Replacement date")
    disposal_date: Optional[datetime] = Field(None, description="Disposal date")

    # Financial information
    purchase_amount: Decimal = Field(..., description="Purchase amount of the asset")
    depreciation_rate: Optional[Decimal] = Field(None, description="Depreciation rate (%)")
    annual_depreciation: Optional[Decimal] = Field(None, description="Annual depreciation value")
    accumulated_depreciation: Optional[Decimal] = Field(None, description="Accumulated depreciation")
    net_book_value: Optional[Decimal] = Field(None, description="Net book value")
    disposal_value: Optional[Decimal] = Field(None, description="Disposal value")

    # Other details
    asset_condition: Optional[str] = Field(None, description="Condition of the asset (e.g., Good, Poor)")
    notes: Optional[str] = Field(None, description="Additional notes or remarks")


# ============================================================
# Create Schema
# ============================================================
class FurnitureEquipmentCreate(FurnitureEquipmentBase):
    """Schema for creating a new Furniture Equipment record"""
    
    delivery_installation_date: Optional[datetime] = Field(None, description="Delivery/installation date")
    replacement_date: Optional[datetime] = Field(None, description="Replacement date")
    disposal_date: Optional[datetime] = Field(None, description="Disposal date")


# ============================================================
# Update Schema
# ============================================================
class FurnitureEquipmentUpdate(BaseModel):
    """
    Schema for updating a Furniture Equipment record.
    All fields optional to allow partial updates.
    """

    # Basic information
    asset_description: Optional[str] = None
    financed_by: Optional[str] = None
    serial_number: Optional[str] = None
    tag_number: Optional[str] = None
    make_model: Optional[str] = None
    pv_number: Optional[str] = None

    # Locations
    original_location: Optional[str] = None
    current_location: Optional[str] = None
    responsible_officer: Optional[str] = None

    # Dates
    delivery_installation_date: Optional[datetime] = None
    replacement_date: Optional[datetime] = None
    disposal_date: Optional[datetime] = None

    # Financial information
    purchase_amount: Optional[Decimal] = None
    depreciation_rate: Optional[Decimal] = None
    annual_depreciation: Optional[Decimal] = None
    accumulated_depreciation: Optional[Decimal] = None
    net_book_value: Optional[Decimal] = None
    disposal_value: Optional[Decimal] = None

    # Other details
    asset_condition: Optional[str] = None
    notes: Optional[str] = None


# ============================================================
# Database Base Schema
# ============================================================
class FurnitureEquipmentInDBBase(FurnitureEquipmentBase):
    """
    Base schema for database models including metadata fields.
    Extends the base schema with identifiers and audit information.
    """

    id: UUID
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = Field(None, description="User who created the record")
    updated_by: Optional[str] = Field(None, description="User who last updated the record")

    class Config:
        from_attributes = True


# ============================================================
# Response Schema
# ============================================================
class FurnitureEquipment(FurnitureEquipmentInDBBase):
    """Response schema returned by the API"""
    pass


# ============================================================
# Internal DB Schema
# ============================================================
class FurnitureEquipmentInDB(FurnitureEquipmentInDBBase):
    """Internal schema used for database operations"""
    pass
# ============================================================
