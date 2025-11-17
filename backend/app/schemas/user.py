"""
User Pydantic Schemas
"""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
from uuid import UUID, uuid4
from app.models.auth_models.user import UserRole


# ============================================================
# Base Schema
# ============================================================
class UserBase(BaseModel):
    """Base user schema"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    personal_number: Optional[str] = None
    department: Optional[str] = None
    role: UserRole = UserRole.USER


# ============================================================
# Create Schema
# ============================================================
class UserCreate(UserBase):
    """User creation schema"""
    password: str = Field(..., min_length=8)


# ============================================================
# Update Schema
# ============================================================
class UserUpdate(BaseModel):
    """User update schema"""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    personal_number: Optional[str] = None
    department: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    deactivation_reason: Optional[str] = None
    email_notifications: Optional[bool] = None
    device_alerts: Optional[bool] = None
    security_alerts: Optional[bool] = None
    maintenance_alerts: Optional[bool] = None
    two_factor_auth: Optional[bool] = None
    session_timeout: Optional[int] = Field(None, ge=5, le=480)  # 5 min to 8 hours


# ============================================================
# Login Schema
# ============================================================
class UserLogin(BaseModel):
    """User login schema"""
    email: EmailStr
    password: str


class EmailValidation(BaseModel):
    """Email validation schema for step-by-step login"""
    email: EmailStr

class SessionMetadata(BaseModel):
    session_id: str
    expires_at: datetime
    device_name: str
    last_activity: datetime
    
# ============================================================
# Response Schema
# ============================================================
class UserResponse(UserBase):
    """User response schema"""
    id: UUID = Field(default_factory=uuid4)
    is_active: bool
    deactivation_reason: Optional[str] = None
    deactivated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    email_notifications: bool
    device_alerts: bool
    security_alerts: bool
    maintenance_alerts: bool
    two_factor_auth: bool
    session_timeout: int
    password_expiration: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    session_metadata: Optional[SessionMetadata] = None

    class Config:
        from_attributes = True
        json_encoders = {
            UUID: str,
            datetime: lambda v: v.isoformat(),
        }

class LoginResponse(BaseModel):
    user: UserResponse
    csrf_token: str
    session_id: str
    expiresAt: datetime          # <-- NEW
    message: str = "Login successful"

class TwoFactorRequiredResponse(BaseModel):
    """Response when 2FA is required during login"""
    requires2FA: bool
    message: str
    email: str


# ============================================================
# Password Management Schemas
# ============================================================
class PasswordChange(BaseModel):
    """Password change schema"""
    current_password: str
    new_password: str = Field(..., min_length=8)


class PasswordReset(BaseModel):
    """Password reset schema"""
    token: str
    newPassword: str = Field(..., min_length=8)


class ForgotPassword(BaseModel):
    """Forgot password schema"""
    email: EmailStr


# ============================================================
# Two-Factor Authentication Schemas
# ============================================================
class TwoFactorVerify(BaseModel):
    """Two-factor authentication verification schema"""
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)


class TwoFactorSetupRequest(BaseModel):
    """Two-factor authentication setup request schema"""
    method: str = Field(..., pattern="^(email|authenticator)$")


class TwoFactorVerifySetup(BaseModel):
    """Two-factor authentication setup verification schema"""
    code: str = Field(..., min_length=6, max_length=6)
    method: str = Field(..., pattern="^(email|authenticator)$")
    secret: Optional[str] = None  # Required for authenticator method


class TwoFactorQRResponse(BaseModel):
    """Two-factor authentication QR code response schema"""
    qr_code: str
    secret: str
    backup_codes: list[str]


class TwoFactorDisableRequest(BaseModel):
    """Two-factor authentication disable request schema"""
    password: Optional[str] = None  # Optional password confirmation


# ============================================================
# Deactivation Schema
# ============================================================
class UserDeactivate(BaseModel):
    """User deactivation schema with reason"""
    reason: str = Field(..., min_length=1, max_length=500)


# ============================================================
# Secure Password Change Schemas
# ============================================================
class SecurePasswordChangeRequest(BaseModel):
    """Request to initiate secure password change (sends OTP)"""
    email: EmailStr


class SecurePasswordChangeVerify(BaseModel):
    """Verify OTP and complete password change"""
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)

    @field_validator('confirm_password')
    @classmethod
    def passwords_match(cls, v, info):
        if 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError('Passwords do not match')
        return v
