"""
FastAPI dependencies
"""

from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.core.security import verify_token, get_token_from_cookie
from app.models.auth_models.user import User, UserRole
from app.models.auth_models.asset_category_permission import AssetCategoryPermission, AssetCategoryType, PermissionLevel

# Security scheme (keep for backward compatibility)
security = HTTPBearer(auto_error=False)

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user from cookie or Authorization header"""
    
    token = None
    
    # First try to get token from HTTP-only cookie
    token = get_token_from_cookie(request)
    
    # Fallback to Authorization header for backward compatibility
    if not token and credentials:
        token = credentials.credentials
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify token
    payload = verify_token(token)
    user_id: str = payload.get("id")
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user"""
    return current_user

async def require_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Require admin role"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

async def require_admin_or_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Require admin or user role (not viewer)"""
    if current_user.role == UserRole.VIEWER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    return current_user

async def require_category_read_permission(
    category: AssetCategoryType,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Require read permission for specific asset category"""
    
    # Admin users have all permissions
    if current_user.role == UserRole.ADMIN:
        return current_user
    
    # Check user's specific permissions
    stmt = select(AssetCategoryPermission).where(
        and_(
            AssetCategoryPermission.user_id == current_user.id,
            AssetCategoryPermission.category == category,
            AssetCategoryPermission.is_active == True
        )
    )
    result = await db.execute(stmt)
    permission = result.scalar_one_or_none()
    
    if not permission or not permission.can_read():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Read access denied for {category.value}"
        )
    
    return current_user

async def require_category_write_permission(
    category: AssetCategoryType,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Require write permission for specific asset category"""
    
    # Admin users have all permissions
    if current_user.role == UserRole.ADMIN:
        return current_user
    
    # Check user's specific permissions
    stmt = select(AssetCategoryPermission).where(
        and_(
            AssetCategoryPermission.user_id == current_user.id,
            AssetCategoryPermission.category == category,
            AssetCategoryPermission.is_active == True
        )
    )
    result = await db.execute(stmt)
    permission = result.scalar_one_or_none()
    
    if not permission or not permission.can_write():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Write access denied for {category.value}"
        )
    
    return current_user

async def require_category_admin_permission(
    category: AssetCategoryType,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Require admin permission for specific asset category"""
    
    # Admin users have all permissions
    if current_user.role == UserRole.ADMIN:
        return current_user
    
    # Check user's specific permissions
    stmt = select(AssetCategoryPermission).where(
        and_(
            AssetCategoryPermission.user_id == current_user.id,
            AssetCategoryPermission.category == category,
            AssetCategoryPermission.is_active == True
        )
    )
    result = await db.execute(stmt)
    permission = result.scalar_one_or_none()
    
    if not permission or not permission.can_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Admin access denied for {category.value}"
        )
    
    return current_user

async def require_ict_assets_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Require read permission for ICT assets"""
    return await require_category_read_permission(AssetCategoryType.ICT_ASSETS, current_user, db)

async def require_ict_assets_write(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Require write permission for ICT assets"""
    return await require_category_write_permission(AssetCategoryType.ICT_ASSETS, current_user, db)

async def require_ict_assets_admin(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Require admin permission for ICT assets"""
    return await require_category_admin_permission(AssetCategoryType.ICT_ASSETS, current_user, db)
