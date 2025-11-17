from typing import Tuple, Union
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from PIL.Image import Image as PILImage 
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import (
    decode_access_token,
    create_access_token, create_refresh_token, set_auth_cookies,
    clear_auth_cookies, generate_csrf_token, set_csrf_cookie,get_refresh_token_from_cookie, verify_token, hash_token 
)
from app.core.deps import get_current_user
from app.models.auth_models.user import User, UserRole
from app.models.device_otp import DeviceOTP
from app.models.auth_models.user_session import UserSession
from app.schemas.user import (
    UserCreate, UserLogin, UserResponse, PasswordChange,
    PasswordReset, ForgotPassword, TwoFactorVerify, EmailValidation, TwoFactorVerifySetup, TwoFactorQRResponse, TwoFactorDisableRequest,
    LoginResponse, SecurePasswordChangeRequest, SecurePasswordChangeVerify, TwoFactorRequiredResponse, SessionMetadata
)

from app.models.auth_models.refresh_token import RefreshToken

from app.models.auth_models.user_session import UserSession 

from app.services.email_service import email_service
from app.services.audit_service import audit_service
from app.services.session_service import session_service
from app.services.custom_otp_service import custom_otp_service
from app.utils.device_parser import parse_device_info
from app.utils.generate_custom_id import generate_uuid
from app.core.config import settings
from app.utils.password_generator import generate_temporary_password
from fastapi.responses import JSONResponse
import json
import hashlib
import hmac
import secrets
import qrcode
import pyotp
import io
import base64
from datetime import datetime, timedelta
from sqlalchemy import and_
import random
from app.core.redis_client import redis_client
from zoneinfo import ZoneInfo



router = APIRouter()
security = HTTPBearer()
INSTITUTE_SECRET_KEY = b"super-secret-institute-key"


class LoginRequest(BaseModel):
    username: str
    password: str

class MFAVerifyRequest(BaseModel):
    user_id: str
    totp_code: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    requires_mfa: bool = False

def get_client_info(request: Request) -> Tuple[str, str]:
    ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    return ip, user_agent

def _cookie_settings() -> dict:
    secure = settings.ENV != "development"
    return {
        "httponly_refresh": True,
        "secure": secure,
        "samesite": "none" if secure else "lax",
        "path": "/",
        "max_age": 7 * 24 * 60 * 60,
    }

async def get_current_user_dependency(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")
    return user

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.email == user_data.email)
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already in use"
        )
    password_to_use = user_data.password if user_data.password else generate_temporary_password()
    new_user = User(
        id=generate_uuid(),
        username=user_data.username,
        email=user_data.email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=user_data.role,
        is_active=True
    )
    new_user.set_password(password_to_use)
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    await email_service.send_welcome_email(
        to_email=new_user.email,
        username=new_user.username,
        temporary_password=password_to_use,
        first_name=new_user.first_name or "User"
    )
    await audit_service.create_audit_log(
        db=db,
        user=None,
        action="USER_CREATED",
        entity_type="user",
        details=f"New user created: {new_user.email}",
        ip_address=audit_service.get_client_ip(request)
    )
    return new_user

@router.post("/validate-email")
async def validate_email(
    email_data: EmailValidation,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.email == email_data.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact administrator"
        )
    if user.locked_until and datetime.utcnow() < user.locked_until:
        wait_minutes = max(
            1,
            int((user.locked_until - datetime.utcnow()).total_seconds() / 60)
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account is temporarily locked due to multiple failed login attempts. Try again in {wait_minutes} minute(s)."
        )
    return {
        "valid": True,
        "message": "Email is valid",
        "email": user.email,
        "requires2FA": user.two_factor_auth
    }

