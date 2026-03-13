"""
Authentication routes for SmartPark
Endpoints: /auth/admin/login, /auth/client/login, /auth/client/register
"""

import logging
import os
import uuid
import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from firebase_admin import firestore
from firebase_db import FirebaseDB
from passlib.context import CryptContext
from app.auth import (
    create_jwt_token,
    verify_admin_password,
    ADMIN_EMAIL
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])
db = FirebaseDB()

# Password hashing context
pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

# ==================== Request/Response Models ====================

class AdminLoginRequest(BaseModel):
    email: str
    password: str

class ClientLoginRequest(BaseModel):
    email: str
    password: str

class ClientRegisterRequest(BaseModel):
    name: str
    email: str
    phone: str
    password: str

class AuthResponse(BaseModel):
    token: str
    user: dict
    role: str

# ==================== Admin Login ====================

@router.post("/admin/login", response_model=AuthResponse)
async def admin_login(request: AdminLoginRequest):
    """
    Admin login with hardcoded credentials
    
    Request:
        - email: must match ADMIN_EMAIL from .env
        - password: must match ADMIN_PASSWORD from .env
    
    Response:
        - token: JWT token
        - user: admin user info
        - role: "admin"
    """
    try:
        # Verify email matches hardcoded admin email
        if request.email != ADMIN_EMAIL:
            logger.warning(f"❌ Admin login attempt with wrong email: {request.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid admin credentials"
            )
        
        # Verify password matches
        if not verify_admin_password(request.password):
            logger.warning(f"❌ Admin login attempt with wrong password")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid admin credentials"
            )
        
        # Create JWT token
        token = create_jwt_token(
            user_id="admin",
            email=request.email,
            role="admin",
            user_name="SmartPark Admin"
        )
        
        logger.info(f"✓ Admin login successful: {request.email}")
        
        return AuthResponse(
            token=token,
            user={
                "user_id": "admin",
                "email": request.email,
                "name": "SmartPark Admin",
                "role": "admin"
            },
            role="admin"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

# ==================== Client Login ====================

@router.post("/client/login", response_model=AuthResponse)
async def client_login(request: ClientLoginRequest):
    try:
        if db.get_db() is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )

        # Find user in Firestore by email
        users_ref = db._db.collection("clients").where("email", "==", request.email).limit(1).get()
        if not users_ref:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        user_doc = users_ref[0]
        user_data = user_doc.to_dict()

        # Verify password
        stored_hash = user_data.get("password_hash", "")
        if not stored_hash or not verify_password(request.password, stored_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        token = create_jwt_token(
            user_id=user_doc.id,
            email=request.email,
            role="client",
            user_name=user_data.get("name", "")
        )

        logger.info(f"✓ Client login successful: {request.email}")

        return AuthResponse(
            token=token,
            user={
                "user_id": user_doc.id,
                "email": request.email,
                "name": user_data.get("name", ""),
                "phone": user_data.get("phone", ""),
                "role": "client"
            },
            role="client"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Client login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

# ==================== Client Registration ====================

@router.post("/client/register", response_model=AuthResponse)
async def client_register(request: ClientRegisterRequest):
    try:
        if len(request.password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters"
            )

        # Check Firebase connection
        if db.get_db() is None or db._db is None:
            logger.error("❌ CRITICAL: Firebase not initialized!")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available - Firebase not initialized"
            )

        logger.info(f"📝 Starting registration for email: {request.email}")

        # Check if email already registered
        try:
            logger.info(f"🔍 Checking if email already exists: {request.email}")
            existing = db._db.collection("clients").where("email", "==", request.email).limit(1).get()
            if existing:
                logger.warning(f"⚠ Email already registered: {request.email}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            logger.info(f"✓ Email {request.email} is available")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error checking email: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )

        # Hash password and create user document
        try:
            password_hash = hash_password(request.password)
            user_id = str(uuid.uuid4())
            logger.info(f"🔑 Password hashed, user_id generated: {user_id}")

            # Prepare user data
            user_data = {
                "name": request.name,
                "email": request.email,
                "phone": request.phone,
                "password_hash": password_hash,
                "created_at": firestore.SERVER_TIMESTAMP,
                "role": "client"
            }
            
            logger.info(f"💾 Writing to Firestore collection 'clients' with data: {user_data}")
            db._db.collection("clients").document(user_id).set(user_data)
            logger.info(f"✅ Successfully wrote user {request.email} to Firestore (ID: {user_id})")

        except Exception as e:
            logger.error(f"❌ Firestore write failed: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save user to database: {str(e)}"
            )

        # Create JWT token
        try:
            token = create_jwt_token(
                user_id=user_id,
                email=request.email,
                role="client",
                user_name=request.name
            )
            logger.info(f"🎟 JWT token created for {request.email}")
        except Exception as e:
            logger.error(f"❌ Token creation failed: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Token creation failed: {str(e)}"
            )

        logger.info(f"✅ Client registration completed: {request.email}")

        return AuthResponse(
            token=token,
            user={
                "user_id": user_id,
                "email": request.email,
                "name": request.name,
                "phone": request.phone,
                "role": "client"
            },
            role="client"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error in client registration: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )
