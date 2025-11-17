from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
from decimal import Decimal
from uuid import UUID


# ============================================================
# Base Schema
# ============================================================
class IctAssetBase(BaseModel):
    """
    Base schema for ICT Asset.
    Defines common fields shared across create, update,
    response, and database schemas.
    """

    # Basic information
    asset_description: str = Field(..., description="Description of the ICT asset")
    financed_by: str = Field(..., description="Financed by")
    serial_number: str = Field(..., description="Serial number of the asset")
    tag_number: str = Field(..., description="Tag number of the asset")
    make_model: str = Field(..., description="Make and model of the asset")
    pv_number: Optional[str] = Field(None, description="PV number")

    # ICT-specific fields
    asset_type: Optional[str] = Field(None, description="Type of ICT asset (Computer, Server, Network Equipment, etc.)")
    specifications: Optional[str] = Field(None, description="Technical specifications")
    software_licenses: Optional[str] = Field(None, description="Associated software licenses")
    ip_address: Optional[str] = Field(None, description="IP address (IPv4 or IPv6)")
    mac_address: Optional[str] = Field(None, description="MAC address")
    operating_system: Optional[str] = Field(None, description="Operating system information")

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

    # Transfer fields
    previous_owner: Optional[str] = Field(None, description="Previous owner of the asset")
    transfer_department: Optional[str] = Field(None, description="Transfer department")
    transfer_location: Optional[str] = Field(None, description="Transfer location")
    transfer_room_or_floor: Optional[str] = Field(None, description="Transfer room or floor")
    transfer_reason: Optional[str] = Field(None, description="Reason for transfer")

    @validator('delivery_installation_date', 'replacement_date', 'disposal_date', pre=True)
    def empty_str_to_none(cls, v):
        """Convert empty strings to None for optional date fields"""
        if v == "" or v is None:
            return None
        return v


# ============================================================
# Create Schema
# ============================================================
class IctAssetCreate(IctAssetBase):
    """Schema for creating a new ICT Asset record"""
    pass


# ============================================================
# Update Schema
# ============================================================
class IctAssetUpdate(BaseModel):
    """
    Schema for updating an ICT Asset record.
    All fields optional to allow partial updates.
    """

    # Basic information
    asset_description: str | None = Field(default=None, description="Description of the ICT asset")
    financed_by: str | None = Field(default=None, description="Financed by")
    serial_number: str | None = Field(default=None, description="Serial number of the asset")
    tag_number: str | None = Field(default=None, description="Tag number of the asset")
    make_model: str | None = Field(default=None, description="Make and model of the asset")
    pv_number: str | None = Field(default=None, description="PV number")

    # ICT-specific fields
    asset_type: str | None = Field(default=None, description="Type of ICT asset (Computer, Server, Network Equipment, etc.)")
    specifications: str | None = Field(default=None, description="Technical specifications")
    software_licenses: str | None = Field(default=None, description="Associated software licenses")
    ip_address: str | None = Field(default=None, description="IP address (IPv4 or IPv6)")
    mac_address: str | None = Field(default=None, description="MAC address")
    operating_system: str | None = Field(default=None, description="Operating system information")

    # Locations
    original_location: str | None = Field(default=None, description="Original location of the asset")
    current_location: str | None = Field(default=None, description="Current location of the asset")
    responsible_officer: str | None = Field(default=None, description="Responsible officer for the asset")

    # Dates
    delivery_installation_date: datetime | None = Field(default=None, description="Delivery/installation date")
    replacement_date: datetime | None = Field(default=None, description="Replacement date")
    disposal_date: datetime | None = Field(default=None, description="Disposal date")

    # Financial information
    purchase_amount: Decimal | None = Field(default=None, description="Purchase amount of the asset")
    depreciation_rate: Decimal | None = Field(default=None, description="Depreciation rate (%)")
    annual_depreciation: Decimal | None = Field(default=None, description="Annual depreciation value")
    accumulated_depreciation: Decimal | None = Field(default=None, description="Accumulated depreciation")
    net_book_value: Decimal | None = Field(default=None, description="Net book value")
    disposal_value: Decimal | None = Field(default=None, description="Disposal value")

    # Other details
    asset_condition: str | None = Field(default=None, description="Condition of the asset (e.g., Good, Poor)")
    notes: str | None = Field(default=None, description="Additional notes or remarks")

    # Transfer fields
    previous_owner: str | None = Field(default=None, description="Previous owner of the asset")
    transfer_department: str | None = Field(default=None, description="Transfer department")
    transfer_location: str | None = Field(default=None, description="Transfer location")
    transfer_room_or_floor: str | None = Field(default=None, description="Transfer room or floor")
    transfer_reason: str | None = Field(default=None, description="Reason for transfer")

    @validator('delivery_installation_date', 'replacement_date', 'disposal_date', pre=True)
    def empty_str_to_none(cls, v):
        """Convert empty strings to None for optional date fields"""
        if v == "" or v is None:
            return None
        return v


# ============================================================
# Database Base Schema
# ============================================================
class IctAssetInDBBase(IctAssetBase):
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
class IctAsset(IctAssetInDBBase):
    """Response schema returned by the API"""
    pass


# ============================================================
# Internal DB Schema
# ============================================================
class IctAssetInDB(IctAssetInDBBase):
    """Internal schema used for database operations"""
    pass
