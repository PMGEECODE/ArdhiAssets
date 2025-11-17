# app/core/security.py
from __future__ import annotations

import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from jose import jwt, JWTError
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from cryptography.fernet import Fernet, InvalidToken
from zoneinfo import ZoneInfo
from fastapi import HTTPException, status, Request, Response

from .config import settings


UTC = ZoneInfo("UTC")

# ----------------------------------------------------------------------
# Argon2 Hasher (Production-Secure)
# ----------------------------------------------------------------------
ph = PasswordHasher(
    time_cost=settings.ARGON2_TIME_COST,
    memory_cost=settings.ARGON2_MEMORY_COST,
    parallelism=settings.ARGON2_PARALLELISM,
    hash_len=32,
    salt_len=16,
)


# ----------------------------------------------------------------------
# Fernet Encryption (MFA Secrets & Backup Codes)
# ----------------------------------------------------------------------
# Extract raw key from SecretStr
encryption_key = settings.ENCRYPTION_KEY.get_secret_value()
if not encryption_key:
    raise RuntimeError("ENCRYPTION_KEY must be set in production")

fernet = Fernet(encryption_key)  # FIXED


# ----------------------------------------------------------------------
# Password Hashing
# ----------------------------------------------------------------------
def hash_password(password: str) -> str:
    """Hash password using Argon2id with automatic rehash detection."""
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password and trigger rehash if parameters changed."""
    try:
        ph.verify(hashed_password, plain_password)
        return True
    except (VerifyMismatchError, InvalidHashError):
        return False


def needs_rehash(hashed_password: str) -> bool:
    """Check if password hash needs upgrade."""
    return ph.check_needs_rehash(hashed_password)


def get_token_from_cookie(request: Request) -> Optional[str]:
    """Retrieve access token from cookie"""
    return request.cookies.get("access_token")

def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Set HTTP-only authentication cookies"""
    secure = settings.ENV != "development"
    samesite = "none" if secure else "lax"
    
    response.set_cookie(
        "access_token",
        access_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/",
        max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    response.set_cookie(
        "refresh_token",
        refresh_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/",
        max_age=7 * 24 * 60 * 60
    )


def clear_auth_cookies(response: Response) -> None:
    """Clear HTTP-only authentication cookies"""
    response.delete_cookie("access_token", path="/", samesite="strict")
    response.delete_cookie("refresh_token", path="/", samesite="strict")


def set_csrf_cookie(response: Response, csrf_token: str) -> None:
    """Set CSRF token cookie"""
    secure = settings.ENV != "development"
    samesite = "none" if secure else "lax"
    
    response.set_cookie(
        "csrf_token",
        csrf_token,
        httponly=False,
        secure=secure,
        samesite=samesite,
        path="/",
        max_age=3600
    )


# def get_refresh_token_from_cookie(request: Request) -> Optional[str]:
#     """Retrieve refresh token from HTTP-only cookie"""
#     return request.cookies.get("refresh_token")

def get_refresh_token_from_cookie(request: Request) -> Optional[str]:
    """Retrieve refresh token from HTTP-only cookie"""
    token = request.cookies.get("refresh_token")
    print(f"\n===========================================\n[DEBUG] Cookies received=====================================\n\n: {request.cookies}")
    print(f"[DEBUG] Refresh token retrieved: {'YES' if token else 'NO'}")
    return token

# ----------------------------------------------------------------------
# JWT Access Tokens (RSA or HS256)
# ----------------------------------------------------------------------
def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create JWT access token with JTI and type."""
    to_encode = data.copy()
    now = datetime.now(UTC)

    expire = now + (expires_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES))

    to_encode.update({
        "exp": expire,
        "iat": now,
        "nbf": now,
        "jti": secrets.token_urlsafe(32),
    })
    
    # Only set default type if not provided
    if "type" not in to_encode:
        to_encode["type"] = "access"

    if settings.jwt_private_key:
        return jwt.encode(
            to_encode,
            settings.jwt_private_key,
            algorithm=settings.JWT_ALGORITHM
        )
    else:
        # Also use .get_secret_value() for HS256 fallback
        return jwt.encode(
            to_encode,
            settings.REFRESH_TOKEN_SIGNING_KEY.get_secret_value(),
            algorithm="HS256"
        )


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate access token."""
    try:
        if settings.jwt_public_key:
            payload = jwt.decode(
                token,
                settings.jwt_public_key,
                algorithms=[settings.JWT_ALGORITHM]
            )
        else:
            payload = jwt.decode(
                token,
                settings.REFRESH_TOKEN_SIGNING_KEY.get_secret_value(),
                algorithms=["HS256"]
            )

        if payload.get("type") != "access":
            return None

        return payload
    except JWTError:
        return None


# ----------------------------------------------------------------------
# Refresh Tokens (Secure Random + SHA-256 Hash)
# ----------------------------------------------------------------------
def create_refresh_token(data: Optional[Dict[str, Any]] = None) -> str:
    """Generate JWT refresh token with user data."""
    to_encode = data.copy() if data else {}
    now = datetime.now(UTC)
    
    expire = now + timedelta(days=7)
    
    to_encode.update({
        "exp": expire,
        "iat": now,
        "nbf": now,
        "jti": secrets.token_urlsafe(32),
        "type": "refresh"  # add type field so verify_token can identify it
    })
    
    if settings.jwt_private_key:
        return jwt.encode(
            to_encode,
            settings.jwt_private_key,
            algorithm=settings.JWT_ALGORITHM
        )
    else:
        return jwt.encode(
            to_encode,
            settings.REFRESH_TOKEN_SIGNING_KEY.get_secret_value(),
            algorithm="HS256"
        )


def hash_token(token: str) -> str:
    """Hash token using SHA-256 (constant-time safe for storage)."""
    return hashlib.sha256(token.encode()).hexdigest()


# ----------------------------------------------------------------------
# CSRF Protection
# ----------------------------------------------------------------------
def create_csrf_token() -> str:
    """Generate CSRF token."""
    return secrets.token_urlsafe(32)


def generate_csrf_token() -> str:
    """Generate CSRF token (alias for create_csrf_token)."""
    return create_csrf_token()


def verify_csrf_token(token: str, expected: str) -> bool:
    """Constant-time comparison."""
    return secrets.compare_digest(token.encode(), expected.encode())


# ----------------------------------------------------------------------
# TOTP & MFA Secrets
# ----------------------------------------------------------------------
def generate_totp_secret() -> str:
    """Generate base32 TOTP secret (32 bytes → 256 bits)."""
    return secrets.token_urlsafe(32)


def encrypt_secret(secret: str) -> str:
    """Encrypt secret using Fernet (AES-128 in CBC mode with HMAC)."""
    return fernet.encrypt(secret.encode()).decode()


def decrypt_secret(encrypted: str) -> str:
    """Decrypt secret. Raises on tamper/invalid."""
    try:
        return fernet.decrypt(encrypted.encode()).decode()
    except InvalidToken as exc:
        raise ValueError("Invalid or tampered encrypted secret") from exc


# ----------------------------------------------------------------------
# Backup Codes
# ----------------------------------------------------------------------
def generate_backup_codes(count: int = 10) -> list[str]:
    """Generate one-time backup codes (8 chars, uppercase hex)."""
    return [secrets.token_hex(4).upper() for _ in range(count)]


def hash_backup_code(code: str) -> str:
    """Hash backup code for storage."""
    return hashlib.sha256(code.encode()).hexdigest()


def verify_backup_code(plain: str, hashed: str) -> bool:
    """Verify backup code (constant-time)."""
    return secrets.compare_digest(hash_backup_code(plain), hashed)


# ----------------------------------------------------------------------
# Password Strength Validation (Strict)
# ----------------------------------------------------------------------
def validate_password_strength(password: str) -> Tuple[bool, str]:
    """Enforce strong password policy."""
    if len(password) < 12:
        return False, "Password must be at least 12 characters"

    if not (
        any(c.isupper() for c in password) and
        any(c.islower() for c in password) and
        any(c.isdigit() for c in password) and
        any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)
    ):
        return False, "Must contain uppercase, lowercase, digit, and special char"

    # Block common patterns
    lowered = password.lower()
    if any(p in lowered for p in [
        "password", "admin", "123456", "qwerty", "letmein", "welcome"
    ]):
        return False, "Password contains common pattern"

    # Block keyboard walks
    walks = ["qwerty", "asdfg", "zxcvb", "12345", "54321"]
    if any(w in lowered for w in walks):
        return False, "Avoid keyboard patterns"

    return True, "Password is strong"

def verify_token(token: str) -> dict:
    """Decode and verify JWT token"""
    try:
        # If RS256 is configured, use the public key; otherwise use HS256 with signing key
        if settings.jwt_public_key:
            return jwt.decode(
                token,
                settings.jwt_public_key,
                algorithms=[settings.JWT_ALGORITHM]
            )
        else:
            return jwt.decode(
                token,
                settings.REFRESH_TOKEN_SIGNING_KEY.get_secret_value(),
                algorithms=["HS256"]
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )


def get_password_hash(password: str) -> str:
    """Hash new password securely"""
    return hash_password(password)
