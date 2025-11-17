# fastapi-server/app/schemas/ict_asset_transfer.py

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


# ============================================================
# Base Schema
# ============================================================
class IctAssetTransferBase(BaseModel):
    """
    Shared fields for ICT Asset Transfer.
    Used as a base for Create, Update, and Response schemas.
    """

    # Person who previously owned the asset
    previous_owner: Optional[str] = Field(None, description="Previous owner of the asset")

    # New person who the asset is assigned to (required on creation)
    assigned_to: str = Field(..., description="New person assigned to the asset")
    
    # Previous location details
    location: Optional[str] = Field(None, description="Previous location of the asset")
    room_or_floor: Optional[str] = Field(None, description="Previous room or floor of the asset")
    
    # New location details
    transfer_department: Optional[str] = Field(None, description="Department receiving the asset")
    transfer_location: str = Field(..., description="New location for the asset")
    transfer_room_or_floor: Optional[str] = Field(None, description="New room or floor")
    transfer_reason: Optional[str] = Field(None, description="Reason for the asset transfer")


# ============================================================
# Create Schema
# ============================================================
class IctAssetTransferCreate(IctAssetTransferBase):
    """
    Schema for creating a new ICT Asset Transfer record.
    Inherits all fields from the base schema.
    """
    pass


# ============================================================
# Update Schema
# ============================================================
class IctAssetTransferUpdate(BaseModel):
    """
    Schema for updating an existing ICT Asset Transfer record.
    All fields are optional to allow partial updates (PATCH).
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
class IctAssetTransferInDBBase(IctAssetTransferBase):
    """
    Base schema for database models.
    Extends the base schema with metadata fields automatically
    managed by the system (IDs, timestamps, etc.).
    """

    # Unique identifiers
    id: UUID
    ict_asset_id: UUID

    # Audit fields
    transfer_date: datetime
    created_by: Optional[str] = Field(None, description="User who created the transfer record")
    created_at: datetime

    class Config:
        from_attributes = True  # Enables ORM-to-Pydantic conversion


# ============================================================
# Response Schema
# ============================================================
class IctAssetTransferResponse(IctAssetTransferInDBBase):
    """
    Schema returned in API responses.
    Includes both asset transfer details and metadata fields.
    """
    pass


# ============================================================
# Internal Schema
# ============================================================
class IctAssetTransferInDB(IctAssetTransferInDBBase):
    """
    Internal schema used for database operations.
    Mirrors the DB model and includes all fields.
    """
    pass
