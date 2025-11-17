# tests/unit/test_auth_service.py
import asyncio
from datetime import datetime, timedelta, UTC
from uuid import uuid4, UUID

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import text

from app.services.auth_service import AuthService
from app.models.auth_models.user import User
from app.models.auth_models.refresh_token import RefreshToken
from app.models.auth_models.session import Session
from app.models.auth_models.user_session import UserSession
from app.models.auth_models.mfa import MFASecret
from app.core.security import hash_password
from app.core.config import settings

# --------------------------------------------------------------------------- #
# Fixtures
# --------------------------------------------------------------------------- #
DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="function")
async def async_engine():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        from app.models import Base  # import all models that inherit from Base
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def db_session(async_engine) -> AsyncSession:
    AsyncSessionLocal = async_sessionmaker(
        async_engine, expire_on_commit=False, class_=AsyncSession
    )
    async with AsyncSessionLocal() as session:
        yield session


@pytest.fixture
def mock_security(monkeypatch):
    """Replace real crypto / OTP functions with deterministic stubs."""
    def fake_verify_password(plain: str, hashed: str) -> bool:
        # our test hashes are just "hash_<plain>"
        return hashed == f"hash_{plain}"

    def fake_hash_password(plain: str) -> str:
        return f"hash_{plain}"

    def fake_create_access_token(data: dict) -> str:
        sub = data.get("sub", "unknown")
        return f"access.{sub}.fake"

    def fake_create_refresh_token(data: dict | None = None) -> str:
        # deterministic but unique per call
        return f"refresh.{uuid4().hex}.fake"

    def fake_hash_token(token: str) -> str:
        return f"hash_{token}"

    def fake_decrypt_secret(encrypted: str) -> str:
        # encrypted value in DB is "enc_<base32_secret>"
        return encrypted.split("_", 1)[1]

    class FakeTOTP:
        def __init__(self, secret):
            self.secret = secret

        def verify(self, code: str, valid_window: int = 0) -> bool:
            # accept only the exact code "123456"
            return code == "123456"

    def fake_pyotp_TOTP(secret):
        return FakeTOTP(secret)

    monkeypatch.setattr(
        "app.services.auth_service.verify_password", fake_verify_password
    )
    monkeypatch.setattr(
        "app.core.security.hash_password", fake_hash_password
    )
    monkeypatch.setattr(
        "app.services.auth_service.create_access_token", fake_create_access_token
    )
    monkeypatch.setattr(
        "app.services.auth_service.create_refresh_token", fake_create_refresh_token
    )
    monkeypatch.setattr(
        "app.services.auth_service.hash_token", fake_hash_token
    )
    monkeypatch.setattr(
        "app.services.auth_service.decrypt_secret", fake_decrypt_secret
    )
    monkeypatch.setattr("pyotp.TOTP", fake_pyotp_TOTP)

    # silence audit logging
    async def noop_audit(*args, **kwargs):
        pass

    monkeypatch.setattr(
        "app.services.audit_service.AuditService.create_audit_log", noop_audit
    )


@pytest.fixture
async def auth_service(db_session: AsyncSession, mock_security):
    return AuthService(db=db_session)


