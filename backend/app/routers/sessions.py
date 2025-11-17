"""
Session management API endpoints
Backend-driven session validation, extension, and cleanup
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from pydantic import BaseModel

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.auth_models.user import User
from app.models.auth_models.user_session import UserSession
from app.services.session_service import session_service
from app.services.audit_service import audit_service

UTC = ZoneInfo("UTC")
router = APIRouter(prefix="/sessions", tags=["sessions"])


class SessionStatusResponse(BaseModel):
    """Session status check response"""
    is_valid: bool
    is_expired: bool
    time_until_expiry: int  # seconds
    last_activity: str  # ISO format
    expires_at: str  # ISO format
    requires_logout: bool
    message: str


class SessionExtendRequest(BaseModel):
    """Request to extend session"""
    activity_detected: bool = True
    reason: Optional[str] = None


class SessionExtendResponse(BaseModel):
    """Response after session extension"""
    success: bool
    message: str
    new_expiry: str  # ISO format
    extended_by_minutes: int


@router.post("/validate", response_model=SessionStatusResponse)
async def validate_session(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> SessionStatusResponse:
    """
    Validate session status against backend database
    
    Returns session validity, expiration status, and time remaining.
    Frontend should call this periodically to check session health.
    """
    now_utc = datetime.now(UTC)
    session_id = request.headers.get("X-Session-Id")
    
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session ID required in X-Session-Id header"
        )
    
    # Fetch session from database
    session = await session_service.get_session_by_id(db, session_id)
    
    if not session:
        await audit_service.create_audit_log(
            db=db,
            user=current_user,
            action="SESSION_VALIDATION_FAILED",
            entity_type="session",
            details="Session not found during validation",
            ip_address=audit_service.get_client_ip(request)
        )
        return SessionStatusResponse(
            is_valid=False,
            is_expired=True,
            time_until_expiry=0,
            last_activity=now_utc.isoformat(),
            expires_at=now_utc.isoformat(),
            requires_logout=True,
            message="Session not found. Please login again."
        )
    
    # Check if session is active
    if not session.is_active:
        await audit_service.create_audit_log(
            db=db,
            user=current_user,
            action="SESSION_VALIDATION_FAILED",
            entity_type="session",
            details="Session is inactive",
            ip_address=audit_service.get_client_ip(request)
        )
        return SessionStatusResponse(
            is_valid=False,
            is_expired=True,
            time_until_expiry=0,
            last_activity=session.last_activity.isoformat(),
            expires_at=session.expires_at.isoformat(),
            requires_logout=True,
            message="Session has been invalidated."
        )
    
    # Check if session has expired
    is_expired = session.expires_at < now_utc
    time_until_expiry = int((session.expires_at - now_utc).total_seconds())
    
    if is_expired:
        # Mark as inactive in database
        session.is_active = False
        session.invalidated_at = now_utc
        await db.commit()
        
        await audit_service.create_audit_log(
            db=db,
            user=current_user,
            action="SESSION_EXPIRED",
            entity_type="session",
            details="Session expired during validation",
            ip_address=audit_service.get_client_ip(request)
        )
        
        return SessionStatusResponse(
            is_valid=False,
            is_expired=True,
            time_until_expiry=0,
            last_activity=session.last_activity.isoformat(),
            expires_at=session.expires_at.isoformat(),
            requires_logout=True,
            message="Session has expired. Please login again."
        )
    
    # Session is valid
    return SessionStatusResponse(
        is_valid=True,
        is_expired=False,
        time_until_expiry=time_until_expiry,
        last_activity=session.last_activity.isoformat(),
        expires_at=session.expires_at.isoformat(),
        requires_logout=False,
        message="Session is valid"
    )


@router.post("/extend", response_model=SessionExtendResponse)
async def extend_session(
    extend_request: SessionExtendRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> SessionExtendResponse:
    """
    Extend user session when they are actively using the app
    
    Updates last_activity timestamp and extends expiration time.
    Only extends if user is marked as active.
    """
    now_utc = datetime.now(UTC)
    session_id = request.headers.get("X-Session-Id")
    
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session ID required in X-Session-Id header"
        )
    
    # Fetch session from database
    session = await session_service.get_session_by_id(db, session_id)
    
    if not session or not session.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or inactive session"
        )
    
    # Check if already expired
    if session.expires_at < now_utc:
        session.is_active = False
        session.invalidated_at = now_utc
        await db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session already expired"
        )
    
    # Update last activity
    session.update_activity()
    
    # Extend session by user's configured timeout
    session_timeout_minutes = current_user.session_timeout or 30
    new_expiry = now_utc + timedelta(minutes=session_timeout_minutes)
    session.expires_at = new_expiry
    
    await db.commit()
    
    await audit_service.create_audit_log(
        db=db,
        user=current_user,
        action="SESSION_EXTENDED",
        entity_type="session",
        details=f"Session extended for {session_timeout_minutes} minutes. Reason: {extend_request.reason or 'user activity'}",
        ip_address=audit_service.get_client_ip(request)
    )
    
    return SessionExtendResponse(
        success=True,
        message=f"Session extended by {session_timeout_minutes} minutes",
        new_expiry=new_expiry.isoformat(),
        extended_by_minutes=session_timeout_minutes
    )


@router.get("/check-expiry")
async def check_session_expiry(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Check if current session has expired (called by frontend periodically)
    Returns expiry status and time remaining for auto-logout or warning display
    """
    access_token = request.cookies.get("access_token")
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No active session"
        )
    
    # Get current session
    token_hash = session_service.hash_token(access_token)
    now_utc = datetime.now(UTC)
    
    stmt = select(UserSession).where(
        and_(
            UserSession.user_id == current_user.id,
            UserSession.token_hash == token_hash,
        )
    )
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session not found"
        )
    
    # Check if expired
    if session.expires_at < now_utc or not session.is_active:
        # Mark as inactive if expired
        if session.expires_at < now_utc:
            session.is_active = False
            session.invalidated_at = now_utc
            await db.commit()
        
        return {
            "is_expired": True,
            "message": "Your session has expired. Please login again.",
            "expires_at": session.expires_at.isoformat() if session.expires_at else None,
            "time_remaining": 0
        }
    
    # Calculate time remaining
    time_remaining_seconds = int((session.expires_at - now_utc).total_seconds())
    
    # Warn if less than 5 minutes remaining
    should_warn = time_remaining_seconds < 300
    
    return {
        "is_expired": False,
        "should_warn": should_warn,
        "expires_at": session.expires_at.isoformat(),
        "time_remaining": time_remaining_seconds,
        "message": "Session is active"
    }


