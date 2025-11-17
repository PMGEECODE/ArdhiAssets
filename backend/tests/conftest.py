"""
Pytest configuration and fixtures
"""

import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import get_db, Base
from app.models.user import User, UserRole
from app.utils.generate_custom_id import generate_uuid

# Test database URL (in-memory SQLite for testing)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestSessionLocal() as session:
        yield session
    
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create a test client."""
    def override_get_db():
        return db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()

@pytest.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user."""
    user = User(
        id=generate_uuid(),
        username="testuser",
        email="test@example.com",
        firstName="Test",
        lastName="User",
        role=UserRole.USER,
        isActive=True
    )
    user.set_password("testpassword123")
    
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    
    return user

@pytest.fixture
async def test_admin(db_session: AsyncSession) -> User:
    """Create a test admin user."""
    admin = User(
        id=generate_uuid(),
        username="testadmin",
        email="admin@example.com",
        firstName="Test",
        lastName="Admin",
        role=UserRole.ADMIN,
        isActive=True
    )
    admin.set_password("adminpassword123")
    
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)
    
    return admin

@pytest.fixture
async def auth_headers(client: AsyncClient, test_user: User) -> dict:
    """Get authentication headers for test user."""
    response = await client.post("/api/auth/login", json={
        "email": test_user.email,
        "password": "testpassword123"
    })
    token = response.json()["token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
async def admin_headers(client: AsyncClient, test_admin: User) -> dict:
    """Get authentication headers for admin user."""
    response = await client.post("/api/auth/login", json={
        "email": test_admin.email,
        "password": "adminpassword123"
    })
    token = response.json()["token"]
    return {"Authorization": f"Bearer {token}"}
