import os
import base64
import cv2
import numpy as np
from typing import Dict, Optional
import logging
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../ml-engine'))

logger = logging.getLogger(__name__)


class ParkingDetectorService:
    """Service to handle parking space detection with smart fallback"""
    
    _instance: Optional['ParkingSpacePredictor'] = None
    _model_path: Optional[str] = None
    _mode: str = "uninitialized"  # uninitialized, fallback, checkpoint, error
    
    @classmethod
    def initialize(cls, model_path: str = None):
        """Initialize detector - use trained model first"""
        if cls._instance is not None:
            logger.info("ℹ Parking detector already initialized")
            return
        
        try:
            # Use demo mode for testing
            logger.info("📥 Using demo mode for testing...")
            cls._mode = "demo"
            cls._instance = None
            logger.info("ℹ Using demo mode - parking detector will return realistic test data")
                
        except Exception as e:
            logger.error(f"❌ Failed to initialize parking detector: {str(e)}")
            cls._mode = "error"
            cls._instance = None
    
    @classmethod
    def get_instance(cls):
        """Get detector instance"""
        if cls._instance is None and cls._mode == "uninitialized":
            logger.info("🔄 Auto-initializing parking detector...")
            cls.initialize()
        return cls._instance
    
    @classmethod
    def get_mode(cls) -> str:
        """Get current detector mode"""
        return cls._mode
    
    @classmethod
    def detect_space_at_point(
        cls,
        image_base64: str,
        click_x: int,
        click_y: int
    ) -> Dict:
        """
        Detect parking spaces at clicked point
        Uses demo mode for realistic test detections
        """
        try:
            # Auto-initialize if needed
            if cls._mode == "uninitialized":
                cls.initialize()
            
            # In demo mode, always return demo detections (multiple spaces)
            if cls._mode == "demo":
                return cls._generate_demo_detection(click_x, click_y)
            
            detector = cls.get_instance()
            
            if detector is None:
                # Error state
                return {"found": False, "error": "Detector not available", "message": "Model initialization failed"}
            
            # Decode base64 image
            image_data = base64.b64decode(image_base64)
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return {"found": False, "error": "Invalid image data"}
            
            # For checkpoint mode, use the actual prediction
            if cls._mode == "checkpoint":
                from predict_parking_spaces import ParkingSpacePredictor
                result = detector.detect_space_at_point(
                    image=image,
                    click_x=click_x,
                    click_y=click_y,
                    threshold=100
                )
                return result
            
            # Fallback for unknown mode
            return cls._generate_demo_detection(click_x, click_y)
            
        except Exception as e:
            logger.error(f"❌ Error detecting space: {str(e)}")
            return {"found": False, "error": str(e), "message": "Detection failed"}
    
    @classmethod
    def _generate_demo_detection(cls, click_x: int, click_y: int) -> Dict:
        """Generate demo detection for testing - returns INDIVIDUAL parking spaces"""
        import random
        
        # Generate 3-6 individual parking spaces in a grid-like pattern
        num_spaces = random.randint(3, 5)
        spaces = []
        
        # Create a grid starting from click point
        cols = random.randint(2, 3)
        rows = (num_spaces + cols - 1) // cols
        
        space_width = random.randint(80, 120)
        space_height = random.randint(130, 180)
        
        spacing_x = space_width + random.randint(10, 30)
        spacing_y = space_height + random.randint(10, 30)
        
        start_x = max(0, click_x - (cols * spacing_x) // 2)
        start_y = max(0, click_y - (rows * spacing_y) // 2)
        
        for i in range(num_spaces):
            row = i // cols
            col = i % cols
            
            x1 = start_x + col * spacing_x
            y1 = start_y + row * spacing_y
            x2 = x1 + space_width
            y2 = y1 + space_height
            
            # Add slight rotation effect by jittering corners slightly
            jitter = random.randint(0, 5)
            polygon = [
                [x1 + random.randint(-jitter, jitter), y1 + random.randint(-jitter, jitter)],
                [x2 + random.randint(-jitter, jitter), y1 + random.randint(-jitter, jitter)],
                [x2 + random.randint(-jitter, jitter), y2 + random.randint(-jitter, jitter)],
                [x1 + random.randint(-jitter, jitter), y2 + random.randint(-jitter, jitter)]
            ]
            
            space_class = random.choice(['free_parking_space', 'partially_free_parking_space'])
            confidence = random.uniform(0.75, 0.98)
            
            spaces.append({
                "polygon": polygon,
                "class": space_class,
                "confidence": confidence
            })
        
        return {
            "found": True,
            "spaces": spaces,
            "polygon": spaces[0]["polygon"],  # Primary space for backward compatibility
            "confidence": confidence,
            "space_class": space_class,
            "bbox": [x1, y1, x2, y2],
            "distance_from_click": 5.0,
            "demo_mode": True,
            "message": "Demo detection - model not trained yet"
        }
    
    @classmethod
    def get_status(cls) -> Dict:
        """Get detector status information"""
        return {
            "mode": cls._mode,
            "initialized": cls._instance is not None,
            "checkpoint_path": cls._model_path,
            "checkpoint_exists": os.path.exists("ml-engine/checkpoints/parking_space_detection/average_model.pth") if cls._model_path is None else os.path.exists(cls._model_path),
            "description": {
                "checkpoint": "Using trained model checkpoint",
                "fallback": "Using pre-trained YOLO-NAS from super-gradients",
                "demo": "Demo mode - generating test detections",
                "error": "Detector failed to initialize",
                "uninitialized": "Detector not yet initialized"
            }.get(cls._mode, "Unknown mode")
        }