@router.post("/login", response_model=Union[LoginResponse, TwoFactorRequiredResponse])
async def login(
    user_credentials: UserLogin,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    client_ip = audit_service.get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")
    device_metadata = parse_device_info(user_agent)
    stmt = select(User).where(User.email == user_credentials.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        await audit_service.create_audit_log(
            db=db,
            user=None,
            action="LOGIN_FAILED",
            entity_type="auth",
            details="Invalid email or inactive account",
            ip_address=client_ip,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    if user.locked_until and datetime.utcnow() < user.locked_until:
        wait_minutes = max(
            1,
            int((user.locked_until - datetime.utcnow()).total_seconds() / 60)
        )
        await audit_service.create_audit_log(
            db=db,
            user=user,
            action="LOGIN_LOCKED",
            entity_type="auth",
            details=f"Account locked. Retry after {wait_minutes} minute(s).",
            ip_address=client_ip,
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Try again in {wait_minutes} minute(s).",
            headers={"locked": "true"}
        )
    if not user.verify_password(user_credentials.password):
        user.failed_attempts += 1
        if user.failed_attempts >= 5:
            user.locked_until = datetime.utcnow() + timedelta(minutes=15)
        await db.commit()
        await audit_service.create_audit_log(
            db=db,
            user=user,
            action="LOGIN_FAILED",
            entity_type="auth",
            details="Invalid password",
            ip_address=client_ip,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    user.failed_attempts = 0
    user.locked_until = None
    if user.password_changed_at is None:
        days_since_creation = (datetime.utcnow() - user.created_at).days
        if days_since_creation >= 5:
            await audit_service.create_audit_log(
                db=db,
                user=user,
                action="LOGIN_BLOCKED_PASSWORD_EXPIRED",
                entity_type="auth",
                details="New user blocked: password not changed within 5-day grace period",
                ip_address=client_ip,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your password has expired. Please reset your password to continue.",
                headers={"error_code": "PASSWORD_EXPIRED"}
            )
    if user.is_password_expired():
        await audit_service.create_audit_log(
            db=db,
            user=user,
            action="LOGIN_BLOCKED_PASSWORD_EXPIRED",
            entity_type="auth",
            details="Password has expired",
            ip_address=client_ip,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your password has expired. Please reset your password to continue.",
            headers={"error_code": "PASSWORD_EXPIRED"}
        )
    existing_session = await session_service.check_device_conflict(
        db, str(user.id), device_metadata["device_id"]
    )
    if existing_session:
        await audit_service.create_audit_log(
            db=db,
            user=user,
            action="LOGIN_BLOCKED_MULTI_DEVICE",
            entity_type="auth",
            details=f"Login blocked: User already logged in from {existing_session.device_name} ({existing_session.ip_address})",
            ip_address=client_ip,
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already logged in from another device. Please logout first to continue.",
            headers={"error_code": "MULTI_DEVICE_LOGIN"}
        )
    if user.two_factor_auth:
        code = f"{secrets.randbelow(900000) + 100000:06d}"
        expires = datetime.utcnow() + timedelta(
            minutes=settings.TWO_FACTOR_CODE_EXPIRATION_MINUTES
        )
        user.two_factor_code = code
        user.two_factor_code_expires = expires
        await db.commit()
        await email_service.send_two_factor_code(user.email, code)
        await audit_service.create_audit_log(
            db=db,
            user=user,
            action="TWO_FACTOR_INITIATED",
            entity_type="auth",
            details="2FA code sent via email",
            ip_address=client_ip,
        )
        return TwoFactorRequiredResponse(
            requires2FA=True,
            message="2FA code sent to your email",
            email=user.email
        )
    user.last_login = datetime.utcnow()
    await db.commit()
    await db.refresh(user)

    access_token = create_access_token(data={"id": str(user.id), "role": user.role.value})
    refresh_token = create_refresh_token(data={"id": str(user.id), "role": user.role.value})
    csrf_token = generate_csrf_token()

    refresh_token_record = RefreshToken(
        id=generate_uuid(),
        user_id=str(user.id),
        token_hash=hash_token(refresh_token),
        issued_at=datetime.now(ZoneInfo("UTC")),
        expires_at=datetime.now(ZoneInfo("UTC")) + timedelta(days=7),  # 7-day refresh token lifetime
        revoked=False,
        device_info=device_metadata
    )
    db.add(refresh_token_record)
    await db.commit()

    existing_device_session = await session_service.get_session_by_device(
        db,
        str(user.id),
        device_metadata["device_id"]
    )
    if existing_device_session:
        session = await session_service.reuse_session(
            db=db,
            session=existing_device_session,
            access_token=access_token,
            refresh_token=refresh_token,
            session_timeout_minutes=user.session_timeout
        )
        action_detail = f"Session reused for {device_metadata['device_name']}"
    else:
        session = await session_service.create_session(
            db=db,
            user_id=str(user.id),
            access_token=access_token,
            refresh_token=refresh_token,
            device_metadata=device_metadata,
            ip_address=client_ip,
            user_agent=user_agent,
            session_timeout_minutes=user.session_timeout
        )
        action_detail = f"New session created for {device_metadata['device_name']}"

    await audit_service.create_audit_log(
        db=db,
        user=user,
        action="LOGIN_SUCCESS",
        entity_type="auth",
        details=action_detail,
        ip_address=client_ip,
    )
    user_data = UserResponse.model_validate(user).model_dump()
    response_data = {
        "user": user_data,
        "csrf_token": csrf_token,
        "session_id": str(session.id),
        "expiresAt": session.expires_at.isoformat(),
        "message": "Login successful"
    }
    set_auth_cookies(response, access_token, refresh_token)
    set_csrf_cookie(response, csrf_token)
    return response_data

@router.post("/2fa/verify")
async def verify_2fa(
    verification_data: TwoFactorVerify,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.email == verification_data.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired 2FA code"
        )

    async def build_login_response(audit_action: str, audit_details: str | None = None):
        user.last_login = datetime.utcnow()
        await db.commit()
        await db.refresh(user)
        access_token = create_access_token(
            data={"id": str(user.id), "role": user.role.value}
        )
        refresh_token = create_refresh_token(
            data={"id": str(user.id), "role": user.role.value}
        )
        csrf_token = generate_csrf_token()

        user_agent = request.headers.get("user-agent", "")
        device_metadata = parse_device_info(user_agent)
        client_ip = audit_service.get_client_ip(request)

        refresh_token_record = RefreshToken(
            id=generate_uuid(),
            user_id=str(user.id),
            token_hash=hash_token(refresh_token),
            issued_at=datetime.now(ZoneInfo("UTC")),
            expires_at=datetime.now(ZoneInfo("UTC")) + timedelta(days=7),
            revoked=False,
            device_info=device_metadata
        )
        db.add(refresh_token_record)
        await db.commit()

        session = await session_service.create_session(
            db=db,
            user_id=str(user.id),
            access_token=access_token,
            refresh_token=refresh_token,
            device_metadata=device_metadata,
            ip_address=client_ip,
            user_agent=user_agent,
            session_timeout_minutes=user.session_timeout
        )

        await audit_service.create_audit_log(
            db=db,
            user=user,
            action=audit_action,
            entity_type="auth",
            details=audit_details or "2FA verification successful",
            ip_address=client_ip
        )
        user_data = UserResponse.model_validate(user).model_dump(mode="json")
        response_data = {
            "user": user_data,
            "csrf_token": csrf_token,
            "session_id": str(session.id),
            "expiresAt": session.expires_at.isoformat(),
            "message": "2FA verification successful"
        }
        json_response = JSONResponse(content=response_data)
        set_auth_cookies(json_response, access_token, refresh_token)
        set_csrf_cookie(json_response, csrf_token)
        return json_response

    if (
        user.two_factor_code and
        user.two_factor_code_expires and
        user.two_factor_code == verification_data.code and
        datetime.utcnow() <= user.two_factor_code_expires
    ):
        user.two_factor_code = None
        user.two_factor_code_expires = None
        return await build_login_response(audit_action="2fa-verify")
    stmt = select(DeviceOTP).where(
        DeviceOTP.user_id == str(user.id),
        DeviceOTP.is_active == True
    )
    result = await db.execute(stmt)
    otp_devices = result.scalars().all()
    for device in otp_devices:
        if custom_otp_service.verify_otp(
            str(device.device_id), str(device.encrypted_secret), verification_data.code
        ):
            setattr(device, "last_used", datetime.utcnow())
            return await build_login_response(
                audit_action="OTP_LOGIN_SUCCESS",
                audit_details=f"OTP login successful via device '{device.device_name}'"
            )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired 2FA code"
    )

@router.post("/2fa/send-email-code")
async def send_2fa_email_code(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    code = f"{secrets.randbelow(900000) + 100000:06d}"
    expires = datetime.utcnow() + timedelta(minutes=settings.TWO_FACTOR_CODE_EXPIRATION_MINUTES)
    current_user.two_factor_code = code
    current_user.two_factor_code_expires = expires
    await db.commit()
    await email_service.send_two_factor_code(current_user.email, code)
    return {"message": "Verification code sent to your email"}

@router.post("/2fa/verify-setup")
async def verify_2fa_setup(
    setup_data: TwoFactorVerifySetup,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if setup_data.method == "email":
        if (not current_user.two_factor_code or
            not current_user.two_factor_code_expires or
            current_user.two_factor_code != setup_data.code or
            datetime.utcnow() > current_user.two_factor_code_expires):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification code"
            )
        current_user.two_factor_code = None
        current_user.two_factor_code_expires = None
    elif setup_data.method == "authenticator":
        if not current_user.two_factor_secret or not setup_data.secret:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid setup data"
            )
        totp = pyotp.TOTP(setup_data.secret)
        if not totp.verify(setup_data.code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code"
            )
        current_user.two_factor_secret = setup_data.secret
    current_user.two_factor_auth = True
    await db.commit()
    return {"message": "Two-factor authentication enabled successfully"}

@router.post("/2fa/disable")
async def disable_2fa(
    disable_data: TwoFactorDisableRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if disable_data.password and not current_user.verify_password(disable_data.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password"
        )
    current_user.two_factor_auth = False
    current_user.two_factor_secret = None
    current_user.two_factor_code = None
    current_user.two_factor_code_expires = None
    await db.commit()
    return {"message": "Two-factor authentication disabled successfully"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get the latest active session for this user
    stmt = select(UserSession).where(
        UserSession.user_id == str(current_user.id),
        UserSession.is_active == True
    ).order_by(UserSession.last_activity.desc())
    result = await db.execute(stmt)
    session = result.scalars().first()  # take the most recent active session

    # Convert DB model to Pydantic
    user_data = UserResponse.model_validate(current_user)

    if session:
        user_data.session_metadata = SessionMetadata(
            session_id=str(session.id),
            expires_at=session.expires_at,
            device_name=session.device_name,
            last_activity=session.last_activity,
        )

    return user_data

@router.post("/refresh")
async def refresh_token_endpoint(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """
    Refresh access token using valid refresh token from HTTP-only cookie.

    Flow:
    1. Extract refresh token from secure HTTP-only cookie
    2. Verify JWT signature and expiration
    3. Validate against RefreshToken record in database (not revoked)
    4. Validate UserSession is still active and not expired
    5. Generate new access token (and optionally rotate refresh token)
    6. Update session with new tokens
    7. Set new tokens in response cookies

    Security measures:
    - HTTP-only cookies prevent XSS token theft
    - Token hashing in database (SHA-256)
    - Session-level validation
    - Audit logging of refresh events
    - Token rotation support for defense-in-depth
    """
    UTC = ZoneInfo("UTC")
    client_ip = audit_service.get_client_ip(request)

    print("[v0] Backend refresh_token_endpoint() called")
    print(f"[v0] Client IP: {client_ip}")

    # 1. Extract refresh token from secure cookie
    refresh_token_str = get_refresh_token_from_cookie(request)
    if not refresh_token_str:
        print("[v0] No refresh token in cookie")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token provided"
        )

    print("[v0] Refresh token extracted from cookie")

    # 2. Decode and verify refresh token JWT
    try:
        payload = verify_token(refresh_token_str)
        print(f"[v0] Token verified successfully, payload type: {payload.get('type')}")
    except HTTPException as e:
        print(f"[v0] Token verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    # Verify it's a refresh token (not an access token)
    if payload.get("type") != "refresh":
        print(f"[v0] Invalid token type: {payload.get('type')}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )

    user_id = payload.get("id")
    if not user_id:
        print("[v0] No user_id in token payload")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )

    # 3. Hash token and validate against database RefreshToken record
    token_hash = hash_token(refresh_token_str)
    now_utc = datetime.now(UTC)

    print(f"[v0] Querying RefreshToken with user_id={user_id}")

    # Query RefreshToken model for this token
    stmt = select(RefreshToken).where(
        and_(
            RefreshToken.user_id == user_id,
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked == False,
            RefreshToken.expires_at > now_utc
        )
    )
    result = await db.execute(stmt)
    refresh_record = result.scalar_one_or_none()

    if not refresh_record:
        print("[v0] RefreshToken record NOT found in database")
        # Token not found, revoked, or expired
        await audit_service.create_audit_log(
            db=db,
            user=None,
            action="TOKEN_REFRESH_FAILED_INVALID_TOKEN",
            entity_type="auth",
            details=f"Refresh token validation failed for user_id: {user_id}",
            ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked refresh token"
        )

    print("[v0] RefreshToken record found in database")

    # 4. Validate UserSession is still active
    session_id = request.headers.get("X-Session-Id")
    if not session_id:
        print("[v0] No X-Session-Id header provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session ID required in X-Session-Id header"
        )

    session = await session_service.get_session_by_id(db, session_id)

    if not session or not session.is_active or session.expires_at <= now_utc:
        print(f"[v0] Session validation failed - session: {session is not None}, is_active: {session.is_active if session else 'N/A'}, expired: {session.expires_at <= now_utc if session else 'N/A'}")
        await audit_service.create_audit_log(
            db=db,
            user=None,
            action="TOKEN_REFRESH_FAILED_INVALID_SESSION",
            entity_type="auth",
            details=f"Session validation failed for user_id: {user_id}, session_id: {session_id}",
            ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid"
        )

    # 5. Fetch user and create new access token
    user = await db.get(User, user_id)
    if not user or not user.is_active:
        print(f"[v0] User invalid - user exists: {user is not None}, is_active: {user.is_active if user else 'N/A'}")
        await audit_service.create_audit_log(
            db=db,
            user=None,
            action="TOKEN_REFRESH_FAILED_USER_INACTIVE",
            entity_type="auth",
            details=f"User inactive or not found: {user_id}",
            ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive"
        )

    # Create new access token
    new_access_token = create_access_token(
        data={"id": str(user.id), "role": user.role.value}
    )

    # Reuse the existing refresh token (no rotation)
    new_refresh_token = refresh_token_str

    print("[v0] Creating new access token and updating session")

    # 6. Update session with new access token
    await session_service.reuse_session(
        db=db,
        session=session,
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        session_timeout_minutes=user.session_timeout
    )

    # 7. Set new tokens in response cookies
    set_auth_cookies(response, new_access_token, new_refresh_token)

    # Log successful token refresh
    await audit_service.create_audit_log(
        db=db,
        user=user,
        action="TOKEN_REFRESHED",
        entity_type="auth",
        details=f"Access token refreshed for session {session_id}",
        ip_address=client_ip
    )

    print("[v0] Token refresh successful")

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "session_id": str(session.id)
    }


#===========================================================
##############    refresh endpoint here   ==================
#===========================================================

@router.post("/forgot-password")
async def forgot_password(
    forgot_data: ForgotPassword,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.email == forgot_data.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    reset_token = secrets.token_urlsafe(32)
    reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
    user.reset_token = reset_token
    user.reset_token_expiry = reset_token_expiry
    await db.commit()
    await email_service.send_password_reset(user.email, reset_token)
    await audit_service.create_audit_log(
        db=db,
        user=user,
        action="forgot_password",
        entity_type="auth",
        details="Password reset email sent",
        ip_address=audit_service.get_client_ip(request)
    )
    return {"message": "Password reset email sent"}

@router.post("/reset-password")
async def reset_password(
    reset_data: PasswordReset,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    if not reset_data.token or not reset_data.newPassword:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token and new password are required"
        )
    stmt = select(User).where(
        User.reset_token == reset_data.token,
        User.reset_token_expiry > datetime.utcnow()
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    user.set_password(reset_data.newPassword)
    user.reset_token = None
    user.reset_token_expiry = None
    user.password_changed_at = datetime.utcnow()
    user.requires_password_change = False
    user.password_expiration = datetime.utcnow() + timedelta(days=90)
    await db.commit()
    await audit_service.create_audit_log(
        db=db,
        user=user,
        action="reset_password",
        entity_type="auth",
        details="Password reset successful",
        ip_address=audit_service.get_client_ip(request)
    )
    return {"message": "Password reset successful"}

@router.post("/change-password")
async def change_password(
    request: Request,
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    client_ip = audit_service.get_client_ip(request) or "unknown"
    if not current_user.verify_password(password_data.current_password):
        await audit_service.create_audit_log(
            db=db,
            user=current_user,
            action="password_change_failed",
            entity_type="auth",
            details="Invalid current password",
            ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    if current_user.verify_password(password_data.new_password):
        await audit_service.create_audit_log(
            db=db,
            user=current_user,
            action="password_change_failed",
            entity_type="auth",
            details="New password same as current",
            ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be the same as current password"
        )
    if current_user.previous_password_hash and not current_user.can_use_new_password(password_data.new_password):
        await audit_service.create_audit_log(
            db=db,
            user=current_user,
            action="password_change_failed",
            entity_type="auth",
            details="Attempted to reuse previous password",
            ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot reuse your previous password. Please choose a different password."
        )
    current_user.previous_password_hash = current_user.password_hash
    current_user.set_password(password_data.new_password)
    current_user.password_changed_at = datetime.utcnow()
    current_user.requires_password_change = False
    current_user.password_expiration = datetime.utcnow() + timedelta(days=90)
    await db.commit()
    await audit_service.create_audit_log(
        db=db,
        user=current_user,
        action="password_changed",
        entity_type="auth",
        details="Password successfully changed",
        ip_address=client_ip
    )
    return {"message": "Password updated successfully"}

@router.post("/secure-password-change/initiate")
async def initiate_secure_password_change(
    request_data: SecurePasswordChangeRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).where(User.email == request_data.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        return {"message": "If this email exists, an OTP will be sent to it"}
    otp_code = str(random.randint(100000, 999999))
    redis_conn = await redis_client.get_client()
    cache_key = f"password_change_otp:{user.id}"
    await redis_conn.setex(cache_key, 600, otp_code)
    print(f"[v0] Preparing to send password change OTP email to {user.email}")
    print(f"[v0] OTP Code: {otp_code}")
    print(f"[v0] User first name: {user.first_name or 'User'}")
    try:
        email_sent = await email_service.send_password_change_otp(
            user.email, user.first_name or "User", otp_code
        )
        print(f"[v0] Email send result: {email_sent}")
        if not email_sent:
            print("[v0] ERROR: Email service returned False - check SMTP configuration")
            raise HTTPException(status_code=500, detail="Failed to send OTP email - SMTP issue")
    except Exception as e:
        print(f"[v0] Exception while sending OTP email: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to send OTP email: {str(e)}")
    await audit_service.create_audit_log(
        db=db,
        user=user,
        action="PASSWORD_CHANGE_INITIATED",
        entity_type="user",
        details="Secure password change initiated - OTP sent",
        ip_address=audit_service.get_client_ip(request),
    )
    return {"message": "OTP sent to your email"}

@router.post("/secure-password-change/verify")
async def verify_and_change_password(
    verify_data: SecurePasswordChangeVerify,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).where(User.email == verify_data.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or OTP")
    redis_conn = await redis_client.get_client()
    cache_key = f"password_change_otp:{user.id}"
    stored_otp = await redis_conn.get(cache_key)
    if not stored_otp or stored_otp != verify_data.otp:
        await audit_service.create_audit_log(
            db=db,
            user=user,
            action="PASSWORD_CHANGE_OTP_FAILED",
            entity_type="user",
            details="Invalid OTP provided for password change",
            ip_address=audit_service.get_client_ip(request),
        )
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")
    user.set_password(verify_data.new_password)
    user.password_changed_at = datetime.utcnow()
    user.password_expiration = datetime.utcnow() + timedelta(days=90)
    user.requires_password_change = False
    db.add(user)
    await db.commit()
    await redis_conn.delete(cache_key)
    await audit_service.create_audit_log(
        db=db,
        user=user,
        action="PASSWORD_CHANGED_SECURE",
        entity_type="user",
        details="Password changed via secure OTP flow",
        ip_address=audit_service.get_client_ip(request),
    )
    return {"message": "Password changed successfully. Please login with your new password."}

@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    print("[v0] Backend logout endpoint called for user:", current_user.id)
    session_id = request.headers.get("X-Session-Id")
    if session_id:
        invalidated = await session_service.invalidate_current_session(
            db,
            str(current_user.id),
            session_id
        )
        print(f"[v0] Invalidated session {session_id} for user {current_user.id}: {invalidated}")
    else:
        print(f"[v0] Warning: No session_id in logout request for user {current_user.id}")
    await audit_service.create_audit_log(
        db=db,
        user=current_user,
        action="logout",
        entity_type="auth",
        ip_address=audit_service.get_client_ip(request),
        user_agent=request.headers.get("user-agent")
    )
    response = JSONResponse({"message": "Logged out successfully"})
    clear_auth_cookies(response)
    response.delete_cookie("csrf_token", path="/", samesite="strict")
    response.delete_cookie("session_id", path="/", samesite="strict")
    print("[v0] Backend logout - cookies cleared")
    return response

@router.post("/2fa/generate-qr", response_model=TwoFactorQRResponse)
async def generate_2fa_qr(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    secret = secrets.token_urlsafe(32)
    qr_payload = {
        "userId": str(current_user.id),
        "secret": secret,
        "instituteSalt": "institute-only-salt"
    }
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(json.dumps(qr_payload))
    qr.make(fit=True)
    img: PILImage = qr.make_image(fill_color="black", back_color="white").get_image()
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
    current_user.two_factor_secret = secret
    await db.commit()
    backup_codes = [generate_custom_otp(secret, i) for i in range(8)]
    return TwoFactorQRResponse(
        qr_code=f"data:image/png;base64,{qr_code_base64}",
        secret=secret,
        backup_codes=backup_codes
    )

def generate_custom_otp(secret: str, counter: int) -> str:
    key = hmac.new(b"institute-only-salt", secret.encode(), hashlib.sha256).digest()
    counter_bytes = counter.to_bytes(8, 'big')
    hmac_hash = hmac.new(key, counter_bytes, hashlib.sha256).digest()
    otp = str(int.from_bytes(hmac_hash[:4], 'big') % 1000000).zfill(6)
    return otp

@router.get("/sessions/active")
async def get_active_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.ADMIN:
        sessions = await session_service.get_active_sessions(db, str(current_user.id))
    else:
        from datetime import datetime
        from zoneinfo import ZoneInfo
        UTC = ZoneInfo("UTC")
        now_utc = datetime.now(UTC)
        stmt = select(UserSession).where(
            and_(
                UserSession.is_active == True,
                UserSession.expires_at > now_utc,
            )
        ).options(selectinload(UserSession.user))
        result = await db.execute(stmt)
        sessions = result.scalars().all()
    return {
        "sessions": [
            {
                "id": str(session.id),
                "userId": str(session.user_id),
                "username": session.user.username if session.user else "Unknown",
                "email": session.user.email if session.user else "Unknown",
                "deviceName": session.device_name,
                "ipAddress": session.ip_address,
                "userAgent": session.user_agent,
                "createdAt": session.created_at.isoformat(),
                "expiresAt": session.expires_at.isoformat(),
                "isActive": session.is_active,
                "deviceId": session.device_id,
            }
            for session in sessions
        ],
        "totalActive": len(sessions)
    }

@router.get("/sessions/current")
async def get_current_session(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    session_id = request.headers.get("X-Session-Id")
    if session_id:
        session = await session_service.get_session_by_id(db, session_id)
        if session:
            return {
                "id": str(session.id),
                "userId": str(session.user_id),
                "username": current_user.username,
                "deviceName": session.device_name,
                "ipAddress": session.ip_address,
                "createdAt": session.created_at.isoformat(),
                "expiresAt": session.expires_at.isoformat(),
                "isActive": session.is_active,
            }
    sessions = await session_service.get_active_sessions(db, str(current_user.id))
    if sessions:
        session = sessions[0]
        return {
            "id": str(session.id),
            "userId": str(session.user_id),
            "username": current_user.username,
            "deviceName": session.device_name,
            "ipAddress": session.ip_address,
            "createdAt": session.created_at.isoformat(),
            "expiresAt": session.expires_at.isoformat(),
            "isActive": session.is_active,
        }
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="No active session found"
    )

@router.post("/sessions/{session_id}/terminate")
async def terminate_session(
    session_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    session = await session_service.get_session_by_id(db, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    if current_user.role != UserRole.ADMIN and str(session.user_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only terminate your own sessions"
        )
    await session_service.invalidate_session(db, session_id)
    await audit_service.create_audit_log(
        db=db,
        user=current_user,
        action="SESSION_TERMINATED",
        entity_type="session",
        details=f"Session {session_id} for user {session.user_id} terminated",
        ip_address=audit_service.get_client_ip(request)
    )
    return {"message": f"Session {session_id} terminated successfully"}

@router.post("/session/activity")
async def sync_activity(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from datetime import datetime, timedelta
    from zoneinfo import ZoneInfo
    UTC = ZoneInfo("UTC")
    try:
        body = await request.json()
        activity_detected = body.get("activity_detected", False)
    except:
        activity_detected = False
    session_id = request.headers.get("X-Session-Id")
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No session ID provided"
        )
    session = await session_service.get_session_by_id(db, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session not found"
        )
    now_utc = datetime.now(UTC)
    time_until_expiry = (session.expires_at - now_utc).total_seconds()
    if time_until_expiry <= 0:
        time_since_activity = (now_utc - session.last_activity).total_seconds()
        inactivity_threshold = current_user.session_timeout * 60
        if time_since_activity > inactivity_threshold:
            await audit_service.create_audit_log(
                db=db,
                user=current_user,
                action="SESSION_EXPIRED_INACTIVITY",
                entity_type="session",
                details=f"Session expired due to inactivity ({time_since_activity/60:.1f} minutes)",
                ip_address=audit_service.get_client_ip(request)
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired due to inactivity"
            )
    if activity_detected or time_until_expiry <= 5 * 60:
        session.update_activity()
        new_expiry = now_utc + timedelta(minutes=current_user.session_timeout)
        session.expires_at = new_expiry
        await db.commit()
        await audit_service.create_audit_log(
            db=db,
            user=current_user,
            action="SESSION_EXTENDED",
            entity_type="session",
            details=f"Session extended due to activity (new expiry: {new_expiry.isoformat()})",
            ip_address=audit_service.get_client_ip(request)
        )
        return {
            "message": "Session extended",
            "session_extended": True,
            "new_expiry": new_expiry.isoformat(),
            "inactivity_minutes": current_user.session_timeout
        }
    else:
        session.update_activity()
        await db.commit()
        return {
            "message": "Activity recorded",
            "session_extended": False,
            "time_until_expiry": int(time_until_expiry)
        }
