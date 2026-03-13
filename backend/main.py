"""
SmartPark FastAPI Backend
Main application entry point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import os

from config import settings
from app.routes import router as parking_router
from app.auth_routes import router as auth_router
from app.video_routes import router as video_router
from firebase_db import firebase_db

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown"""
    # Startup
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    
    # Firebase initializes automatically on import
    if firebase_db._db is not None:
        logger.info("✓ Firebase Firestore connected")
    else:
        logger.warning("⚠ Firebase not available - running in demo mode")
    
    # Initialize parking detector with smart fallback
    logger.info("=" * 60)
    logger.info("🔍 Initializing Parking Space Detector...")
    logger.info("=" * 60)
    
    try:
        from app.parking_detector import ParkingDetectorService
        
        # Check for checkpoint file
        checkpoint_path = "ml-engine/checkpoints/parking_space_detection/average_model.pth"
        
        if os.path.exists(checkpoint_path):
            logger.info(f"✓ Found checkpoint: {checkpoint_path}")
            ParkingDetectorService.initialize(checkpoint_path)
        else:
            logger.info(f"ℹ Checkpoint not found: {checkpoint_path}")
            logger.info("→ Attempting smart initialization (pre-trained model or demo mode)...")
            ParkingDetectorService.initialize()
        
        status = ParkingDetectorService.get_status()
        logger.info(f"✓ Detector Mode: {status['mode'].upper()}")
        logger.info(f"✓ Description: {status['description']}")
        
    except Exception as e:
        logger.error(f"⚠ Parking detector initialization failed: {str(e)}")
        logger.info("   Parser detection will not be available, but app will continue running")
    
    logger.info("=" * 60)
    
    yield
    # Shutdown
    print("Shutting down application")

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Intelligent parking management system with real-time occupancy tracking",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure based on your needs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/v1", tags=["Auth"])
app.include_router(video_router, prefix="/api/v1/parking", tags=["Parking"])
app.include_router(parking_router, tags=["Parking"])

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "message": "SmartPark API",
        "version": settings.APP_VERSION,
        "status": "running"
    }

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION
    }

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
