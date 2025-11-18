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
# Argon2 Hasher
# ----------------------------------------------------------------------
ph = PasswordHasher(
    time_cost=settings.ARGON2_TIME_COST,
    memory_cost=settings.ARGON2_MEMORY_COST,
    parallelism=settings.ARGON2_PARALLELISM,
    hash_len=32,
    salt_len=16,
)

# ----------------------------------------------------------------------
# Fernet Encryption (MFA secrets, backup codes)
# ----------------------------------------------------------------------
encryption_key = settings.ENCRYPTION_KEY.get_secret_value()
if not encryption_key:
    raise RuntimeError("ENCRYPTION_KEY must be set")

fernet = Fernet(encryption_key)

# ----------------------------------------------------------------------
# Password Hashing
# ----------------------------------------------------------------------
def hash_password(password: str) -> str:
    return ph.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        ph.verify(hashed_password, plain_password)
        return True
    except (VerifyMismatchError, InvalidHashError):
        return False

def needs_rehash(hashed_password: str) -> bool:
    return ph.check_needs_rehash(hashed_password)

# ----------------------------------------------------------------------
# Cookie Helpers
# ----------------------------------------------------------------------
def get_token_from_cookie(request: Request) -> Optional[str]:
    return request.cookies.get("access_token")

def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    secure = settings.ENV != "development"
    samesite = "none" if secure else "lax"

    response.set_cookie(
        "access_token",
        access_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/",
        max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    response.set_cookie(
        "refresh_token",
        refresh_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/",
        max_age=7 * 24 * 60 * 60,
    )

def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/", samesite="strict")
    response.delete_cookie("refresh_token", path="/", samesite="strict")

def set_csrf_cookie(response: Response, csrf_token: str) -> None:
    secure = settings.ENV != "development"
    samesite = "none" if secure else "lax"

    response.set_cookie(
        "csrf_token",
        csrf_token,
        httponly=False,
        secure=secure,
        samesite=samesite,
        path="/",
        max_age=3600,
    )

def get_refresh_token_from_cookie(request: Request) -> Optional[str]:
    token = request.cookies.get("refresh_token")
    print("\n=== [DEBUG] COOKIES RECEIVED ===")
    print(request.cookies)
    print(f"[DEBUG] Refresh token found: {bool(token)}")
    return token

# ----------------------------------------------------------------------
# ACCESS TOKENS (HS256)
# ----------------------------------------------------------------------
def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    now = datetime.now(UTC)

    payload = {
        **data,
        "exp": now + (expires_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)),
        "iat": now,
        "nbf": now,
        "jti": secrets.token_urlsafe(32),
        "type": "access",
    }

    return jwt.encode(
        payload,
        settings.JWT_SECRET.get_secret_value(),
        algorithm="HS256",
    )

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET.get_secret_value(),
            algorithms=["HS256"],
        )
        return payload if payload.get("type") == "access" else None
    except JWTError:
        return None

# ----------------------------------------------------------------------
# REFRESH TOKENS (HS256)
# ----------------------------------------------------------------------
def create_refresh_token(data: Optional[Dict[str, Any]] = None) -> str:
    now = datetime.now(UTC)

    payload = {
        **(data or {}),
        "exp": now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        "iat": now,
        "nbf": now,
        "jti": secrets.token_urlsafe(32),
        "type": "refresh",
    }

    return jwt.encode(
        payload,
        settings.REFRESH_TOKEN_SIGNING_KEY.get_secret_value(),
        algorithm="HS256",
    )

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

# ----------------------------------------------------------------------
# CSRF
# ----------------------------------------------------------------------
def create_csrf_token() -> str:
    return secrets.token_urlsafe(32)

generate_csrf_token = create_csrf_token

def verify_csrf_token(token: str, expected: str) -> bool:
    return secrets.compare_digest(token.encode(), expected.encode())

# ----------------------------------------------------------------------
# MFA / Backup codes
# ----------------------------------------------------------------------
def generate_totp_secret() -> str:
    return secrets.token_urlsafe(32)

def encrypt_secret(secret: str) -> str:
    return fernet.encrypt(secret.encode()).decode()

def decrypt_secret(encrypted: str) -> str:
    try:
        return fernet.decrypt(encrypted.encode()).decode()
    except InvalidToken as exc:
        raise ValueError("Invalid encrypted secret") from exc

def generate_backup_codes(count: int = 10) -> list[str]:
    return [secrets.token_hex(4).upper() for _ in range(count)]

def hash_backup_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()

def verify_backup_code(plain: str, hashed: str) -> bool:
    return secrets.compare_digest(hash_backup_code(plain), hashed)

# ----------------------------------------------------------------------
# Password Strength
# ----------------------------------------------------------------------
def validate_password_strength(password: str) -> Tuple[bool, str]:
    if len(password) < 12:
        return False, "Password must be ≥ 12 characters"
    if not (
        any(c.isupper() for c in password)
        and any(c.islower() for c in password)
        and any(c.isdigit() for c in password)
        and any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)
    ):
        return False, "Password must include uppercase, lowercase, number, special char"

    bad_patterns = ["password", "admin", "123456", "qwerty", "letmein", "welcome"]
    if any(p in password.lower() for p in bad_patterns):
        return False, "Password uses a common pattern"

    return True, "Password is strong"

# ----------------------------------------------------------------------
# Generic token verification (used for refresh token)
# ----------------------------------------------------------------------
def verify_token(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            settings.REFRESH_TOKEN_SIGNING_KEY.get_secret_value(),
            algorithms=["HS256"],
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
