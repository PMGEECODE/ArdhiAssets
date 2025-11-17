"""
Backup Management API
Provides secure database backup creation, download, and management.
Protected by master password verification and audit logging.
"""

import os
import zipfile
import logging
import subprocess
import hashlib
from datetime import datetime, timedelta
from typing import List, Optional
from io import BytesIO

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    BackgroundTasks,
    Request,
)
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel

from app.core.database import get_db
from app.core.deps import require_admin
from app.core.config import settings
from app.core.security import create_access_token, encrypt_secret, decrypt_secret
from app.models.auth_models.backup import Backup, BackupStatus
from app.models.auth_models.user import User
from app.schemas.backup import BackupResponse, CreateBackupRequest, DownloadWithPasswordRequest, RestoreWithPasswordRequest
from app.core.audit import log_audit_event
from app.services.system_settings_service import SystemSettingsService
from app.core.isolated_db import get_isolated_db
from cryptography.fernet import Fernet

# === Router & Logger ===
router = APIRouter(tags=["backups"])
logger = logging.getLogger("app.routers.backups")

# === Backup Directory ===
BACKUP_DIR = os.path.join(os.path.dirname(__file__), "../../backups")
os.makedirs(BACKUP_DIR, exist_ok=True)


# === Schemas ===
class MasterPasswordVerify(BaseModel):
    password: str


class MasterPasswordResponse(BaseModel):
    backup_token: str
    expires_in: int


def hash_backup_password(password: str) -> str:
    """Hash backup password using SHA-256 for storage"""
    return hashlib.sha256(password.encode()).hexdigest()


def encrypt_backup_file(file_path: str, password: str) -> str:
    """
    Encrypt a backup file using Fernet with password-derived key.
    Returns path to encrypted file.
    """
    try:
        # Derive a Fernet-compatible key from password
        password_hash = hashlib.sha256(password.encode()).digest()
        import base64
        key = base64.urlsafe_b64encode(password_hash[:32])
        fernet = Fernet(key)
        
        # Read original file
        with open(file_path, 'rb') as f:
            file_data = f.read()
        
        # Encrypt data
        encrypted_data = fernet.encrypt(file_data)
        
        # Save encrypted file
        encrypted_path = file_path.replace('.zip', '.enc')
        with open(encrypted_path, 'wb') as f:
            f.write(encrypted_data)
        
        # Remove original unencrypted file
        os.remove(file_path)
        
        logger.info(f"✅ Backup file encrypted: {encrypted_path}")
        return encrypted_path
    except Exception as e:
        logger.error(f"❌ Encryption failed: {e}")
        raise


def decrypt_backup_file(file_path: str, password: str) -> bytes:
    """
    Decrypt a backup file using Fernet with password.
    Returns decrypted file data as bytes.
    """
    try:
        # Derive Fernet key from password
        password_hash = hashlib.sha256(password.encode()).digest()
        import base64
        key = base64.urlsafe_b64encode(password_hash[:32])
        fernet = Fernet(key)
        
        # Read encrypted file
        with open(file_path, 'rb') as f:
            encrypted_data = f.read()
        
        # Decrypt data
        decrypted_data = fernet.decrypt(encrypted_data)
        
        logger.info(f"✅ Backup file decrypted successfully")
        return decrypted_data
    except Exception as e:
        logger.error(f"❌ Decryption failed: {e}")
        raise


