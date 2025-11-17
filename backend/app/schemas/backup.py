from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from uuid import UUID

class BackupBase(BaseModel):
    filename: str
    file_size: int
    backup_type: str
    status: str


class BackupCreate(BackupBase):
    created_by: UUID
    error_message: Optional[str] = None


class BackupResponse(BackupBase):
    id: UUID
    created_by: UUID
    created_at: datetime
    error_message: Optional[str] = None
    progress_percentage: int = 0
    progress_message: Optional[str] = None
    encrypted: bool = False

    class Config:
        from_attributes = True


class CreateBackupRequest(BaseModel):
    encrypt: bool = False
    password: Optional[str] = None


class DownloadWithPasswordRequest(BaseModel):
    password: str


class RestoreWithPasswordRequest(BaseModel):
    password: str