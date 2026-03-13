from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from typing import Optional
import os
import shutil
import logging
from .video_processor import get_processor, reload_processor
from .auth import get_current_admin

logger = logging.getLogger(__name__)

router = APIRouter()

# Create temp upload directory
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "../../uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_admin)
):
    """
    Upload and process a parking lot image
    Admin only endpoint
    """
    try:
        # Validate file extension
        allowed_extensions = {".jpg", ".jpeg", ".png", ".bmp"}
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail=f"File type {file_ext} not supported. Use: {', '.join(allowed_extensions)}")
        
        # Read file content
        content = await file.read()
        logger.info(f"File received: {file.filename}, size: {len(content)} bytes, content_type: {file.content_type}")
        
        if len(content) == 0:
            logger.error("Received empty file!")
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Save uploaded file
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # Verify file was saved
        if not os.path.exists(file_path):
            logger.error(f"File was not saved: {file_path}")
            raise HTTPException(status_code=500, detail="Failed to save file")
        
        saved_size = os.path.getsize(file_path)
        logger.info(f"Image saved: {file.filename}, size on disk: {saved_size} bytes")
        
        if saved_size == 0:
            logger.error("Saved file is empty!")
            raise HTTPException(status_code=500, detail="Saved file is empty")
        
        # Process image
        processor = get_processor()
        result = processor.process_image(file_path)
        
        # Add file info
        result["filename"] = file.filename
        result["file_path"] = file_path
        
        return result
    
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error uploading image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-video")
async def upload_video(
    file: UploadFile = File(...),
    skip_frames: int = 5,
    current_user: dict = Depends(get_current_admin)
):
    """
    Upload and process a parking lot video
    Admin only endpoint
    
    Args:
        file: Video file to process
        skip_frames: Process every nth frame (default 5)
    """
    try:
        # Validate file extension
        allowed_extensions = {".mp4", ".avi", ".mov", ".mkv", ".flv"}
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail=f"File type {file_ext} not supported. Use: {', '.join(allowed_extensions)}")
        
        # Save uploaded file
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"Video uploaded: {file.filename}")
        
        # Process video
        processor = get_processor()
        result = processor.process_video(file_path, skip_frames=skip_frames)
        
        # Add file info
        result["filename"] = file.filename
        result["file_path"] = file_path
        
        return result
    
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error uploading video: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/model-status")
async def get_model_status():
    """
    Get current YOLO model status
    Public endpoint - no auth required
    """
    try:
        processor = get_processor()
        status = processor.get_model_status()
        return status
    except Exception as e:
        logger.error(f"Error getting model status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reload-model")
async def reload_model(current_user: dict = Depends(get_current_admin)):
    """
    Reload YOLO model from disk
    Use this after uploading best.pt to models/ directory
    Admin only endpoint
    """
    try:
        logger.info("Reloading YOLO model...")
        processor = reload_processor()
        status = processor.get_model_status()
        
        if status["model_loaded"]:
            return {"status": "success", "message": "Model reloaded successfully", "details": status}
        else:
            return {"status": "error", "message": "Model file not found", "details": status}
    
    except Exception as e:
        logger.error(f"Error reloading model: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
