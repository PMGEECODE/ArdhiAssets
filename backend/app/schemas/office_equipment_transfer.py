from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


# ============================================================
# Base Schema
# ============================================================
class OfficeEquipmentTransferBase(BaseModel):
    """
    Shared fields for Office Equipment Transfer.
    Used as a base for Create, Update, and Response schemas.
    """

    previous_owner: Optional[str] = Field(None, description="Previous owner of the asset")
    assigned_to: str = Field(..., description="New person assigned to the asset")
    
    location: Optional[str] = Field(None, description="Previous location of the asset")
    room_or_floor: Optional[str] = Field(None, description="Previous room or floor of the asset")
    
    transfer_department: Optional[str] = Field(None, description="Department receiving the asset")
    transfer_location: str = Field(..., description="New location for the asset")
    transfer_room_or_floor: Optional[str] = Field(None, description="New room or floor")
    transfer_reason: Optional[str] = Field(None, description="Reason for the asset transfer")


# ============================================================
# Create Schema
# ============================================================
class OfficeEquipmentTransferCreate(OfficeEquipmentTransferBase):
    """
    Schema for creating a new Office Equipment Transfer record.
    """
    pass


# ============================================================
# Update Schema
# ============================================================
class OfficeEquipmentTransferUpdate(BaseModel):
    """
    Schema for updating an existing Office Equipment Transfer record.
    """

    previous_owner: Optional[str] = None
    assigned_to: Optional[str] = None
    location: Optional[str] = None
    room_or_floor: Optional[str] = None
    transfer_department: Optional[str] = None
    transfer_location: Optional[str] = None
    transfer_room_or_floor: Optional[str] = None
    transfer_reason: Optional[str] = None


# ============================================================
# Database Base Schema
# ============================================================
class OfficeEquipmentTransferInDBBase(OfficeEquipmentTransferBase):
    """
    Base schema for database models.
    """

    id: UUID
    office_equipment_id: UUID

    transfer_date: datetime
    created_by: Optional[str] = Field(None, description="User who created the transfer record")
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# Response Schema
# ============================================================
class OfficeEquipmentTransferResponse(OfficeEquipmentTransferInDBBase):
    """
    Schema returned in API responses.
    """
    pass


# ============================================================
# Internal Schema
# ============================================================
class OfficeEquipmentTransferInDB(OfficeEquipmentTransferInDBBase):
    """
    Internal schema used for database operations.
    """
    pass
