"""
User management routes
Converted from Node.js users.js routes
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin, require_admin_or_user
from app.models.auth_models.user import User, UserRole
from app.schemas.user import (
    UserCreate, UserUpdate, UserResponse, PasswordChange,
    ForgotPassword, PasswordReset, UserDeactivate
)
from app.services.audit_service import audit_service
from app.services.email_service import email_service
from app.utils.generate_custom_id import generate_uuid
from app.core.config import settings
import secrets
from app.utils.password_generator import generate_temporary_password

router = APIRouter()

# User Settings Schemas
from pydantic import BaseModel

class NotificationSettings(BaseModel):
    email_notifications: bool
    device_alerts: bool
    security_alerts: bool
    maintenance_alerts: bool

class SecuritySettings(BaseModel):
    two_factor_auth: bool
    session_timeout: int
    password_expiration: int

class UserSettings(BaseModel):
    notifications: NotificationSettings
    security: SecuritySettings

class AccountSettings(BaseModel):
    full_name: str
    email: str

class TwoFactorToggle(BaseModel):
    enabled: bool

@router.get("/settings", response_model=UserSettings)
async def get_user_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user settings"""
    try:
        # Calculate password expiration days
        password_expiration_days = 90
        if current_user.password_expiration:
            days_remaining = (current_user.password_expiration - datetime.utcnow()).days
            password_expiration_days = max(0, days_remaining)
        
        return UserSettings(
            notifications=NotificationSettings(
                email_notifications=current_user.email_notifications,
                device_alerts=current_user.device_alerts,
                security_alerts=current_user.security_alerts,
                maintenance_alerts=current_user.maintenance_alerts
            ),
            security=SecuritySettings(
                two_factor_auth=current_user.two_factor_auth,
                session_timeout=current_user.session_timeout,
                password_expiration=password_expiration_days
            )
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch settings"
        )

@router.put("/2fa")
async def toggle_2fa(
    toggle_data: TwoFactorToggle,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Enable or disable 2FA"""
    try:
        current_user.two_factor_auth = toggle_data.enabled
        await db.commit()
        
        return {"message": f"2FA {'enabled' if toggle_data.enabled else 'disabled'}"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update 2FA setting"
        )

@router.put("/settings/notifications")
async def update_notification_settings(
    notification_settings: NotificationSettings,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update notification settings"""
    try:
        current_user.email_notifications = notification_settings.email_notifications
        current_user.device_alerts = notification_settings.device_alerts
        current_user.security_alerts = notification_settings.security_alerts
        current_user.maintenance_alerts = notification_settings.maintenance_alerts
        
        await db.commit()
        
        return {"message": "Notification settings updated successfully"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update notification settings"
        )

@router.put("/settings/security")
async def update_security_settings(
    security_settings: SecuritySettings,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update security settings"""
    try:
        if security_settings.session_timeout <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid session timeout"
            )
        
        if security_settings.password_expiration <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid password expiration"
            )
        
        # Convert days to date
        expiration_date = datetime.utcnow() + timedelta(days=security_settings.password_expiration)
        
        current_user.two_factor_auth = security_settings.two_factor_auth
        current_user.session_timeout = security_settings.session_timeout
        current_user.password_expiration = expiration_date
        
        await db.commit()
        
        return {"message": "Security settings updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update security settings"
        )

@router.put("/settings/account")
async def update_account_settings(
    account_settings: AccountSettings,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update account settings"""
    try:
        # Check if email is already taken by another user
        stmt = select(User).where(
            and_(User.email == account_settings.email, User.id != current_user.id)
        )
        result = await db.execute(stmt)
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already in use"
            )
        
        # Parse full name into first and last name
        name_parts = account_settings.full_name.strip().split(' ', 1)
        first_name = name_parts[0] if name_parts else ""
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        current_user.first_name = first_name
        current_user.last_name = last_name
        current_user.email = account_settings.email
        
        await db.commit()
        
        return {"message": "Account settings updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update account settings"
        )

@router.get("/online")
async def get_online_users(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get online users (admin only)"""
    try:
        fifteen_minutes_ago = datetime.utcnow() - timedelta(minutes=15)
        
        stmt = select(User.id).where(
            and_(
                User.last_login >= fifteen_minutes_ago,
                User.is_active == True
            )
        )
        result = await db.execute(stmt)
        online_user_ids = [row[0] for row in result.fetchall()]
        
        return online_user_ids
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch online users"
        )

@router.get("/", response_model=List[UserResponse])
async def get_all_users(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get all users (admin only)"""
    try:
        stmt = select(User).order_by(User.created_at.desc())
        result = await db.execute(stmt)
        users = result.scalars().all()
        return users
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch users"
        )

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a single user by ID (admin or self)"""
    if current_user.id != user_id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized access to user data"
        )
    
    try:
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user details"
        )

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new user (admin only)"""
    try:
        stmt = select(User).where(
            or_(
                User.username == user_data.username,
                User.email == user_data.email
            )
        )
        result = await db.execute(stmt)
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            if existing_user.username == user_data.username:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already exists"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already exists"
                )
        
        temp_password = user_data.password if user_data.password else generate_temporary_password()
        
        new_user = User(
            id=generate_uuid(),
            username=user_data.username,
            email=user_data.email,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            personal_number=user_data.personal_number,
            department=user_data.department,
            role=user_data.role
        )
        
        new_user.set_password(temp_password)
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        await email_service.send_welcome_email(
            to_email=new_user.email,
            username=new_user.username,
            temporary_password=temp_password,
            first_name=new_user.first_name or "User"
        )
        
        # Create audit log
        await audit_service.create_audit_log(
            db=db,
            user=current_user,
            action="create",
            entity_type="user",
            entity_id=new_user.id,
            ip_address=audit_service.get_client_ip(request)
        )
        
        return new_user
    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already exists"
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a user (admin or self)"""
    is_self = current_user.id == user_id
    is_admin = current_user.role == UserRole.ADMIN
    
    try:
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if not is_self and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized to update this user"
            )
        
        # Non-admins cannot update role or activation status
        if not is_admin and (user_data.role is not None or user_data.is_active is not None):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can update role or activation status"
            )
        
        # Update user fields
        update_data = user_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(user, field) and value is not None:
                # Skip role and is_active for non-admins (already checked above)
                if not is_admin and field in ['role', 'is_active']:
                    continue
                setattr(user, field, value)
        
        await db.commit()
        await db.refresh(user)
        
        # Create audit log
        await audit_service.create_audit_log(
            db=db,
            user=current_user,
            action="update",
            entity_type="user",
            entity_id=user_id,
            ip_address=audit_service.get_client_ip(request)
        )
        
        return user
    except HTTPException:
        raise
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already exists"
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )

@router.post("/{user_id}/activate")
async def activate_user(
    user_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Activate a user (admin only)"""
    try:
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user.is_active = True
        await db.commit()
        
        return {"message": "User activated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to activate user"
        )

