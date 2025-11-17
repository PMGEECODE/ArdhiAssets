"""
Pydantic schemas package
"""

from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserLogin
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceResponse
from app.schemas.audit_log import AuditLogResponse
from app.schemas.device_transfer import DeviceTransferCreate, DeviceTransferResponse
from app.schemas.notification import NotificationCreate, NotificationUpdate, NotificationResponse
from app.schemas.otp import (
    OTPEnrollRequest, OTPEnrollResponse,
    OTPVerifyRequest, OTPVerifyResponse,
    OTPStatusResponse, OTPUnenrollRequest
)

__all__ = [
    "UserCreate", "UserUpdate", "UserResponse", "UserLogin",
    "DeviceCreate", "DeviceUpdate", "DeviceResponse",
    "AuditLogResponse",
    "DeviceTransferCreate", "DeviceTransferResponse",
    "NotificationCreate", "NotificationUpdate", "NotificationResponse",
    "OTPEnrollRequest", "OTPEnrollResponse",
    "OTPVerifyRequest", "OTPVerifyResponse", 
    "OTPStatusResponse", "OTPUnenrollRequest"
]
