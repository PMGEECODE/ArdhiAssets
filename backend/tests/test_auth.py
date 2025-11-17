"""
Authentication tests
"""

import pytest
from httpx import AsyncClient
from app.models.user import User

@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    """Test user registration."""
    response = await client.post("/api/auth/register", json={
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "newpassword123",
        "firstName": "New",
        "lastName": "User",
        "role": "user"
    })
    
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "newuser"
    assert data["email"] == "newuser@example.com"
    assert "password" not in data

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user: User):
    """Test successful login."""
    response = await client.post("/api/auth/login", json={
        "email": test_user.email,
        "password": "testpassword123"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert "user" in data
    assert data["user"]["email"] == test_user.email

@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient, test_user: User):
    """Test login with invalid credentials."""
    response = await client.post("/api/auth/login", json={
        "email": test_user.email,
        "password": "wrongpassword"
    })
    
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]

@pytest.mark.asyncio
async def test_get_current_user(client: AsyncClient, auth_headers: dict):
    """Test getting current user info."""
    response = await client.get("/api/auth/me", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert "email" in data
    assert "username" in data
    assert "password" not in data

@pytest.mark.asyncio
async def test_change_password(client: AsyncClient, auth_headers: dict):
    """Test password change."""
    response = await client.post("/api/auth/change-password", 
        headers=auth_headers,
        json={
            "currentPassword": "testpassword123",
            "newPassword": "newtestpassword123"
        }
    )
    
    assert response.status_code == 200
    assert "Password updated successfully" in response.json()["message"]
