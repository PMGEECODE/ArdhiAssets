"""
System Setting Schemas
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from uuid import UUID


class SystemSettingBase(BaseModel):
    """Base schema for system settings."""
    key: str = Field(..., description="Unique setting key")
    value: str = Field(..., description="Stored setting value")
    description: Optional[str] = Field(None, description="Setting description")


class SystemSettingCreate(SystemSettingBase):
    """Schema for creating a new system setting."""
    updated_by: Optional[UUID] = Field(None, description="UUID of user who created the setting")


class SystemSettingUpdate(BaseModel):
    """Schema for updating an existing system setting."""
    value: str = Field(..., description="New setting value")
    updated_by: Optional[UUID] = Field(None, description="UUID of user who updated the setting")


class SystemSettingResponse(SystemSettingBase):
    """Response schema for system settings."""
    id: UUID
    updated_at: datetime
    updated_by: Optional[UUID]

    class Config:
        from_attributes = True
