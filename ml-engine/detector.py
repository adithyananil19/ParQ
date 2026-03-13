"""
Parking Space Detector using YOLOv8
Main detection engine for identifying occupied and vacant parking spaces
"""

import cv2
import numpy as np
from typing import List, Tuple, Dict, Optional
from ultralytics import YOLO
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ParkingSpaceDetector:
    """
    Detects parking space occupancy using YOLOv8
    """
    
    def __init__(self, model_path: str = "yolov8n.pt", confidence_threshold: float = 0.5):
        """
        Initialize the parking detector
        
        Args:
            model_path: Path to YOLOv8 model weights
            confidence_threshold: Minimum confidence for detections
        """
        self.model = YOLO(model_path)
        self.confidence_threshold = confidence_threshold
        self.parking_spaces = {}
        
        logger.info(f"Parking detector initialized with model: {model_path}")
    
    def detect_vehicles(self, frame: np.ndarray) -> List[Dict]:
        """
        Detect vehicles in a frame using YOLOv8
        
        Args:
            frame: Input image/frame (BGR format)
        
        Returns:
            List of detections with bounding boxes and confidence
        """
        results = self.model(frame, conf=self.confidence_threshold)
        
        detections = []
        for result in results:
            for box in result.boxes:
                # Extract bounding box coordinates
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                confidence = float(box.conf)
                class_id = int(box.cls)
                
                detections.append({
                    'bbox': (x1, y1, x2, y2),
                    'confidence': confidence,
                    'class_id': class_id,
                    'center': ((x1 + x2) // 2, (y1 + y2) // 2)
                })
        
        logger.debug(f"Detected {len(detections)} vehicles")
        return detections
    
    def analyze_parking_lot(self, frame: np.ndarray, parking_mask: Optional[np.ndarray] = None) -> Dict:
        """
        Analyze entire parking lot for occupancy
        
        Args:
            frame: Input frame from camera
            parking_mask: Optional mask defining parking space regions
        
        Returns:
            Dictionary with occupancy analysis
        """
        detections = self.detect_vehicles(frame)
        
        # Placeholder for advanced occupancy analysis
        # In production, this would use parking space ROIs and spatial analysis
        
        analysis = {
            'timestamp': datetime.now().isoformat(),
            'total_detections': len(detections),
            'vehicles_detected': detections,
            'frame_shape': frame.shape,
        }
        
        return analysis
    
    def track_parking_spaces(self, frame: np.ndarray) -> Dict[str, bool]:
        """
        Track occupancy status of defined parking spaces
        
        Args:
            frame: Input frame from camera
        
        Returns:
            Dictionary mapping space_id to occupancy status
        """
        detections = self.detect_vehicles(frame)
        occupancy_status = {}
        
        # Placeholder for space-specific tracking
        # This would integrate with a parking space ROI configuration
        
        return occupancy_status
    
    def get_occupancy_statistics(self, detections: List[Dict]) -> Dict:
        """
        Calculate parking lot statistics from detections
        
        Args:
            detections: List of vehicle detections
        
        Returns:
            Statistics dictionary
        """
        total_vehicles = len(detections)
        avg_confidence = np.mean([d['confidence'] for d in detections]) if detections else 0
        
        return {
            'total_vehicles': total_vehicles,
            'average_confidence': float(avg_confidence),
            'detection_timestamp': datetime.now().isoformat()
        }

def load_model(model_path: str) -> ParkingSpaceDetector:
    """Factory function to load and initialize detector"""
    return ParkingSpaceDetector(model_path)