# === Helper: Verify Master Password Token ===
async def verify_backup_access(
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Ensure the user has a valid backup access token."""
    backup_token = request.headers.get("X-Backup-Token") or request.cookies.get("backup_token")

    if not backup_token:
        await log_audit_event(
            db=db,
            user_id=str(current_user.id),
            username=current_user.username,
            action="backup_access_denied",
            entity_type="backup",
            details="Missing master password token",
        )
        raise HTTPException(status_code=403, detail="Master password required. Authenticate first.")

    from app.core.security import verify_token
    try:
        payload = verify_token(backup_token)

        if payload.get("type") != "backup_access":
            raise HTTPException(status_code=403, detail="Invalid token type")

        if payload.get("user_id") != str(current_user.id):
            raise HTTPException(status_code=403, detail="Token-user mismatch")

    except Exception as e:
        await log_audit_event(
            db=db,
            user_id=str(current_user.id),
            username=current_user.username,
            action="backup_access_denied",
            entity_type="backup",
            details=f"Invalid backup token: {str(e)}",
        )
        raise HTTPException(status_code=403, detail="Invalid or expired backup token")

    return current_user


# === Master Password Verification ===
@router.post("/master-password/verify", response_model=MasterPasswordResponse)
async def verify_master_password(
    credentials: MasterPasswordVerify,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    isolated_db: AsyncSession = Depends(get_isolated_db),
):
    """Verify master password and issue temporary backup access token."""
    try:
        is_valid = await SystemSettingsService.verify_master_password(
            db=db,
            password=credentials.password,
            user_id=current_user.id,
            ip_address=request.client.host,
            isolated_db=isolated_db,
        )

        if not is_valid:
            await log_audit_event(
                db=db,
                user_id=str(current_user.id),
                username=current_user.username,
                action="master_password_failed",
                entity_type="backup",
                details="Invalid master password attempt",
            )
            raise HTTPException(status_code=401, detail="Invalid master password")

        backup_token = create_access_token(
            data={
                "user_id": str(current_user.id),
                "type": "backup_access",
            },
            expires_delta=timedelta(hours=1),
        )

        await log_audit_event(
            db=db,
            user_id=str(current_user.id),
            username=current_user.username,
            action="master_password_verified",
            entity_type="backup",
            details="Master password verified, backup access granted",
        )

        return MasterPasswordResponse(backup_token=backup_token, expires_in=3600)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying master password: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify master password")


# === Background: Create Database Backup ===
async def create_database_backup(backup_id: str, user_id: str, db: AsyncSession, encrypt: bool = False, password: str = None):
    """Perform PostgreSQL backup asynchronously with progress tracking."""
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"backup_{timestamp}.sql"
        filepath = os.path.join(BACKUP_DIR, filename)

        db_url = str(settings.DATABASE_URL).replace("postgresql+asyncpg://", "postgresql://").replace(
            "postgres://", "postgresql://"
        )

        # Update progress: Starting dump (10%)
        stmt = select(Backup).where(Backup.id == backup_id)
        result = await db.execute(stmt)
        backup = result.scalar_one_or_none()
        if backup:
            backup.progress_percentage = 10
            backup.progress_message = "Starting database dump..."
            await db.commit()

        logger.info(f"�� Starting backup: {backup_id}")

        result = subprocess.run(
            ["pg_dump", "-d", db_url, "-f", filepath, "--no-owner", "--no-acl"],
            capture_output=True,
            text=True,
            timeout=300,
        )

        if result.returncode != 0:
            raise Exception(f"pg_dump failed: {result.stderr}")

        # Update progress: Dump completed (50%)
        stmt = select(Backup).where(Backup.id == backup_id)
        result = await db.execute(stmt)
        backup = result.scalar_one_or_none()
        if backup:
            backup.progress_percentage = 50
            backup.progress_message = "Database dump completed, compressing..."
            await db.commit()

        logger.info(f"✅ Dump completed for backup: {backup_id}")

        zip_filename = f"backup_{timestamp}.zip"
        zip_filepath = os.path.join(BACKUP_DIR, zip_filename)

        logger.info(f"📦 Compressing backup: {backup_id}")
        with zipfile.ZipFile(zip_filepath, "w", zipfile.ZIP_DEFLATED) as zipf:
            zipf.write(filepath, arcname=filename)

        os.remove(filepath)
        file_size = os.path.getsize(zip_filepath)

        if encrypt and password:
            backup.progress_percentage = 75
            backup.progress_message = "Encrypting backup..."
            await db.commit()

            logger.info(f"🔒 Encrypting backup: {backup_id}")
            encrypted_path = encrypt_backup_file(zip_filepath, password)
            
            # Update with encrypted filename
            zip_filename = os.path.basename(encrypted_path)
            file_size = os.path.getsize(encrypted_path)
            password_hash = hash_backup_password(password)

        # Update progress: Compression completed (100%)
        stmt = select(Backup).where(Backup.id == backup_id)
        result = await db.execute(stmt)
        backup = result.scalar_one_or_none()

        if backup:
            backup.filename = zip_filename
            backup.file_size = file_size
            backup.status = BackupStatus.COMPLETED
            backup.progress_percentage = 100
            backup.progress_message = "Backup completed successfully"
            if encrypt and password:
                backup.encrypted = True
                backup.encrypted_password_hash = password_hash
            await db.commit()

        await log_audit_event(
            db=db,
            user_id=user_id,
            username=None,
            action="backup_created",
            entity_type="backup",
            details=f"{{'filename': '{zip_filename}', 'size': {file_size}, 'encrypted': {encrypt}}}",
        )

        logger.info(f"✅ Backup created: {zip_filename}")

    except Exception as e:
        logger.error(f"❌ Backup creation failed: {e}")
        stmt = select(Backup).where(Backup.id == backup_id)
        result = await db.execute(stmt)
        backup = result.scalar_one_or_none()

        if backup:
            backup.status = BackupStatus.FAILED
            backup.error_message = str(e)
            backup.progress_percentage = 0
            backup.progress_message = f"Backup failed: {str(e)}"
            await db.commit()


# === Routes ===
@router.post("/create", response_model=BackupResponse)
async def create_backup(
    req: CreateBackupRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(verify_backup_access),
    db: AsyncSession = Depends(get_db),
):
    """Initiate a new database backup (optionally encrypted)."""
    try:
        encrypt = req.encrypt
        password = req.password

        if encrypt and not password:
            raise HTTPException(status_code=400, detail="Password required for encrypted backup")

        new_backup = Backup(
            filename="pending",
            file_size=0,
            backup_type="database",
            status=BackupStatus.IN_PROGRESS,
            created_by=str(current_user.id),
            progress_percentage=0,
            progress_message="Backup initiation in progress...",
            encrypted=encrypt,  # Set encrypted flag
        )
        db.add(new_backup)
        await db.commit()
        await db.refresh(new_backup)

        background_tasks.add_task(create_database_backup, new_backup.id, str(current_user.id), db, encrypt, password)

        await log_audit_event(
            db=db,
            user_id=str(current_user.id),
            username=current_user.username,
            action="backup_initiated",
            entity_type="backup",
            details=f"Database backup initiated (encrypted={encrypt})",
        )

        return new_backup

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating backup: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create backup: {e}")


@router.get("/", response_model=List[BackupResponse])
async def list_backups(
    current_user: User = Depends(verify_backup_access),
    db: AsyncSession = Depends(get_db),
):
    """List all backups."""
    try:
        stmt = select(Backup).order_by(desc(Backup.created_at))
        result = await db.execute(stmt)
        backups = result.scalars().all()
        return backups
    except Exception as e:
        logger.error(f"Error listing backups: {e}")
        raise HTTPException(status_code=500, detail="Failed to list backups")


@router.get("/{backup_id}/download")
async def download_backup(
    backup_id: str,
    current_user: User = Depends(verify_backup_access),
    db: AsyncSession = Depends(get_db),
):
    """Download an unencrypted backup file."""
    try:
        stmt = select(Backup).where(Backup.id == backup_id)
        result = await db.execute(stmt)
        backup = result.scalar_one_or_none()

        if not backup:
            raise HTTPException(status_code=404, detail="Backup not found")

        if backup.status != BackupStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="Backup not ready")

        if backup.encrypted:
            raise HTTPException(status_code=400, detail="This backup is encrypted. Use POST with password.")

        filepath = os.path.join(BACKUP_DIR, backup.filename)
        if not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="Backup file missing")

        await log_audit_event(
            db=db,
            user_id=str(current_user.id),
            username=current_user.username,
            action="backup_downloaded",
            entity_type="backup",
            details=f"{{'filename': '{backup.filename}'}}",
        )

        return FileResponse(path=filepath, filename=backup.filename, media_type="application/zip")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading backup: {e}")
        raise HTTPException(status_code=500, detail="Failed to download backup")


@router.post("/{backup_id}/download")
async def download_encrypted_backup(
    backup_id: str,
    req: DownloadWithPasswordRequest,
    current_user: User = Depends(verify_backup_access),
    db: AsyncSession = Depends(get_db),
):
    """Download an encrypted backup file by decrypting with password."""
    try:
        stmt = select(Backup).where(Backup.id == backup_id)
        result = await db.execute(stmt)
        backup = result.scalar_one_or_none()

        if not backup:
            raise HTTPException(status_code=404, detail="Backup not found")

        if backup.status != BackupStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="Backup not ready")

        if not backup.encrypted:
            raise HTTPException(status_code=400, detail="Backup is not encrypted")

        filepath = os.path.join(BACKUP_DIR, backup.filename)
        if not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="Backup file missing")

        provided_hash = hash_backup_password(req.password)
        if provided_hash != backup.encrypted_password_hash:
            await log_audit_event(
                db=db,
                user_id=str(current_user.id),
                username=current_user.username,
                action="backup_decrypt_failed",
                entity_type="backup",
                details=f"Invalid password for backup: {backup_id}",
            )
            raise HTTPException(status_code=401, detail="Invalid password")

        try:
            decrypted_data = decrypt_backup_file(filepath, req.password)
        except Exception as e:
            logger.error(f"Decryption error: {e}")
            raise HTTPException(status_code=500, detail="Failed to decrypt backup")

        await log_audit_event(
            db=db,
            user_id=str(current_user.id),
            username=current_user.username,
            action="backup_downloaded",
            entity_type="backup",
            details=f"{{'filename': '{backup.filename}', 'encrypted': true}}",
        )

        # Remove .enc extension for output filename
        output_filename = backup.filename.replace('.enc', '.zip')
        
        return StreamingResponse(
            BytesIO(decrypted_data),
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={output_filename}"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading encrypted backup: {e}")
        raise HTTPException(status_code=500, detail="Failed to download backup")


@router.post("/{backup_id}/restore")
async def restore_backup(
    backup_id: str,
    background_tasks: BackgroundTasks,
    req: Optional[RestoreWithPasswordRequest] = None,
    current_user: User = Depends(verify_backup_access),
    db: AsyncSession = Depends(get_db),
):
    """Restore a backup to the database (optionally encrypted)."""
    try:
        stmt = select(Backup).where(Backup.id == backup_id)
        result = await db.execute(stmt)
        backup = result.scalar_one_or_none()

        if not backup:
            raise HTTPException(status_code=404, detail="Backup not found")

        if backup.status != BackupStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="Backup not ready for restore")

        if backup.encrypted and not req:
            raise HTTPException(status_code=400, detail="Password required for encrypted backup")

        password = req.password if req else None

        # Add restore task
        background_tasks.add_task(restore_database_from_backup, backup_id, str(current_user.id), db, password)

        await log_audit_event(
            db=db,
            user_id=str(current_user.id),
            username=current_user.username,
            action="backup_restore_initiated",
            entity_type="backup",
            details=f"Database restore initiated from backup: {backup_id}",
        )

        return {"message": "Restore started", "backup_id": str(backup_id)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating restore: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to initiate restore: {e}")


async def restore_database_from_backup(backup_id: str, user_id: str, db: AsyncSession, password: str = None):
    """Restore database from backup file asynchronously with progress tracking."""
    try:
        stmt = select(Backup).where(Backup.id == backup_id)
        result = await db.execute(stmt)
        backup = result.scalar_one_or_none()

        if not backup:
            logger.error(f"Backup {backup_id} not found for restore")
            return

        filepath = os.path.join(BACKUP_DIR, backup.filename)
        if not os.path.exists(filepath):
            logger.error(f"Backup file missing: {filepath}")
            backup.status = BackupStatus.FAILED
            backup.error_message = "Backup file not found"
            backup.progress_message = "Restore failed: Backup file not found"
            await db.commit()
            return

        logger.info(f"🔄 Starting restore from backup: {backup_id}")

        backup.status = BackupStatus.RESTORING
        backup.progress_percentage = 0
        backup.progress_message = "Preparing restore..."
        await db.commit()

        db_url = str(settings.DATABASE_URL).replace("postgresql+asyncpg://", "postgresql://").replace(
            "postgres://", "postgresql://"
        )

        backup.progress_percentage = 20
        backup.progress_message = "Extracting backup archive..."
        await db.commit()

        temp_dir = os.path.join(BACKUP_DIR, f"restore_{backup_id}")
        os.makedirs(temp_dir, exist_ok=True)

        try:
            if backup.encrypted:
                # Decrypt encrypted backup first
                if not password:
                    raise Exception("Password required for encrypted backup")

                logger.info(f"🔓 Decrypting backup: {backup_id}")
                try:
                    decrypted_data = decrypt_backup_file(filepath, password)
                except Exception as e:
                    logger.error(f"Decryption failed: {e}")
                    raise Exception(f"Failed to decrypt backup: {str(e)}")

                # Write decrypted data to temporary ZIP
                temp_zip_path = os.path.join(temp_dir, "backup.zip")
                with open(temp_zip_path, 'wb') as f:
                    f.write(decrypted_data)

                # Extract from temporary ZIP
                with zipfile.ZipFile(temp_zip_path, 'r') as zipf:
                    zipf.extractall(temp_dir)
            else:
                # Regular unencrypted backup - extract directly
                with zipfile.ZipFile(filepath, 'r') as zipf:
                    zipf.extractall(temp_dir)
        except Exception as e:
            logger.error(f"Failed to extract backup: {e}")
            backup.status = BackupStatus.FAILED
            backup.error_message = f"Failed to extract backup: {str(e)}"
            backup.progress_message = f"Restore failed: {str(e)}"
            backup.progress_percentage = 0
            await db.commit()
            return

        backup.progress_percentage = 40
        backup.progress_message = "Preparing database for restore..."
        await db.commit()

        # Find SQL file
        sql_files = [f for f in os.listdir(temp_dir) if f.endswith('.sql')]
        if not sql_files:
            logger.error("No SQL file found in backup ZIP")
            backup.status = BackupStatus.FAILED
            backup.error_message = "No SQL file found in backup"
            backup.progress_message = "Restore failed: No SQL file in backup"
            backup.progress_percentage = 0
            await db.commit()
            return

        sql_file = os.path.join(temp_dir, sql_files[0])

        backup.progress_percentage = 60
        backup.progress_message = "Restoring database... This may take a few minutes."
        await db.commit()

        logger.info(f"🔄 Restoring database from SQL file: {sql_files[0]}")

        # Run psql to restore
        try:
            with open(sql_file, 'r') as f:
                result = subprocess.run(
                    ["psql", "-d", db_url],
                    stdin=f,
                    capture_output=True,
                    text=True,
                    timeout=600,
                )

            if result.returncode != 0:
                logger.error(f"psql restore failed: {result.stderr}")
                backup.status = BackupStatus.FAILED
                backup.error_message = f"Database restore failed: {result.stderr[:500]}"
                backup.progress_message = f"Restore failed: {result.stderr[:100]}..."
                backup.progress_percentage = 0
                await db.commit()
                raise Exception(f"Database restore failed: {result.stderr}")

            backup.status = BackupStatus.COMPLETED
            backup.progress_percentage = 100
            backup.progress_message = "Restore completed successfully!"
            await db.commit()

            logger.info(f"✅ Database restored successfully from backup: {backup_id}")

            await log_audit_event(
                db=db,
                user_id=user_id,
                username=None,
                action="backup_restored",
                entity_type="backup",
                details=f"Database restored from backup: {backup_id}",
            )

        except Exception as e:
            logger.error(f"Restore process error: {e}")
            if backup.status != BackupStatus.FAILED:
                backup.status = BackupStatus.FAILED
                backup.error_message = str(e)[:500]
                backup.progress_message = f"Restore error: {str(e)[:100]}"
                backup.progress_percentage = 0
            await db.commit()

        finally:
            # Cleanup temp directory
            import shutil
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)

    except Exception as e:
        logger.error(f"❌ Restore failed: {e}")
        try:
            stmt = select(Backup).where(Backup.id == backup_id)
            result = await db.execute(stmt)
            backup = result.scalar_one_or_none()
            if backup:
                backup.status = BackupStatus.FAILED
                backup.error_message = str(e)[:500]
                backup.progress_message = f"Restore error: {str(e)[:100]}"
                backup.progress_percentage = 0
                await db.commit()
        except:
            pass

        await log_audit_event(
            db=db,
            user_id=user_id,
            username=None,
            action="backup_restore_failed",
            entity_type="backup",
            details=f"Restore failed: {str(e)}",
        )


@router.delete("/{backup_id}")
async def delete_backup(
    backup_id: str,
    current_user: User = Depends(verify_backup_access),
    db: AsyncSession = Depends(get_db),
):
    """Delete a backup file and record."""
    try:
        stmt = select(Backup).where(Backup.id == backup_id)
        result = await db.execute(stmt)
        backup = result.scalar_one_or_none()

        if not backup:
            raise HTTPException(status_code=404, detail="Backup not found")

        filepath = os.path.join(BACKUP_DIR, backup.filename)
        if os.path.exists(filepath):
            os.remove(filepath)

        await db.delete(backup)
        await db.commit()

        await log_audit_event(
            db=db,
            user_id=str(current_user.id),
            username=current_user.username,
            action="backup_deleted",
            entity_type="backup",
            details=f"{{'filename': '{backup.filename}'}}",
        )

        return {"message": "Backup deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting backup: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete backup")
