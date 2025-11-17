"""
Asset Category Permissions API routes
Secure permission management for asset categories
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, update
from datetime import datetime

from app.core.database import get_db
from app.core.deps import require_admin, get_current_user
from app.models.auth_models.user import User, UserRole
from app.models.auth_models.asset_category_permission import AssetCategoryPermission, AssetCategoryType, PermissionLevel
from app.schemas.permission import (
    PermissionCreate, PermissionUpdate, PermissionResponse, 
    UserPermissionsResponse, BulkPermissionUpdate
)
from app.services.audit_service import audit_service
from app.utils.generate_custom_id import generate_uuid

router = APIRouter()

@router.get("/user/{user_id}", response_model=UserPermissionsResponse)
async def get_user_permissions_by_id(
    user_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get all permissions for a specific user (Admin only)"""
    
    # Verify user exists
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    target_user = result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get user permissions
    if target_user.role == UserRole.ADMIN:
        permissions = {
            category.value: {
                "has_access": True,
                "permission_level": PermissionLevel.ADMIN.value,
                "can_read": True,
                "can_write": True,
                "can_admin": True
            }
            for category in AssetCategoryType
        }
    else:
        stmt = select(AssetCategoryPermission).where(
            and_(
                AssetCategoryPermission.user_id == user_id,
                AssetCategoryPermission.is_active == True
            )
        )
        result = await db.execute(stmt)
        user_permissions = result.scalars().all()
        
        permissions = {}
        for category in AssetCategoryType:
            permission = next((p for p in user_permissions if p.category == category), None)
            
            if permission and permission.has_access():
                permissions[category.value] = {
                    "has_access": True,
                    "permission_level": permission.permission_level.value,
                    "can_read": permission.can_read(),
                    "can_write": permission.can_write(),
                    "can_admin": permission.can_admin(),
                    "expires_at": permission.expires_at.isoformat() if permission.expires_at is not None else None
                }
            else:
                permissions[category.value] = {
                    "has_access": False,
                    "permission_level": PermissionLevel.NONE.value,
                    "can_read": False,
                    "can_write": False,
                    "can_admin": False,
                    "expires_at": None
                }
    
    return {
        "user_id": user_id,
        "username": target_user.username,
        "email": target_user.email,
        "role": target_user.role.value,
        "permissions": permissions
    }

@router.get("/me", response_model=dict)
async def get_my_permissions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's permissions"""
    
    # Admin users have all permissions
    if current_user.role == UserRole.ADMIN:
        permissions = {
            category.value: {
                "has_access": True,
                "permission_level": PermissionLevel.ADMIN.value,
                "can_read": True,
                "can_write": True,
                "can_admin": True
            }
            for category in AssetCategoryType
        }
    else:
        # Get user's specific permissions
        stmt = select(AssetCategoryPermission).where(
            and_(
                AssetCategoryPermission.user_id == current_user.id,
                AssetCategoryPermission.is_active == True
            )
        )
        result = await db.execute(stmt)
        user_permissions = result.scalars().all()
        
        permissions = {}
        for category in AssetCategoryType:
            permission = next((p for p in user_permissions if p.category == category), None)
            
            if permission and permission.has_access():
                permissions[category.value] = {
                    "has_access": True,
                    "permission_level": permission.permission_level.value,
                    "can_read": permission.can_read(),
                    "can_write": permission.can_write(),
                    "can_admin": permission.can_admin(),
                    "expires_at": permission.expires_at.isoformat() if permission.expires_at is not None else None
                }
            else:
                permissions[category.value] = {
                    "has_access": False,
                    "permission_level": PermissionLevel.NONE.value,
                    "can_read": False,
                    "can_write": False,
                    "can_admin": False,
                    "expires_at": None
                }
    
    return {"permissions": permissions}

