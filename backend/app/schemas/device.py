"""
Device Pydantic schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


# ============================================================
# Base Schema
# ============================================================
class DeviceBase(BaseModel):
    """
    Base schema for device information.
    Defines the standard fields that represent a device.
    """

    hostname: str = Field(..., min_length=1, max_length=255)  # Hostname of the device
    platform: Optional[str] = None            # Operating system platform (e.g., Windows, Linux)
    os_version: Optional[str] = None          # Version of the operating system
    os_build: Optional[str] = None            # Build number of the OS
    os_product_name: Optional[str] = None     # Product name of the OS
    model: Optional[str] = None               # Model of the device
    manufacturer: Optional[str] = None        # Manufacturer of the device
    type: Optional[str] = None                # Device type (e.g., Laptop, Desktop, Server)
    chassis: Optional[str] = None             # Chassis type (e.g., Tower, Rack)
    local_ip: Optional[str] = None            # Local IP address of the device
    domain: Optional[str] = None              # Domain the device belongs to
    mac_address: Optional[str] = None         # MAC address of the device
    cpu_id: Optional[str] = None              # CPU identifier
    serial_number: Optional[str] = None       # Device serial number
    location: Optional[str] = None            # Physical location of the device
    room_or_floor: Optional[str] = None       # Room or floor where the device is located
    assigned_to: Optional[str] = None         # User or officer assigned to the device


# ============================================================
# Create Schema
# ============================================================
class DeviceCreate(DeviceBase):
    """
    Schema for creating a new device record.
    Extends the base schema with additional optional fields.
    """

    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)  # User-defined extra fields


# ============================================================
# Update Schema
# ============================================================
class DeviceUpdate(BaseModel):
    """
    Schema for updating an existing device record.
    All fields are optional to allow partial updates.
    """

    hostname: Optional[str] = Field(None, min_length=1, max_length=255)
    platform: Optional[str] = None
    os_version: Optional[str] = None
    os_build: Optional[str] = None
    os_product_name: Optional[str] = None
    model: Optional[str] = None
    manufacturer: Optional[str] = None
    type: Optional[str] = None
    chassis: Optional[str] = None
    local_ip: Optional[str] = None
    domain: Optional[str] = None
    mac_address: Optional[str] = None
    cpu_id: Optional[str] = None
    serial_number: Optional[str] = None
    location: Optional[str] = None
    room_or_floor: Optional[str] = None
    assigned_to: Optional[str] = None

    # Transfer-related fields
    previous_owner: Optional[str] = None
    transfer_date: Optional[str] = None
    transfer_reason: Optional[str] = None
    transfer_department: Optional[str] = None
    transfer_location: Optional[str] = None
    transfer_room_or_floor: Optional[str] = None

    # Extra fields
    custom_fields: Optional[Dict[str, Any]] = None


# ============================================================
# Response Schema
# ============================================================
class DeviceResponse(DeviceBase):
    """
    Schema for responding with device details.
    Includes metadata and transfer history information.
    """

    id: str                                 # Unique identifier for the device
    last_seen: datetime                     # Timestamp when the device was last active
    first_seen: datetime                    # Timestamp when the device was first detected
    previous_owner: Optional[str] = None    # Previous owner of the device
    transfer_date: Optional[str] = None     # Date of last transfer
    transfer_reason: Optional[str] = None   # Reason for last transfer
    transfer_department: Optional[str] = None  # Target department of last transfer
    transfer_location: Optional[str] = None    # Target location of last transfer
    transfer_room_or_floor: Optional[str] = None  # Room/floor of last transfer location
    custom_fields: Dict[str, Any]           # User-defined extra fields
    created_at: datetime                    # Timestamp when the record was created
    updated_at: datetime                    # Timestamp when the record was last updated

    class Config:
        # Enable ORM mode and define JSON serialization behavior
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(timespec="milliseconds") if v else None
        }
# ============================================================