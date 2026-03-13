"""
Authentication module for SmartPark
Handles JWT tokens, user roles, and admin verification
"""

import jwt
import os
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict
from functools import wraps
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer

logger = logging.getLogger(__name__)

# Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "smartpark-jwt-secret-key-2026")
JWT_EXPIRY = int(os.getenv("JWT_EXPIRY", 3600))  # 1 hour
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@smartpark.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin123")

security = HTTPBearer()

# ==================== JWT Token Functions ====================

def create_jwt_token(
    user_id: str,
    email: str,
    role: str = "client",
    user_name: str = None
) -> str:
    """
    Create JWT token for authenticated user
    
    Args:
        user_id: Firebase UID or "admin"
        email: User email
        role: "admin" or "client"
        user_name: Optional user name
    
    Returns:
        JWT token string
    """
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "name": user_name,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(seconds=JWT_EXPIRY)
    }
    
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    logger.info(f"✓ Created JWT token for {email} ({role})")
    return token


def verify_jwt_token(token: str) -> Optional[Dict]:
    """
    Verify JWT token validity and extract payload
    
    Args:
        token: JWT token string
    
    Returns:
        Token payload dict if valid, None otherwise
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("JWT token has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )
    except jwt.InvalidTokenError:
        logger.warning("Invalid JWT token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


def verify_admin_password(password: str) -> bool:
    """
    Verify admin password (hardcoded in .env)
    
    Args:
        password: Password to verify
    
    Returns:
        True if password matches, False otherwise
    """
    return password == ADMIN_PASSWORD


# ==================== Dependency Injectors ====================

def get_token(credentials = Depends(security)) -> str:
    """
    Extract Bearer token from Authorization header
    """
    return credentials.credentials


def get_current_user(token: str = Depends(get_token)) -> Dict:
    """
    Get current user from JWT token
    Used as FastAPI dependency: @app.get("/protected", dependencies=[Depends(get_current_user)])
    """
    payload = verify_jwt_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    return payload


def get_current_admin(token: str = Depends(get_token)) -> Dict:
    """
    Get current user and verify role is admin
    Used as FastAPI dependency for admin-only endpoints
    """
    payload = verify_jwt_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if payload.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return payload


# ==================== Decorators ====================

def require_admin(func):
    """Decorator to require admin role"""
    @wraps(func)
    async def wrapper(*args, current_user: Dict = Depends(get_current_admin), **kwargs):
        if current_user.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        return await func(*args, current_user=current_user, **kwargs)
    return wrapper


def require_client(func):
    """Decorator to require client role"""
    @wraps(func)
    async def wrapper(*args, current_user: Dict = Depends(get_current_user), **kwargs):
        if current_user.get("role") != "client":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Client access required"
            )
        return await func(*args, current_user=current_user, **kwargs)
    return wrapper
