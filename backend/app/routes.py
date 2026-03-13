"""
Parking API routes
Real-time occupancy, history, and space management
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from firebase_db import firebase_db
from app.auth import get_current_admin
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/parking", tags=["Parking"])

# ==================== Models ====================

class OccupancyUpdate(BaseModel):
    """Incoming occupancy update from ML engine"""
    occupied_count: int
    available_count: int
    total_spaces: int
    confidence: float = 0.85

class OccupancyResponse(BaseModel):
    """Parking lot occupancy response"""
    lot_id: str
    occupied_count: int
    available_count: int
    total_spaces: int
    percentage: float
    timestamp: str

class SpaceStatus(BaseModel):
    """Individual parking space status"""
    space_id: str
    is_occupied: bool
    confidence: float

class AvailableSpaceResponse(BaseModel):
    """Available parking space"""
    space_id: str
    confidence: float

# ==================== Endpoints ====================

@router.get("/{lot_id}/occupancy", response_model=dict)
async def get_occupancy(lot_id: str = "default"):
    """
    Get current parking lot occupancy
    
    Args:
        lot_id: Parking lot identifier
    
    Returns:
        Current occupancy status
    """
    occupancy = firebase_db.get_current_occupancy(lot_id)
    
    if not occupancy:
        raise HTTPException(status_code=404, detail="Parking lot not found")
    
    return occupancy

@router.post("/{lot_id}/occupancy")
async def update_occupancy(lot_id: str, data: OccupancyUpdate):
    """
    Update parking lot occupancy (from ML engine)
    
    Args:
        lot_id: Parking lot identifier
        data: Occupancy data from ML engine
    
    Returns:
        Success status
    """
    try:
        occupancy_data = {
            "occupied_count": data.occupied_count,
            "available_count": data.available_count,
            "total_spaces": data.total_spaces,
            "percentage": round(data.occupied_count / data.total_spaces * 100, 2) if data.total_spaces > 0 else 0,
            "confidence": data.confidence
        }
        
        success = firebase_db.update_occupancy(lot_id, occupancy_data)
        
        # Also save to history
        if success:
            firebase_db.save_occupancy_history(lot_id, occupancy_data)
        
        return {
            "status": "success" if success else "failed",
            "message": "Occupancy updated",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error updating occupancy: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{lot_id}/available-spaces")
async def get_available_spaces(lot_id: str = "default"):
    """
    Get list of available parking spaces
    
    Args:
        lot_id: Parking lot identifier
    
    Returns:
        Available spaces information
    """
    occupancy = firebase_db.get_current_occupancy(lot_id)
    
    if not occupancy:
        raise HTTPException(status_code=404, detail="Parking lot not found")
    
    available = occupancy.get("available_count", 0)
    total = occupancy.get("total_spaces", 0)
    
    return {
        "lot_id": lot_id,
        "available_count": available,
        "total_spaces": total,
        "message": f"{available} spaces available out of {total}"
    }

@router.get("/{lot_id}/history")
async def get_history(lot_id: str = "default", limit: int = 100):
    """
    Get occupancy history
    
    Args:
        lot_id: Parking lot identifier
        limit: Number of records to return
    
    Returns:
        Historical occupancy data
    """
    history = firebase_db.get_occupancy_history(lot_id, limit)
    
    return {
        "lot_id": lot_id,
        "records": len(history),
        "data": history
    }

@router.post("/{lot_id}/spaces/{space_id}/status")
async def update_space_status(lot_id: str, space_id: str, data: SpaceStatus):
    """
    Update individual parking space status
    
    Args:
        lot_id: Parking lot identifier
        space_id: Space identifier
        data: Space status update
    
    Returns:
        Success status
    """
    try:
        success = firebase_db.update_space_status(
            lot_id,
            space_id,
            data.is_occupied,
            data.confidence
        )
        
        return {
            "status": "success" if success else "failed",
            "space_id": space_id,
            "is_occupied": data.is_occupied,
            "confidence": data.confidence
        }
    except Exception as e:
        logger.error(f"Error updating space status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{lot_id}/stats")
async def get_statistics(lot_id: str = "default"):
    """
    Get parking lot statistics
    
    Args:
        lot_id: Parking lot identifier
    
    Returns:
        Statistics including occupancy trends
    """
    occupancy = firebase_db.get_current_occupancy(lot_id)
    history = firebase_db.get_occupancy_history(lot_id, limit=20)
    
    if not occupancy:
        raise HTTPException(status_code=404, detail="Parking lot not found")
    
    # Calculate trend
    percentages = [h.get("percentage", 0) for h in history]
    avg_occupancy = sum(percentages) / len(percentages) if percentages else 0
    
    return {
        "lot_id": lot_id,
        "current": {
            "occupied": occupancy.get("occupied_spaces", 0),
            "available": occupancy.get("available_spaces", 0),
            "percentage": occupancy.get("occupancy_percentage", 0)
        },
        "average_occupancy": round(avg_occupancy, 2),
        "total_records": len(history),
        "timestamp": datetime.now().isoformat()
    }

@router.delete("/{lot_id}")
async def reset_parking_lot(lot_id: str = "default"):
    """
    Reset parking lot to empty state (admin only)
    
    Args:
        lot_id: Parking lot identifier
    
    Returns:
        Success status
    """
    try:
        occupancy_data = {
            "occupied_count": 0,
            "available_count": 100,
            "total_spaces": 100,
            "percentage": 0.0
        }
        
        success = firebase_db.update_occupancy(lot_id, occupancy_data)
        
        return {
            "status": "success" if success else "failed",
            "message": f"Parking lot {lot_id} reset to empty",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error resetting parking lot: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Parking Complexes & Bookings
# ---------------------------------------------------------------------------

class BookingRequest(BaseModel):
    slotId: str
    row: str
    slotNum: int
    section: str
    floor: int
    floorLabel: str
    date: str
    startTime: str
    endTime: str
    duration: float
    vehiclePlate: str
    vehicleType: str
    totalPrice: float
    complexName: str


@router.get("/complexes")
async def list_complexes():
    """Return all registered parking complexes."""
    try:
        complexes = firebase_db.get_parking_complexes()
        return {"complexes": complexes, "count": len(complexes)}
    except Exception as e:
        logger.error(f"Error listing complexes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/complexes/{complex_id}/slots")
async def get_complex_slots(complex_id: str):
    """Return floor/slot data for a specific parking complex."""
    try:
        floors = firebase_db.get_complex_slots(complex_id)
        if floors is None:
            raise HTTPException(status_code=404, detail="Complex not found")
        return {"complexId": complex_id, "floors": floors}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting slots for {complex_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/complexes/{complex_id}/book")
async def book_complex_slot(complex_id: str, data: BookingRequest):
    """Create a booking for a slot in the given complex."""
    try:
        booking = firebase_db.create_booking(complex_id, data.model_dump())
        return booking
    except Exception as e:
        logger.error(f"Error creating booking for {complex_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# ML Analysis Endpoints
# ---------------------------------------------------------------------------

@router.post("/analyze")
async def analyze_parking_image(
    file: UploadFile = File(...),
    total_spaces: int = 100,
):
    """
    Accept an uploaded image, run YOLOv8 vehicle detection, and return occupancy.
    """
    try:
        from app.ml_detector import analyze_image
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"ML model unavailable: {e}")

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")

    image_bytes = await file.read()

    try:
        result = analyze_image(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    occupied = result["occupied_count"]
    available = max(0, total_spaces - occupied)

    return {
        "vehicle_count": result["vehicle_count"],
        "vehicles": result["vehicles"],
        "confidence_avg": result["confidence_avg"],
        "occupancy": {
            "occupied": occupied,
            "available": available,
            "total": total_spaces,
            "percentage": round(occupied / total_spaces * 100, 1) if total_spaces else 0,
        },
        "timestamp": datetime.now().isoformat(),
    }


@router.post("/complexes/{complex_id}/scan")
async def scan_complex_image(
    complex_id: str,
    file: UploadFile = File(...),
    total_spaces: int = 50,
):
    """
    Run YOLOv8 on an uploaded image for a specific complex and update its
    occupancy in Firebase.
    """
    try:
        from app.ml_detector import analyze_image
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"ML model unavailable: {e}")

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")

    image_bytes = await file.read()

    try:
        result = analyze_image(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    occupied = result["occupied_count"]
    available = max(0, total_spaces - occupied)
    percentage = round(occupied / total_spaces * 100, 1) if total_spaces else 0

    occupancy_data = {
        "occupied_count": occupied,
        "available_count": available,
        "total_spaces": total_spaces,
        "percentage": percentage,
        "confidence": result["confidence_avg"],
        "source": "ml_scan",
        "timestamp": datetime.now().isoformat(),
    }

    # Persist to Firebase
    firebase_db.update_occupancy(complex_id, occupancy_data)

    return {
        "complex_id": complex_id,
        "vehicle_count": result["vehicle_count"],
        "confidence_avg": result["confidence_avg"],
        "occupancy": {
            "occupied": occupied,
            "available": available,
            "total": total_spaces,
            "percentage": percentage,
        },
        "timestamp": occupancy_data["timestamp"],
    }


# ---------------------------------------------------------------------------
# Admin Parking Space Detection & Setup
# ---------------------------------------------------------------------------

class DetectSpaceRequest(BaseModel):
    """Request to detect parking space at click point"""
    image_base64: str
    click_x: int
    click_y: int
    lot_id: str


class SaveParkingLayoutRequest(BaseModel):
    """Request to save parking layout"""
    lot_id: str
    spaces: List[dict]


@router.post("/admin/detect-space-at-point")
async def detect_space_at_point(data: DetectSpaceRequest):
    """
    Detect parking space at clicked point using YOLO-NAS model
    
    Args:
        data: Request containing image, click coordinates, and lot_id
        
    Returns:
        Detected parking space polygon and metadata
    """
    try:
        from app.parking_detector import ParkingDetectorService
        
        logger.info(f"🎯 Detect-space POST request received")
        logger.info(f"   Image size: {len(data.image_base64)} bytes")
        logger.info(f"   Click: ({data.click_x}, {data.click_y}), Lot: {data.lot_id}")
        
        # Get detector status
        status = ParkingDetectorService.get_status()
        logger.info(f"🔍 Detector Mode: {status['mode']}")
        
        result = ParkingDetectorService.detect_space_at_point(
            image_base64=data.image_base64,
            click_x=data.click_x,
            click_y=data.click_y
        )
        
        logger.info(f"✅ Detection complete - Found: {result.get('found', 'error')}")
        
        return {
            "lot_id": data.lot_id,
            "detection": result,
            "detector_mode": status['mode'],
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"❌ Error detecting space: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/detector-status")
async def get_detector_status(current_user: dict = Depends(get_current_admin)):
    """
    Get parking space detector status
    Admin only endpoint
    
    Returns:
        Detector mode, initialization status, and description
    """
    from app.parking_detector import ParkingDetectorService
    
    status = ParkingDetectorService.get_status()
    return {
        "status": "success",
        "detector": status,
        "timestamp": datetime.now().isoformat()
    }


@router.post("/admin/save-parking-layout")
async def save_parking_layout(data: SaveParkingLayoutRequest):
    """
    Save parking layout (all detected spaces) to Firebase
    
    Args:
        data: Parking layout with lot_id and list of space polygons
        
    Returns:
        Success status
    """
    try:
        layout_data = {
            "lot_id": data.lot_id,
            "total_spaces": len(data.spaces),
            "spaces": data.spaces,
            "timestamp": datetime.now().isoformat()
        }
        
        # Save to Firebase
        success = firebase_db.save_parking_layout(data.lot_id, layout_data)
        
        return {
            "status": "success" if success else "failed",
            "lot_id": data.lot_id,
            "total_spaces": len(data.spaces),
            "message": "Parking layout saved successfully" if success else "Failed to save parking layout",
            "timestamp": layout_data["timestamp"]
        }
    
    except Exception as e:
        logger.error(f"Error saving parking layout: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/parking-layouts/{lot_id}")
async def get_parking_layout(lot_id: str):
    """
    Get saved parking layout for a lot
    
    Args:
        lot_id: Parking lot identifier
        
    Returns:
        Saved parking layout with all space polygons
    """
    try:
        layout = firebase_db.get_parking_layout(lot_id)
        
        if not layout:
            raise HTTPException(status_code=404, detail="Parking layout not found")
        
        return {
            "lot_id": lot_id,
            "layout": layout,
            "timestamp": datetime.now().isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting parking layout: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/get-all-spaces")
async def get_all_spaces_in_image(image_base64: str):
    """
    Get all detected parking spaces in an image
    
    Args:
        image_base64: Base64 encoded image
        
    Returns:
        All detected parking spaces with polygons
    """
    try:
        from app.parking_detector import ParkingDetectorService
        
        result = ParkingDetectorService.get_all_spaces(image_base64=image_base64)
        
        return {
            "detections": result,
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error getting all spaces: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

