"""
Notification Pydantic schemas
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# ============================================================
# Base Schema
# ============================================================
class NotificationBase(BaseModel):
    """Base notification schema"""
    message: str = Field(..., min_length=1, max_length=500)
    link: Optional[str] = None


# ============================================================
# Create Schema
# ============================================================
class NotificationCreate(NotificationBase):
    """Notification creation schema"""
    user_id: str = Field(..., min_length=1)


# ============================================================
# Update Schema
# ============================================================
class NotificationUpdate(BaseModel):
    """Notification update schema"""
    read: bool


# ============================================================
# Response Schema
# ============================================================
class NotificationResponse(NotificationBase):
    """Notification response schema"""
    id: str
    read: bool
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
# ============================================================