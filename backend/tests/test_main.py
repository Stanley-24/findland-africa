import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_root_endpoint():
    """Test the root endpoint returns correct response"""
    response = client.get("/")
    assert response.status_code == 200
    
    data = response.json()
    assert "message" in data
    assert "status" in data
    assert "timestamp" in data
    assert "version" in data
    assert data["status"] == "healthy"
    assert data["version"] == "1.0.0"

def test_health_endpoint():
    """Test the health endpoint returns correct response"""
    response = client.get("/health")
    assert response.status_code == 200
    
    data = response.json()
    assert "status" in data
    assert "service" in data
    assert "timestamp" in data
    assert data["status"] == "healthy"
    assert data["service"] == "FindLand Africa API"

def test_cors_headers():
    """Test CORS headers are properly set"""
    response = client.options("/")
    assert response.status_code == 200
    
    # Check CORS headers
    assert "access-control-allow-origin" in response.headers
    assert "access-control-allow-methods" in response.headers
    assert "access-control-allow-headers" in response.headers

def test_invalid_endpoint():
    """Test 404 for invalid endpoints"""
    response = client.get("/invalid-endpoint")
    assert response.status_code == 404
