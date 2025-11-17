"""
OTP Schemas for request/response validation
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class OTPEnrollRequest(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=100)
    device_name: str = Field(..., min_length=1, max_length=100)


class OTPEnrollResponse(BaseModel):
    success: bool
    message: str
    qr_data: Optional[dict] = None
    device_id: str


class OTPVerifyRequest(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=100)
    otp_code: str = Field(..., pattern=r'^\d{6}$')  # ✅ replaced regex with pattern


class OTPVerifyResponse(BaseModel):
    success: bool
    message: str
    backup_code: str


class OTPStatusResponse(BaseModel):
    device_id: str
    device_name: str
    is_active: bool
    created_at: datetime
    last_used: Optional[datetime] = None  # keep only one
    is_enrolled: bool
    has_backup_codes: bool = False



class OTPUnenrollRequest(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=100)

class OTPGenerateBackupCodesResponse(BaseModel):
    success: bool
    message: str
    
class OTPVerifyBackupRequest(BaseModel):
    backup_code: str