"""
Backend API Tests
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_root_endpoint():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["message"] == "SmartPark API"

def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_health_check_includes_version():
    """Test health check includes version"""
    response = client.get("/health")
    data = response.json()
    assert "version" in data
    assert data["version"] == "1.0.0"

# Additional tests will be added as endpoints are implemented