@router.post("/{user_id}/deactivate")
async def deactivate_user(
    user_id: str,
    deactivation_data: UserDeactivate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Deactivate a user with reason (admin only)"""
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    try:
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already deactivated"
            )
        
        user.is_active = False
        user.deactivation_reason = deactivation_data.reason
        user.deactivated_at = datetime.utcnow()  # Set deactivation timestamp
        await db.commit()
        
        await audit_service.create_audit_log(
            db=db,
            user=current_user,
            action="deactivate",
            entity_type="user",
            entity_id=user_id,
            details=f"Reason: {deactivation_data.reason}",
            ip_address=audit_service.get_client_ip(request)
        )
        
        return {"message": "User deactivated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deactivate user"
        )

@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Delete a user (admin only)"""
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    try:
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        await db.delete(user)
        await db.commit()
        
        # Create audit log
        await audit_service.create_audit_log(
            db=db,
            user=current_user,
            action="delete",
            entity_type="user",
            entity_id=user_id,
            ip_address=audit_service.get_client_ip(request)
        )
        
        return {"message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user"
        )

@router.put("/{user_id}/password")
async def change_user_password(
    user_id: str,
    password_data: PasswordChange,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Change user password (admin or self)"""
    is_self = current_user.id == user_id
    is_admin = current_user.role == UserRole.ADMIN
    
    try:
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if not is_self and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized to change this user's password"
            )
        
        # Self users (non-admin) must provide current password
        if is_self and not is_admin:
            if not user.verify_password(password_data.current_password):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Current password is incorrect"
                )
        
        # Update password
        user.set_password(password_data.new_password)
        user.password_changed_at = datetime.utcnow()
        user.password_expiration = datetime.utcnow() + timedelta(days=90)
        user.requires_password_change = False
        
        await db.commit()
        
        # Create audit log
        await audit_service.create_audit_log(
            db=db,
            user=current_user,
            action="change_password",
            entity_type="user",
            entity_id=user_id,
            ip_address=audit_service.get_client_ip(request)
        )
        
        return {"message": "Password updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password"
        )