@router.get("/expiry-info")
async def get_session_expiry_info(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get session expiration details for UI warning banners
    
    Returns time until expiration, so frontend can show warnings
    """
    now_utc = datetime.now(UTC)
    session_id = request.headers.get("X-Session-Id")
    
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session ID required"
        )
    
    session = await session_service.get_session_by_id(db, session_id)
    
    if not session or not session.is_active:
        return {
            "time_until_expiry": 0,
            "expires_at": None,
            "is_expired": True,
            "warning_threshold_minutes": 15
        }
    
    if session.expires_at < now_utc:
        return {
            "time_until_expiry": 0,
            "expires_at": session.expires_at.isoformat(),
            "is_expired": True,
            "warning_threshold_minutes": 15
        }
    
    time_remaining_seconds = (session.expires_at - now_utc).total_seconds()
    warning_threshold_seconds = 15 * 60  # 15 minutes
    
    return {
        "time_until_expiry": int(time_remaining_seconds),
        "expires_at": session.expires_at.isoformat(),
        "is_expired": False,
        "is_warning": time_remaining_seconds <= warning_threshold_seconds,
        "warning_threshold_minutes": 15
    }


@router.get("/my-sessions")
async def get_my_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all active sessions for the current user
    
    Allows users to see and manage their sessions across devices
    """
    sessions = await session_service.get_active_sessions(db, str(current_user.id))
    
    return {
        "sessions": [
            {
                "id": str(session.id),
                "device_name": session.device_name,
                "device_type": session.device_type,
                "browser": session.browser,
                "os": session.os,
                "ip_address": session.ip_address,
                "created_at": session.created_at.isoformat(),
                "last_activity": session.last_activity.isoformat(),
                "expires_at": session.expires_at.isoformat(),
                "is_active": session.is_active,
            }
            for session in sessions
        ],
        "total_active": len(sessions)
    }


@router.post("/revoke-others")
async def revoke_other_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Revoke all other sessions for current user
    
    Useful for security - force logout from all other devices
    """
    session_id = request.headers.get("X-Session-Id")
    
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session ID required"
        )
    
    count = await session_service.invalidate_other_sessions(
        db,
        str(current_user.id),
        session_id
    )
    
    await audit_service.create_audit_log(
        db=db,
        user=current_user,
        action="REVOKE_OTHER_SESSIONS",
        entity_type="session",
        details=f"Revoked {count} other sessions",
        ip_address=audit_service.get_client_ip(request)
    )
    
    return {
        "message": f"Revoked {count} other session(s)",
        "count_revoked": count
    }
