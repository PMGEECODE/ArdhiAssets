"""
DeviceTransfer Pydantic schemas
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ============================================================
# Base Schema
# ============================================================
class DeviceTransferBase(BaseModel):
    """
    Base schema for device transfer information.
    Defines common fields used across creation and response schemas.
    """

    previous_owner: Optional[str] = None        # Person/department that previously owned the device
    assigned_to: str = Field(..., min_length=1) # New responsible officer/user of the device
    location: Optional[str] = None              # Current location of the device before transfer
    room_or_floor: Optional[str] = None         # Specific room or floor where the device was located
    transfer_department: Optional[str] = None   # Target department where device is being transferred
    transfer_location: str = Field(..., min_length=1)  # New location of the device after transfer
    transfer_room_or_floor: Optional[str] = None # Specific room/floor in the new location
    transfer_reason: Optional[str] = None       # Reason for transferring the device


# ============================================================
# Create Schema
# ============================================================
class DeviceTransferCreate(DeviceTransferBase):
    """
    Schema for creating a new device transfer record.
    Extends the base schema with device reference.
    """

    device_id: str = Field(..., min_length=1)  # Identifier of the device being transferred


# ============================================================
# Response Schema
# ============================================================
class DeviceTransferResponse(DeviceTransferBase):
    """
    Schema for responding with device transfer details.
    Extends the base schema with metadata fields.
    """

    id: str                   # Unique identifier for the transfer record
    device_id: str            # Identifier of the transferred device
    transfer_date: datetime   # Date when the transfer took place
    created_at: datetime      # Timestamp when the transfer record was created
    updated_at: datetime      # Timestamp when the transfer record was last updated

    class Config:
        # Enables ORM mode so data can be populated from database models
        from_attributes = True
# ============================================================