@pytest.fixture
async def sample_user(db_session: AsyncSession) -> User:
    user = User(
        id=uuid4(),
        username="john_doe",
        email="john@example.com",
        password_hash=hash_password("secret123"),  # will be replaced by fake
        is_active=True,
        failed_attempts=0,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


# --------------------------------------------------------------------------- #
# Helper to create a user with the *fake* password hash used by the stub
# --------------------------------------------------------------------------- #
async def create_user_with_fake_hash(
    db: AsyncSession, username: str, plain_pw: str, **extra
) -> User:
    u = User(
        username=username,
        email=f"{username}@example.com",
        password_hash=f"hash_{plain_pw}",  # matches fake_verify_password
        is_active=True,
        **extra,
    )
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


# --------------------------------------------------------------------------- #
# Tests
# --------------------------------------------------------------------------- #
@pytest.mark.asyncio
async def test_authenticate_user_success_without_mfa(
    auth_service: AuthService, db_session: AsyncSession
):
    user = await create_user_with_fake_hash(db_session, "alice", "pwd123")
    result = await auth_service.authenticate_user(
        username="alice",
        password="pwd123",
        ip_address="1.2.3.4",
        user_agent="Mozilla",
    )

    assert result is not None
    assert "access_token" in result
    assert "refresh_token" in result
    assert result["token_type"] == "bearer"

    # verify DB side-effects
    rt = (
        await db_session.execute(
            select(RefreshToken).where(RefreshToken.user_id == user.id)
        )
    ).scalar_one_or_none()
    assert rt is not None

    us = (
        await db_session.execute(
            select(UserSession).where(UserSession.user_id == user.id)
        )
    ).scalar_one_or_none()
    assert us is not None
    assert us.refresh_token_id == rt.id


@pytest.mark.asyncio
async def test_authenticate_user_requires_mfa(
    auth_service: AuthService, db_session: AsyncSession
):
    user = await create_user_with_fake_hash(db_session, "bob", "pwd456")
    # enable MFA
    secret = MFASecret(
        user_id=user.id,
        secret_encrypted="enc_ABCDEF1234567890",  # base32 secret after "enc_"
        enabled=True,
    )
    db_session.add(secret)
    await db_session.commit()

    result = await auth_service.authenticate_user(
        username="bob",
        password="pwd456",
        ip_address="5.6.7.8",
        user_agent="Chrome",
    )

    assert result == {"requires_mfa": True, "user_id": str(user.id)}


@pytest.mark.asyncio
async def test_verify_mfa_success(
    auth_service: AuthService, db_session: AsyncSession
):
    user = await create_user_with_fake_hash(db_session, "carol", "pwd789")
    secret = MFASecret(
        user_id=user.id,
        secret_encrypted="enc_ABCDEF1234567890",
        enabled=True,
    )
    db_session.add(secret)
    await db_session.commit()

    result = await auth_service.verify_mfa(
        user_id=user.id,
        totp_code="123456",  # our stub accepts this
        ip_address="9.9.9.9",
        user_agent="Safari",
    )

    assert result is not None
    assert "access_token" in result
    assert "refresh_token" in result


@pytest.mark.asyncio
async def test_rotate_refresh_token(
    auth_service: AuthService, db_session: AsyncSession
):
    user = await create_user_with_fake_hash(db_session, "dave", "pwd000")
    # login once to get a refresh token
    login_res = await auth_service.authenticate_user(
        username="dave",
        password="pwd000",
        ip_address="10.0.0.1",
        user_agent="Edge",
    )
    old_refresh = login_res["refresh_token"]

    # rotate
    rotate_res = await auth_service.rotate_refresh_token(
        refresh_token_str=old_refresh,
        ip_address="10.0.0.1",
        user_agent="Edge",
    )

    assert rotate_res is not None
    new_refresh = rotate_res["refresh_token"]
    assert new_refresh != old_refresh

    # old token must be marked revoked + replaced_by
    old_rt = (
        await db_session.execute(
            select(RefreshToken).where(RefreshToken.token_hash == f"hash_{old_refresh}")
        )
    ).scalar_one()
    assert old_rt.revoked is True
    assert old_rt.replaced_by_token_id is not None


@pytest.mark.asyncio
async def test_logout(
    auth_service: AuthService, db_session: AsyncSession
):
    user = await create_user_with_fake_hash(db_session, "eve", "pwd111")
    login_res = await auth_service.authenticate_user(
        username="eve",
        password="pwd111",
        ip_address="192.168.1.1",
        user_agent="Firefox",
    )
    refresh = login_res["refresh_token"]

    success = await auth_service.logout(
        refresh_token_str=refresh,
        ip_address="192.168.1.1",
        user_agent="Firefox",
    )
    assert success is True

    # token must be revoked
    rt = (
        await db_session.execute(
            select(RefreshToken).where(RefreshToken.token_hash == f"hash_{refresh}")
        )
    ).scalar_one()
    assert rt.revoked is True

    # UserSession must be inactive
    us = (
        await db_session.execute(
            select(UserSession).where(UserSession.refresh_token_hash == f"hash_{refresh}")
        )
    ).scalar_one()
    assert us.is_active is False


@pytest.mark.asyncio
async def test_change_password(
    auth_service: AuthService, db_session: AsyncSession
):
    user = await create_user_with_fake_hash(db_session, "frank", "oldpwd")
    res = await auth_service.change_password(
        user_id=user.id,
        current_password="oldpwd",
        new_password="newpwd42",
        ip_address="1.1.1.1",
        user_agent="Test",
    )
    assert res["success"] is True

    # password hash must have changed
    await db_session.refresh(user)
    assert user.password_hash == "hash_newpwd42"


@pytest.mark.asyncio
async def test_failed_login_lockout(
    auth_service: AuthService, db_session: AsyncSession
):
    user = await create_user_with_fake_hash(db_session, "grace", "correct")
    # MAX_FAILED_ATTEMPTS is imported from settings – assume default 5
    for _ in range(settings.MAX_FAILED_ATTEMPTS):
        await auth_service.authenticate_user(
            username="grace",
            password="wrong",
            ip_address="2.2.2.2",
            user_agent="Bot",
        )

    # next attempt should lock the account
    result = await auth_service.authenticate_user(
        username="grace",
        password="correct",
        ip_address="2.2.2.2",
        user_agent="Bot",
    )
    assert result is None

    await db_session.refresh(user)
    assert user.locked_until is not None
    assert user.locked_until > datetime.now(UTC)