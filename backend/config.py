import os
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseModel):
    """Application configuration settings"""
    
    # App Settings
    APP_NAME: str = "SmartPark API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # Server Settings
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    
    # Database Settings
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://user:password@localhost:5432/smartpark"
    )
    
    # API Settings
    API_V1_PREFIX: str = "/api/v1"
    
    # Parking Configuration
    PARKING_LOT_ID: str = os.getenv("PARKING_LOT_ID", "default")
    TOTAL_SPOTS: int = int(os.getenv("TOTAL_SPOTS", 100))
    
    # ML Engine Settings
    ML_ENGINE_URL: str = os.getenv("ML_ENGINE_URL", "http://localhost:8001")
    ML_UPDATE_INTERVAL: int = int(os.getenv("ML_UPDATE_INTERVAL", 5))  # seconds
    
    # Cloud Sync Settings
    CLOUD_SYNC_ENABLED: bool = os.getenv("CLOUD_SYNC_ENABLED", "True").lower() == "true"
    CLOUD_SYNC_INTERVAL: int = int(os.getenv("CLOUD_SYNC_INTERVAL", 2))  # seconds
    
    # Firebase Settings
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "")
    FIREBASE_URL: str = os.getenv("FIREBASE_URL", "")
    
    class Config:
        case_sensitive = True

settings = Settings()
