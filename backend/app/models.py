"""
Backend API Models - Database and Request/Response schemas
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

# ==================== Auth Models ====================

class AdminLoginRequest(BaseModel):
    """Admin login request"""
    email: str
    password: str

class ClientLoginRequest(BaseModel):
    """Client login request"""
    email: str
    password: str

class ClientRegisterRequest(BaseModel):
    """Client registration request"""
    name: str
    email: str
    phone: str
    password: str

class UserResponse(BaseModel):
    """User response data"""
    user_id: str
    email: str
    name: Optional[str] = None
    role: str  # "admin" or "client"

class AuthResponse(BaseModel):
    """Authentication response"""
    token: str
    user: UserResponse
    role: str

# ==================== Request/Response Models ====================

class ParkingSpaceStatus(BaseModel):
    """Individual parking space status"""
    space_id: str
    is_occupied: bool
    last_updated: datetime
    confidence: float = Field(..., ge=0, le=1)

class ParkingLotOccupancy(BaseModel):
    """Overall parking lot occupancy status"""
    lot_id: str
    total_spaces: int
    occupied_spaces: int
    available_spaces: int
    occupancy_percentage: float
    timestamp: datetime
    spaces: List[ParkingSpaceStatus]

class ParkingSpaceUpdate(BaseModel):
    """Incoming update from ML engine"""
    space_id: str
    is_occupied: bool
    confidence: float

class AvailableSpaceResponse(BaseModel):
    """Response with available parking spaces"""
    space_id: str
    location: Optional[str] = None
    distance_from_entrance: Optional[float] = None

class OccupancyHistoryEntry(BaseModel):
    """Historical occupancy data"""
    timestamp: datetime
    occupancy_percentage: float
    occupied_spaces: int
    available_spaces: int