@router.post("/grant", response_model=PermissionResponse)
async def grant_permission(
    permission_data: PermissionCreate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Grant permission to user for specific category (Admin only)"""
    
    # Verify target user exists
    stmt = select(User).where(User.id == permission_data.user_id)
    result = await db.execute(stmt)
    target_user = result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if permission already exists
    stmt = select(AssetCategoryPermission).where(
        and_(
            AssetCategoryPermission.user_id == permission_data.user_id,
            AssetCategoryPermission.category == permission_data.category
        )
    )
    result = await db.execute(stmt)
    existing_permission = result.scalar_one_or_none()
    
    if existing_permission:
        # Update existing permission
        stmt = update(AssetCategoryPermission).where(
            AssetCategoryPermission.id == existing_permission.id
        ).values(
            permission_level=permission_data.permission_level.value,
            is_active=True,
            reason=permission_data.reason,
            notes=permission_data.notes,
            expires_at=permission_data.expires_at,
            granted_by=current_user.id,
            updated_at=datetime.utcnow()
        )
        await db.execute(stmt)
        await db.commit()
        
        # Refresh the object
        await db.refresh(existing_permission)
        permission = existing_permission
    else:
        # Create new permission
        permission = AssetCategoryPermission(
            id=generate_uuid(),
            user_id=permission_data.user_id,
            granted_by=current_user.id,
            category=permission_data.category,
            permission_level=permission_data.permission_level.value,
            is_active=True,
            reason=permission_data.reason,
            notes=permission_data.notes,
            expires_at=permission_data.expires_at
        )
        db.add(permission)
        await db.commit()
        await db.refresh(permission)
    
    # Create audit log
    await audit_service.create_audit_log(
        db=db,
        user=current_user,
        action="PERMISSION_GRANTED",
        entity_type="asset_category_permission",
        entity_id=str(permission.id),  # Convert to string for audit log
        details=f"Granted {permission_data.permission_level.value} access to {permission_data.category.value} for user {target_user.username}",
        ip_address=audit_service.get_client_ip(request)
    )
    
    return permission

@router.put("/update/{permission_id}", response_model=PermissionResponse)
async def update_permission(
    permission_id: str,
    permission_data: PermissionUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update existing permission (Admin only)"""
    
    # Get existing permission
    stmt = select(AssetCategoryPermission).where(AssetCategoryPermission.id == permission_id)
    result = await db.execute(stmt)
    permission = result.scalar_one_or_none()
    
    if not permission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found"
        )
    
    update_values = {
        "granted_by": current_user.id,
        "updated_at": datetime.utcnow()
    }
    
    if permission_data.permission_level is not None:
        update_values["permission_level"] = permission_data.permission_level.value
    if permission_data.is_active is not None:
        update_values["is_active"] = permission_data.is_active
    if permission_data.reason is not None:
        update_values["reason"] = permission_data.reason
    if permission_data.notes is not None:
        update_values["notes"] = permission_data.notes
    if permission_data.expires_at is not None:
        update_values["expires_at"] = permission_data.expires_at
    
    stmt = update(AssetCategoryPermission).where(
        AssetCategoryPermission.id == permission_id
    ).values(**update_values)
    
    await db.execute(stmt)
    await db.commit()
    await db.refresh(permission)
    
    # Create audit log
    await audit_service.create_audit_log(
        db=db,
        user=current_user,
        action="PERMISSION_UPDATED",
        entity_type="asset_category_permission",
        entity_id=str(permission.id),  # Convert to string for audit log
        details=f"Updated permission for category {permission.category.value}",
        ip_address=audit_service.get_client_ip(request)
    )
    
    return permission

@router.delete("/revoke/{permission_id}")
async def revoke_permission(
    permission_id: str,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Revoke permission (Admin only)"""
    
    # Get existing permission
    stmt = select(AssetCategoryPermission).where(AssetCategoryPermission.id == permission_id)
    result = await db.execute(stmt)
    permission = result.scalar_one_or_none()
    
    if not permission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found"
        )
    
    stmt = update(AssetCategoryPermission).where(
        AssetCategoryPermission.id == permission_id
    ).values(
        is_active=False,
        granted_by=current_user.id,
        updated_at=datetime.utcnow()
    )
    
    await db.execute(stmt)
    await db.commit()
    
    # Create audit log
    await audit_service.create_audit_log(
        db=db,
        user=current_user,
        action="PERMISSION_REVOKED",
        entity_type="asset_category_permission",
        entity_id=str(permission.id),  # Convert to string for audit log
        details=f"Revoked permission for category {permission.category.value}",
        ip_address=audit_service.get_client_ip(request)
    )
    
    return {"message": "Permission revoked successfully"}

@router.post("/bulk-update")
async def bulk_update_permissions(
    bulk_data: BulkPermissionUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Bulk update permissions for a user (Admin only)"""
    
    # Verify target user exists
    stmt = select(User).where(User.id == bulk_data.user_id)
    result = await db.execute(stmt)
    target_user = result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    updated_permissions = []
    
    for category_permission in bulk_data.permissions:
        # Check if permission exists
        stmt = select(AssetCategoryPermission).where(
            and_(
                AssetCategoryPermission.user_id == bulk_data.user_id,
                AssetCategoryPermission.category == category_permission.category
            )
        )
        result = await db.execute(stmt)
        existing_permission = result.scalar_one_or_none()
        
        if existing_permission:
            stmt = update(AssetCategoryPermission).where(
                AssetCategoryPermission.id == existing_permission.id
            ).values(
                permission_level=category_permission.permission_level.value,
                is_active=category_permission.permission_level != PermissionLevel.NONE,
                granted_by=current_user.id,
                updated_at=datetime.utcnow()
            )
            await db.execute(stmt)
            updated_permissions.append(existing_permission)
        elif category_permission.permission_level != PermissionLevel.NONE:
            # Create new permission
            new_permission = AssetCategoryPermission(
                id=generate_uuid(),
                user_id=bulk_data.user_id,
                granted_by=current_user.id,
                category=category_permission.category,
                permission_level=category_permission.permission_level.value,
                is_active=True,
                reason=f"Bulk update by {current_user.username}"
            )
            db.add(new_permission)
            updated_permissions.append(new_permission)
    
    await db.commit()
    
    # Create audit log
    await audit_service.create_audit_log(
        db=db,
        user=current_user,
        action="PERMISSIONS_BULK_UPDATE",
        entity_type="asset_category_permission",
        entity_id=None,  # Set to None for bulk operations
        details=f"Bulk updated permissions for user {target_user.username}",
        ip_address=audit_service.get_client_ip(request)
    )
    
    return {"message": f"Updated {len(updated_permissions)} permissions successfully"}

@router.get("/categories")
async def get_available_categories():
    """Get all available asset categories"""
    return {
        "categories": [
            {
                "value": category.value,
                "label": category.value.replace("_", " ").title()
            }
            for category in AssetCategoryType
        ]
    }

@router.get("/levels")
async def get_permission_levels():
    """Get all available permission levels"""
    return {
        "levels": [
            {
                "value": level.value,
                "label": level.value.title(),
                "description": {
                    "none": "No access - category is locked",
                    "read": "View only access",
                    "write": "Create and edit access",
                    "admin": "Full control including delete"
                }.get(level.value, "")
            }
            for level in PermissionLevel
        ]
    }
