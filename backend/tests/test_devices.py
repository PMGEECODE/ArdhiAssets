"""
Device management tests
"""

import pytest
from httpx import AsyncClient
from app.models.device import Device
from app.utils.generate_custom_id import generate_uuid

@pytest.mark.asyncio
async def test_create_device(client: AsyncClient, admin_headers: dict):
    """Test device creation."""
    device_data = {
        "hostname": "test-device-001",
        "platform": "Windows",
        "osVersion": "10.0.19042",
        "type": "Desktop",
        "location": "Office A"
    }
    
    response = await client.post("/api/devices/", 
        headers=admin_headers,
        json=device_data
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["hostname"] == "test-device-001"
    assert data["platform"] == "Windows"

@pytest.mark.asyncio
async def test_get_devices(client: AsyncClient, auth_headers: dict):
    """Test getting all devices."""
    response = await client.get("/api/devices/", headers=auth_headers)
    
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_search_devices(client: AsyncClient, auth_headers: dict):
    """Test device search."""
    response = await client.get("/api/devices/search?query=test", 
        headers=auth_headers
    )
    
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_bulk_create_devices(client: AsyncClient, admin_headers: dict):
    """Test bulk device creation."""
    devices_data = [
        {
            "hostname": "bulk-device-001",
            "platform": "Linux",
            "type": "Server"
        },
        {
            "hostname": "bulk-device-002",
            "platform": "Windows",
            "type": "Desktop"
        }
    ]
    
    response = await client.post("/api/devices/bulk", 
        headers=admin_headers,
        json=devices_data
    )
    
    assert response.status_code == 201
    data = response.json()
    assert "createdDevices" in data
    assert len(data["createdDevices"]) == 2
