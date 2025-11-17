"""
User management tests
"""

import pytest
from httpx import AsyncClient
from app.models.user import User

@pytest.mark.asyncio
async def test_get_all_users_admin(client: AsyncClient, admin_headers: dict):
    """Test getting all users as admin."""
    response = await client.get("/api/users/", headers=admin_headers)
    
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_get_all_users_non_admin(client: AsyncClient, auth_headers: dict):
    """Test getting all users as non-admin (should fail)."""
    response = await client.get("/api/users/", headers=auth_headers)
    
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_get_user_settings(client: AsyncClient, auth_headers: dict):
    """Test getting user settings."""
    response = await client.get("/api/users/settings", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert "notifications" in data
    assert "security" in data

@pytest.mark.asyncio
async def test_update_notification_settings(client: AsyncClient, auth_headers: dict):
    """Test updating notification settings."""
    settings_data = {
        "emailNotifications": False,
        "deviceAlerts": True,
        "securityAlerts": True,
        "maintenanceAlerts": False
    }
    
    response = await client.put("/api/users/settings/notifications", 
        headers=auth_headers,
        json=settings_data
    )
    
    assert response.status_code == 200
    assert "updated successfully" in response.json()["message"]
