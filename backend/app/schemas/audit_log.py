# backend/app/schemas/audit_log.py


from pydantic import BaseModel, Field, computed_field
from typing import Optional, Dict, Any
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import UUID

KENYA_TZ = ZoneInfo("Africa/Nairobi")


class AuditLogBase(BaseModel):
    action: str = Field(..., description="Type of action performed (e.g., CREATE, UPDATE, DELETE, LOGIN)")
    entity_type: Optional[str] = Field(None, description="The type of entity being acted upon (e.g., User, Asset)")
    entity_id: Optional[UUID] = Field(None, description="Unique identifier of the affected entity")  # 👈 changed to UUID
    details: Optional[str] = Field(None, description="Additional descriptive details of the action")
    ip_address: Optional[str] = Field(None, description="IP address of the requester")
    user_agent: Optional[str] = Field(None, description="User agent string of the requester")
    role: Optional[str] = Field(None, description="Role of the user performing the action")
    status: Optional[str] = Field("success", description="Outcome status of the action (success or failure)")
    event_category: Optional[str] = Field(None, description="Category of the event (e.g., security, system, user-action)")
    old_values: Optional[Dict[str, Any]] = Field(None, description="Previous values before the action")
    new_values: Optional[Dict[str, Any]] = Field(None, description="New values after the action")


class AuditLogResponse(AuditLogBase):
    id: UUID = Field(..., description="Unique identifier of the audit log record")  # 👈 changed to UUID
    user_id: Optional[UUID] = Field(None, description="User ID of who performed the action")  # 👈 changed to UUID
    username: Optional[str] = Field(None, description="Username of the user who performed the action")
    timestamp: datetime = Field(..., description="Time when the action was logged (UTC)")

    @computed_field
    @property
    def timestamp_display(self) -> str:
        """Returns a human-friendly timestamp in Kenya timezone."""
        local_time = self.timestamp.astimezone(KENYA_TZ)
        return local_time.strftime("%d %b %Y, %I:%M:%S %p")

    class Config:
        from_attributes = True
        json_encoders = {
            UUID: str,
        }
