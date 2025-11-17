"""
Isolated Master Password Service
Manages master password operations in the isolated database
with complete separation from main application data
"""

import logging
from typing import Optional, Union
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.exc import SQLAlchemyError

from app.models.isolated.master_password import MasterPassword
from app.core.security import get_password_hash, verify_password
from app.core.audit import log_audit_event

logger = logging.getLogger("app.services.isolated_master_password_service")


class IsolatedMasterPasswordService:
    """
    Service for managing master passwords in isolated database.
    All operations use the isolated database connection.
    """
    
    # ==============================================================================
    # Core Operations
    # ==============================================================================
    
    @staticmethod
    async def get_active_master_password(
        db: AsyncSession,
    ) -> Optional[MasterPassword]:
        """
        Retrieve the currently active master password.
        
        Args:
            db: Isolated database session
            
        Returns:
            Active MasterPassword record or None
        """
        try:
            logger.debug("Fetching active master password from isolated database...")
            
            stmt = select(MasterPassword).where(
                MasterPassword.is_active == True
            ).order_by(desc(MasterPassword.created_at)).limit(1)
            
            result = await db.execute(stmt)
            master_password = result.scalar_one_or_none()
            
            if master_password:
                logger.info(
                    f"✓ Active master password retrieved (version {master_password.version})"
                )
            else:
                logger.warning("No active master password found in isolated database")
            
            return master_password
            
        except SQLAlchemyError as db_err:
            logger.exception(f"Database error fetching master password: {db_err}")
            return None
        except Exception as e:
            logger.exception(f"Unexpected error fetching master password: {e}")
            return None
    
    
    @staticmethod
    async def set_master_password(
        db: AsyncSession,
        password: str,
        updated_by_username: Optional[str] = None,
        label: Optional[str] = None,
        main_db: Optional[AsyncSession] = None,
        current_user_id: Optional[Union[UUID, str]] = None,
        ip_address: Optional[str] = None,
    ) -> Optional[MasterPassword]:
        """
        Set or update the master password in isolated database.
        Deactivates previous password and creates new entry.
        
        Args:
            db: Isolated database session
            password: Plain text master password
            updated_by_username: Admin username who set this password
            label: Optional label for password version
            main_db: Main database session for audit logging (optional)
            current_user_id: User ID for audit logging
            ip_address: IP address for audit logging
            
        Returns:
            New MasterPassword record or None on failure
        """
        try:
            logger.info("Setting new master password in isolated database...")
            
            # Hash the password using Argon2id
            password_hash = get_password_hash(password)
            
            # Deactivate current active password if it exists
            current_active = await IsolatedMasterPasswordService.get_active_master_password(db)
            if current_active:
                current_active.is_active = False
                logger.info(f"Deactivated previous master password (version {current_active.version})")
            
            # Get new version number
            new_version = 1
            if current_active:
                new_version = current_active.version + 1
            
            # Create new master password record
            new_master_password = MasterPassword(
                password_hash=password_hash,
                is_active=True,
                label=label or f"v{new_version}",
                version=new_version,
                created_by_username=updated_by_username,
                updated_by_username=updated_by_username,
            )
            
            db.add(new_master_password)
            await db.commit()
            await db.refresh(new_master_password)
            
            logger.info(
                f"✓ Master password set successfully (version {new_version}) "
                f"in isolated database"
            )
            
            # Log to main database audit if available
            if main_db and current_user_id:
                try:
                    await log_audit_event(
                        db=main_db,
                        user_id=current_user_id,
                        username=updated_by_username,
                        action="set_master_password_isolated",
                        entity_type="master_password",
                        details=f"Master password set in isolated database (version {new_version})",
                        ip_address=ip_address,
                    )
                except Exception as audit_err:
                    logger.warning(f"Failed to log audit event: {audit_err}")
            
            return new_master_password
            
        except SQLAlchemyError as db_err:
            await db.rollback()
            logger.exception(f"Database error setting master password: {db_err}")
            return None
        except Exception as e:
            await db.rollback()
            logger.exception(f"Unexpected error setting master password: {e}")
            return None
    
    
    @staticmethod
    async def verify_master_password(
        db: AsyncSession,
        password: str,
        main_db: Optional[AsyncSession] = None,
        current_user_id: Optional[Union[UUID, str]] = None,
        username: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> bool:
        """
        Verify master password against stored hash.
        Logs verification attempt to main database.
        
        Args:
            db: Isolated database session
            password: Plain text master password to verify
            main_db: Main database session for audit logging (optional)
            current_user_id: User ID for audit logging
            username: Username for audit logging
            ip_address: IP address for audit logging
            
        Returns:
            True if password matches, False otherwise
        """
        try:
            logger.debug("Verifying master password from isolated database...")
            
            # Get active master password
            master_password = await IsolatedMasterPasswordService.get_active_master_password(db)
            
            if not master_password:
                msg = "Attempted verification but no active master password in isolated database"
                logger.warning(msg)
                
                # Log failed attempt
                if main_db:
                    try:
                        await log_audit_event(
                            db=main_db,
                            user_id=current_user_id,
                            username=username,
                            action="master_password_verification_failed",
                            entity_type="master_password",
                            details="No active master password found",
                            ip_address=ip_address,
                        )
                    except Exception:
                        pass
                
                return False
            
            # Verify password
            is_valid = verify_password(password, master_password.password_hash)
            
            msg = (
                "✓ Master password verification succeeded"
                if is_valid
                else "✗ Master password verification failed (invalid password)"
            )
            log_level = "info" if is_valid else "warning"
            getattr(logger, log_level)(msg)
            
            # Log verification attempt to main database
            if main_db:
                try:
                    await log_audit_event(
                        db=main_db,
                        user_id=current_user_id,
                        username=username,
                        action="master_password_verified" if is_valid else "master_password_verification_failed",
                        entity_type="master_password",
                        details=f"{msg} (version {master_password.version})",
                        ip_address=ip_address,
                    )
                except Exception as audit_err:
                    logger.debug(f"Could not log to main DB: {audit_err}")
            
            return is_valid
            
        except SQLAlchemyError as db_err:
            logger.exception(f"Database error during verification: {db_err}")
            return False
        except ValueError as ve:
            logger.error(f"Invalid password hash format: {ve}")
            return False
        except Exception as e:
            logger.exception(f"Unexpected error during verification: {e}")
            return False
    
    
    @staticmethod
    async def get_password_history(
        db: AsyncSession,
        limit: int = 10,
    ) -> list[MasterPassword]:
        """
        Retrieve master password history (all versions).
        
        Args:
            db: Isolated database session
            limit: Maximum number of records to return
            
        Returns:
            List of MasterPassword records ordered by creation date
        """
        try:
            stmt = select(MasterPassword).order_by(
                desc(MasterPassword.created_at)
            ).limit(limit)
            
            result = await db.execute(stmt)
            history = result.scalars().all()
            
            logger.info(f"Retrieved {len(history)} master password records from history")
            return history
            
        except Exception as e:
            logger.exception(f"Error retrieving password history: {e}")
            return []
