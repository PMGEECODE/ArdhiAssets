"""
Custom OTP Routes for device-based 2FA
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.auth_models.user import User
from app.models.device_otp import DeviceOTP
from app.schemas.otp import (
    OTPEnrollRequest, OTPEnrollResponse,
    OTPVerifyRequest, OTPVerifyResponse,
    OTPStatusResponse, OTPUnenrollRequest
)
from app.services.custom_otp_service import custom_otp_service
from app.services.audit_service import audit_service
from app.utils.generate_custom_id import generate_uuid

router = APIRouter()


@router.post("/enroll", response_model=OTPEnrollResponse)
async def enroll_device(
    request_data: OTPEnrollRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Enroll a device for custom OTP 2FA"""
    
    # Check if device already exists
    stmt = select(DeviceOTP).where(
        DeviceOTP.device_id == request_data.device_id,
        DeviceOTP.user_id == current_user.id
    )
    result = await db.execute(stmt)
    existing_device = result.scalar_one_or_none()
    
    if existing_device:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device already enrolled"
        )
    
    # Generate secret and encrypt it
    secret = custom_otp_service.generate_secret()
    encrypted_secret = custom_otp_service.encrypt_secret(secret)
    
    # Create device OTP record
    device_otp = DeviceOTP(
        id=generate_uuid(),
        user_id=current_user.id,
        device_id=request_data.device_id,
        device_name=request_data.device_name,
        encrypted_secret=encrypted_secret
    )
    
    db.add(device_otp)
    await db.commit()
    
    # Generate QR code data
    qr_data = custom_otp_service.generate_qr_data(
        current_user.email,
        request_data.device_id,
        encrypted_secret
    )
    
    # Audit log
    await audit_service.create_audit_log(
        db=db,
        user=current_user,
        action="OTP_DEVICE_ENROLLED",
        entity_type="otp",
        entity_id=device_otp.id,
        details=f"Device '{request_data.device_name}' enrolled for OTP",
        ip_address=audit_service.get_client_ip(request)
    )
    
    return OTPEnrollResponse(
        success=True,
        message="Device enrolled successfully",
        qr_data=qr_data,
        device_id=request_data.device_id
    )


@router.post("/verify", response_model=OTPVerifyResponse)
async def verify_otp(
    request_data: OTPVerifyRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Verify OTP code from enrolled device"""
    
    # Find device
    stmt = select(DeviceOTP).where(
        DeviceOTP.device_id == request_data.device_id,
        DeviceOTP.user_id == current_user.id,
        DeviceOTP.is_active == True
    )
    result = await db.execute(stmt)
    device = result.scalar_one_or_none()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found or not active"
        )
    
    # Verify OTP
    is_valid = custom_otp_service.verify_otp(
        device.device_id,
        device.encrypted_secret,
        request_data.otp_code
    )
    
    if not is_valid:
        # Audit failed verification
        await audit_service.create_audit_log(
            db=db,
            user=current_user,
            action="OTP_VERIFY_FAILED",
            entity_type="otp",
            entity_id=device.id,
            details=f"Failed OTP verification for device '{device.device_name}'",
            ip_address=audit_service.get_client_ip(request)
        )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OTP code"
        )
    
    # Update last used timestamp
    device.last_used = datetime.utcnow()
    await db.commit()
    
    # Audit successful verification
    await audit_service.create_audit_log(
        db=db,
        user=current_user,
        action="OTP_VERIFY_SUCCESS",
        entity_type="otp",
        entity_id=device.id,
        details=f"Successful OTP verification for device '{device.device_name}'",
        ip_address=audit_service.get_client_ip(request)
    )
    
    return OTPVerifyResponse(
        success=True,
        message="OTP verified successfully"
    )


@router.get("/devices", response_model=List[OTPStatusResponse])
async def get_enrolled_devices(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get list of enrolled OTP devices for current user"""
    
    stmt = select(DeviceOTP).where(DeviceOTP.user_id == current_user.id)
    result = await db.execute(stmt)
    devices = result.scalars().all()
    
    return [
        OTPStatusResponse(
            device_id=device.device_id,
            device_name=device.device_name,
            is_active=device.is_active,
            created_at=device.created_at,
            last_used=device.last_used
        )
        for device in devices
    ]


@router.post("/unenroll")
async def unenroll_device(
    request_data: OTPUnenrollRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Unenroll a device from OTP 2FA"""
    
    # Find and delete device
    stmt = select(DeviceOTP).where(
        DeviceOTP.device_id == request_data.device_id,
        DeviceOTP.user_id == current_user.id
    )
    result = await db.execute(stmt)
    device = result.scalar_one_or_none()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    device_name = device.device_name
    
    # Delete device
    await db.delete(device)
    await db.commit()
    
    # Audit log
    await audit_service.create_audit_log(
        db=db,
        user=current_user,
        action="OTP_DEVICE_UNENROLLED",
        entity_type="otp",
        details=f"Device '{device_name}' unenrolled from OTP",
        ip_address=audit_service.get_client_ip(request)
    )
    
    return {"success": True, "message": "Device unenrolled successfully"}
