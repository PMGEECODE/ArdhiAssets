"""
Pydantic schemas for asset category permissions (UUID-safe)
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field

from app.models.auth_models.asset_category_permission import AssetCategoryType, PermissionLevel


# ============================================================
# Create Schema
# ============================================================
class PermissionCreate(BaseModel):
    """Schema for creating a new permission"""

    user_id: UUID = Field(..., description="User ID to grant permission to")
    category: AssetCategoryType = Field(..., description="Asset category")
    permission_level: PermissionLevel = Field(..., description="Permission level")
    reason: Optional[str] = Field(None, description="Reason for granting permission")
    notes: Optional[str] = Field(None, description="Additional notes")
    expires_at: Optional[datetime] = Field(None, description="Permission expiration date")


# ============================================================
# Update Schema
# ============================================================
class PermissionUpdate(BaseModel):
    """Schema for updating an existing permission"""

    permission_level: Optional[PermissionLevel] = Field(None, description="New permission level")
    is_active: Optional[bool] = Field(None, description="Active status")
    reason: Optional[str] = Field(None, description="Reason for update")
    notes: Optional[str] = Field(None, description="Additional notes")
    expires_at: Optional[datetime] = Field(None, description="Permission expiration date")


# ============================================================
# Response Schema
# ============================================================
class PermissionResponse(BaseModel):
    """Schema for permission response"""

    id: UUID
    user_id: UUID
    category: AssetCategoryType
    permission_level: PermissionLevel
    is_active: bool
    reason: Optional[str]
    notes: Optional[str]
    expires_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# Category-specific Schema
# ============================================================
class CategoryPermission(BaseModel):
    """Schema for category-specific permission in bulk operations"""

    category: AssetCategoryType
    permission_level: PermissionLevel


# ============================================================
# Bulk Update Schema
# ============================================================
class BulkPermissionUpdate(BaseModel):
    """Schema for bulk permission updates"""

    user_id: UUID = Field(..., description="User ID to update permissions for")
    permissions: List[CategoryPermission] = Field(..., description="List of category permissions")


# ============================================================
# User Permissions Response Schema
# ============================================================
class UserPermissionsResponse(BaseModel):
    """Schema for user permissions response"""

    user_id: UUID
    username: str
    email: str
    role: str
    permissions: Dict[str, Dict[str, Any]] = Field(..., description="Category permissions mapping")


# ============================================================
# Permission Check Schema
# ============================================================
class PermissionCheck(BaseModel):
    """Schema for permission check requests"""

    category: AssetCategoryType
    permission_level: PermissionLevel = PermissionLevel.READ
