"""
System Settings Service
Handles system-wide configuration settings with robust error handling,
audit logging, and security.
"""

import logging
from typing import Optional, Union
from uuid import UUID
from datetime import datetime

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.models.auth_models.system_setting import SystemSetting
from app.models.auth_models.user import User
from app.core.security import get_password_hash, verify_password
from app.core.audit import log_audit_event
from app.core.deps import get_current_user
from app.services.isolated_master_password_service import IsolatedMasterPasswordService
from app.core.isolated_db import get_isolated_db

logger = logging.getLogger("app.services.system_settings")


class SystemSettingsService:
    """Service for managing system settings with full audit logging."""

    # === Utility Helpers ===

    @staticmethod
    async def get_current_user_id(
        request: Request,
        db: AsyncSession,
        current_user: Optional[User] = Depends(get_current_user),
    ) -> Optional[UUID]:
        """
        Retrieve the current user's UUID safely for audit and ownership tracking.
        Returns None if no authenticated user is present (system-level action).
        """
        try:
            if current_user and current_user.id:
                return current_user.id
            return None
        except Exception as e:
            logger.warning(f"Unable to determine current user ID: {e}")
            return None

    # === Core System Settings ===

    @staticmethod
    async def get_setting(db: AsyncSession, key: str) -> Optional[str]:
        """Get a system setting value by key."""
        try:
            logger.debug(f"Fetching system setting: {key}")
            result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
            setting = result.scalar_one_or_none()

            if setting:
                logger.info(f"Retrieved setting '{key}' successfully at {datetime.utcnow().isoformat()} UTC")
                return setting.value
            else:
                logger.warning(f"System setting '{key}' not found.")
                return None
        except SQLAlchemyError as db_err:
            logger.exception(f"Database error while retrieving setting '{key}': {db_err}")
            return None
        except Exception as e:
            logger.exception(f"Unexpected error while retrieving setting '{key}': {e}")
            return None

    @staticmethod
    async def set_setting(
        db: AsyncSession,
        key: str,
        value: str,
        description: Optional[str] = None,
        updated_by: Optional[str] = None,
        user_id: Optional[Union[UUID, str]] = None,
        ip_address: Optional[str] = None,
    ) -> Optional[SystemSetting]:
        """Create or update a system setting with transaction safety and audit logging."""
        try:
            result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
            setting = result.scalar_one_or_none()

            if setting:
                setting.value = value
                if description:
                    setting.description = description
                setting.updated_by = updated_by or setting.updated_by
                action = "update_setting"
                details = f"System setting '{key}' updated successfully."
                logger.info(details)
            else:
                setting = SystemSetting(
                    key=key,
                    value=value,
                    description=description,
                    updated_by=updated_by,
                )
                db.add(setting)
                action = "create_setting"
                details = f"System setting '{key}' created successfully."
                logger.info(details)

            await db.commit()
            await db.refresh(setting)

            # ✅ Log audit event with valid user_id or fallback to None (system)
            await log_audit_event(
                db=db,
                user_id=user_id if user_id else None,
                username=updated_by,
                action=action,
                entity_type="system_setting",
                details=details,
                ip_address=ip_address,
            )

            return setting

        except SQLAlchemyError as db_err:
            await db.rollback()
            logger.exception(f"Database error while saving setting '{key}': {db_err}")
            return None
        except Exception as e:
            await db.rollback()
            logger.exception(f"Unexpected error while saving setting '{key}': {e}")
            return None

    # === Master Password Handlers (Now Delegating to Isolated DB) ===

    @staticmethod
    async def get_master_password_hash(
        db: AsyncSession,
        isolated_db: Optional[AsyncSession] = None,
    ) -> Optional[str]:
        """
        Fetch the active master password hash from isolated database.
        Falls back to main database if isolated DB not available.
        
        Now uses isolated database for master password
        """
        try:
            # Try to use isolated database first
            if isolated_db:
                master_password = await IsolatedMasterPasswordService.get_active_master_password(
                    db=isolated_db
                )
                if master_password:
                    logger.info("✓ Retrieved master password from isolated database")
                    return master_password.password_hash
            
            # Fallback to main database (legacy/development)
            logger.debug("No isolated database available, checking main database...")
            return await SystemSettingsService.get_setting(db, "master_password_hash")
            
        except Exception as e:
            logger.exception(f"Error retrieving master password hash: {e}")
            return None

    @staticmethod
    async def set_master_password(
        db: AsyncSession,
        password: str,
        updated_by: Optional[str] = None,
        user_id: Optional[Union[UUID, str]] = None,
        ip_address: Optional[str] = None,
        isolated_db: Optional[AsyncSession] = None,
    ) -> Optional[SystemSetting]:
        """
        Set or update the master password.
        Uses isolated database if available, otherwise falls back to main database.
        
        Enhanced to support isolated database storage
        """
        try:
            logger.info("Setting master password...")
            
            # If isolated database is available, use it
            if isolated_db:
                logger.info("Using isolated database for master password storage")
                await IsolatedMasterPasswordService.set_master_password(
                    db=isolated_db,
                    password=password,
                    updated_by_username=updated_by,
                    main_db=db,
                    current_user_id=user_id,
                    ip_address=ip_address,
                )
                # Still store in main DB for backward compatibility
            
            # Also store in main database for backward compatibility
            password_hash = get_password_hash(password)
            setting = await SystemSettingsService.set_setting(
                db=db,
                key="master_password_hash",
                value=password_hash,
                description="Master password for system backups access (backup)",
                updated_by=updated_by,
                user_id=user_id,
                ip_address=ip_address,
            )
            
            await log_audit_event(
                db=db,
                user_id=user_id if user_id else None,
                username=updated_by,
                action="set_master_password",
                entity_type="system_setting",
                details="Master password updated" + (" in isolated database" if isolated_db else ""),
                ip_address=ip_address,
            )
            
            return setting
            
        except Exception as e:
            logger.exception(f"Error setting master password: {e}")
            return None

    @staticmethod
    async def verify_master_password(
        db: AsyncSession,
        password: str,
        request: Optional[Request] = None,
        user_id: Optional[Union[UUID, str]] = None,
        ip_address: Optional[str] = None,
        isolated_db: Optional[AsyncSession] = None,
    ) -> bool:
        """
        Verify the master password.
        Uses isolated database if available, otherwise falls back to main database.
        
        Enhanced to verify against isolated database
        """
        try:
            # Extract user context if not provided
            username = None
            if not user_id and request:
                try:
                    current_user = await get_current_user(request)
                    user_id = getattr(current_user, "id", None)
                    username = getattr(current_user, "username", None)
                except Exception:
                    user_id = None

            # If isolated database available, verify against it
            if isolated_db:
                logger.debug("Verifying master password against isolated database")
                is_valid = await IsolatedMasterPasswordService.verify_master_password(
                    db=isolated_db,
                    password=password,
                    main_db=db,
                    current_user_id=user_id,
                    username=username,
                    ip_address=ip_address,
                )
                if is_valid:
                    return True
                # If verification fails in isolated DB, don't fall back
                return False
            
            # Fallback to main database verification
            logger.debug("Verifying master password against main database (fallback)")
            stored_hash = await SystemSettingsService.get_master_password_hash(db)
            if not stored_hash:
                msg = "Attempted verification but master password is not set"
                logger.warning(msg)
                await log_audit_event(
                    db=db,
                    user_id=user_id,
                    username=username,
                    action="verify_master_password",
                    entity_type="system_setting",
                    details=msg,
                    ip_address=ip_address,
                )
                return False

            is_valid = verify_password(password, stored_hash)
            msg = (
                "✓ Master password verification succeeded"
                if is_valid
                else "✗ Master password verification failed"
            )
            log_fn = logger.info if is_valid else logger.warning
            log_fn(msg)

            await log_audit_event(
                db=db,
                user_id=user_id,
                username=username,
                action="verify_master_password",
                entity_type="system_setting",
                details=msg,
                ip_address=ip_address,
            )

            return is_valid
            
        except SQLAlchemyError as db_err:
            logger.exception(f"Database error during password verification: {db_err}")
            return False
        except ValueError as ve:
            logger.error(f"Invalid bcrypt hash format or version: {ve}")
            return False
        except Exception as e:
            logger.exception(f"Unexpected error verifying master password: {e}")
            return False
