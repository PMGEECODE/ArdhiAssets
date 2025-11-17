from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


# ============================================================
# Base Schema
# ============================================================
class FurnitureEquipmentTransferBase(BaseModel):
    """
    Shared fields for Furniture Equipment Transfer.
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
class FurnitureEquipmentTransferCreate(FurnitureEquipmentTransferBase):
    """
    Schema for creating a new Furniture Equipment Transfer record.
    """
    pass


# ============================================================
# Response Schema
# ============================================================
class FurnitureEquipmentTransferResponse(FurnitureEquipmentTransferBase):
    """
    Schema returned in API responses.
    """
    
    id: UUID
    furniture_equipment_id: UUID
    transfer_date: datetime
    created_by: Optional[str] = Field(None, description="User who created the transfer record")
    created_at: datetime

    class Config:
        from_attributes = True
