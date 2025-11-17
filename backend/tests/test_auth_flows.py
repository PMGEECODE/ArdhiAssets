import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.main import app
from app.models.auth_models.user import User
from app.models.refresh_token import RefreshToken
from app.core.security import hash_password


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user: User):
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "username": "testuser",
            "password": "TestPassword123!"
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "refresh_token" in response.cookies


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "username": "testuser",
            "password": "WrongPassword!"
        }
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_account_lockout_after_failed_attempts(client: AsyncClient, test_user: User):
    for _ in range(5):
        await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "WrongPassword!"
            }
        )

    response = await client.post(
        "/api/v1/auth/login",
        json={
            "username": "testuser",
            "password": "TestPassword123!"
        }
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_token_refresh(client: AsyncClient, authenticated_client: AsyncClient):
    response = await authenticated_client.post("/api/v1/auth/refresh")

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in response.cookies


@pytest.mark.asyncio
async def test_token_reuse_detection(
    client: AsyncClient,
    authenticated_client: AsyncClient,
    db_session: AsyncSession
):
    refresh_response = await authenticated_client.post("/api/v1/auth/refresh")
    old_refresh_token = authenticated_client.cookies.get("refresh_token")

    reuse_response = await client.post(
        "/api/v1/auth/refresh",
        cookies={"refresh_token": old_refresh_token}
    )

    assert reuse_response.status_code == 401

    query = select(RefreshToken).where(RefreshToken.revoked == False)
    result = await db_session.execute(query)
    active_tokens = result.scalars().all()
    assert len(active_tokens) == 0


@pytest.mark.asyncio
async def test_logout(authenticated_client: AsyncClient):
    response = await authenticated_client.post("/api/v1/auth/logout")

    assert response.status_code == 200
    assert "refresh_token" not in response.cookies


@pytest.mark.asyncio
async def test_get_current_user(authenticated_client: AsyncClient):
    response = await authenticated_client.get("/api/v1/auth/me")

    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_mfa_login_flow(client: AsyncClient, test_user_with_mfa: User):
    login_response = await client.post(
        "/api/v1/auth/login",
        json={
            "username": "testuser",
            "password": "TestPassword123!"
        }
    )

    assert login_response.status_code == 200
    data = login_response.json()
    assert data.get("requires_mfa") is True

    import pyotp
    totp = pyotp.TOTP(test_user_with_mfa.mfa_secret.secret_encrypted)
    code = totp.now()

    mfa_response = await client.post(
        "/api/v1/auth/mfa/verify",
        json={
            "user_id": str(test_user_with_mfa.id),
            "totp_code": code
        }
    )

    assert mfa_response.status_code == 200
    mfa_data = mfa_response.json()
    assert "access_token" in mfa_data


@pytest.mark.asyncio
async def test_protected_endpoint_without_auth(client: AsyncClient):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_csrf_protection(authenticated_client: AsyncClient):
    response = await authenticated_client.post(
        "/api/v1/auth/logout",
        headers={"X-CSRF-Token": "invalid-token"}
    )

    assert response.status_code in [401, 403]


@pytest.mark.asyncio
async def test_rate_limiting(client: AsyncClient):
    for _ in range(101):
        await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "TestPassword123!"
            }
        )

    response = await client.post(
        "/api/v1/auth/login",
        json={
            "username": "testuser",
            "password": "TestPassword123!"
        }
    )

    assert response.status_code == 429


@pytest.mark.asyncio
async def test_session_revocation(
    authenticated_client: AsyncClient,
    db_session: AsyncSession,
    test_user: User
):
    query = select(Session).where(Session.user_id == test_user.id)
    result = await db_session.execute(query)
    session = result.scalar_one()

    response = await authenticated_client.delete(
        f"/api/v1/auth/sessions/{session.id}"
    )

    assert response.status_code == 200

    token_query = select(RefreshToken).where(
        RefreshToken.id == session.refresh_token_id
    )
    token_result = await db_session.execute(token_query)
    token = token_result.scalar_one()
    assert token.revoked is True


@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def test_user(db_session: AsyncSession):
    user = User(
        email="test@example.com",
        username="testuser",
        password_hash=hash_password("TestPassword123!"),
        is_active=True,
        is_verified=True
    )
    db_session.add(user)
    await db_session.commit()
    yield user


@pytest.fixture
async def authenticated_client(client: AsyncClient, test_user: User):
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "username": "testuser",
            "password": "TestPassword123!"
        }
    )

    access_token = response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {access_token}"

    yield client
