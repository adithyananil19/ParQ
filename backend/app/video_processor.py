import logging
import os
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import cv2
import numpy as np
import torch
from datetime import datetime

logger = logging.getLogger(__name__)

# Model path
MODEL_PATH = os.path.join(os.path.dirname(__file__), "../models/best.pt")

# CRITICAL: Patch torch.load GLOBALLY before any model loading
_original_torch_load = torch.load

def _patched_torch_load(f, *args, **kwargs):
    """Intercept torch.load to disable weights_only for PyTorch 2.6+"""
    # Force weights_only=False for all model loads
    kwargs['weights_only'] = False
    return _original_torch_load(f, *args, **kwargs)

# Apply global patch
torch.load = _patched_torch_load
logger.info("Applied global torch.load patch to disable weights_only")

# NOW import YOLO after patch is applied
from ultralytics import YOLO

class VideoProcessor:
    """Process parking lot videos/images with YOLOv11 model"""
    
    def __init__(self, model_path: str = MODEL_PATH):
        """Initialize video processor with trained YOLO model"""
        self.model_path = model_path
        self.model = None
        self.confidence_threshold = 0.90  # Balanced threshold for consistent detection
        
        try:
            if os.path.exists(model_path):
                logger.info(f"Loading YOLO model from {model_path}")
                self.model = YOLO(model_path)
                logger.info("✓ YOLO model loaded successfully")
            else:
                logger.warning(f"Model file not found at {model_path}")
                logger.info("Please upload best.pt to backend/models/ directory")
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {str(e)}")
            self.model = None
    
    def process_image(self, image_path: str) -> Dict:
        """
        Process a single image file to detect parking spaces
        
        Args:
            image_path: Path to image file
            
        Returns:
            dict with detection results
        """
        if not self.model:
            return {"error": "Model not loaded", "status": "failed"}
        
        try:
            # Verify file exists and is readable
            if not os.path.exists(image_path):
                logger.error(f"Image file not found: {image_path}")
                return {"error": "Image file not found", "status": "failed"}
            
            file_size = os.path.getsize(image_path)
            logger.info(f"Reading image: {image_path}, size: {file_size} bytes")
            
            if file_size == 0:
                logger.error(f"Image file is empty: {image_path}")
                return {"error": "Image file is empty", "status": "failed"}
            
            # Read image with better error handling
            image = cv2.imread(image_path)
            if image is None:
                logger.error(f"Failed to decode image with cv2.imread: {image_path}")
                logger.error("File may be corrupted or not a valid image format")
                return {"error": "Failed to read image - file may be corrupted", "status": "failed"}
            
            logger.info(f"Image loaded successfully: shape={image.shape}, dtype={image.dtype}")
            
            # Run inference
            results = self.model(image, conf=self.confidence_threshold, verbose=False)
            result = results[0]
            
            # Parse detections
            detections = self._parse_detections(result)
            
            # Calculate statistics
            total_spaces = len(detections)
            occupied_spaces = sum(1 for d in detections if d["occupied"])
            available_spaces = total_spaces - occupied_spaces
            occupancy_rate = (occupied_spaces / total_spaces * 100) if total_spaces > 0 else 0
            
            logger.info(f"Image processed: {total_spaces} spaces, {occupied_spaces} occupied ({occupancy_rate:.1f}%)")
            
            return {
                "status": "success",
                "total_spaces": total_spaces,
                "occupied_spaces": occupied_spaces,
                "available_spaces": available_spaces,
                "occupancy_rate": round(occupancy_rate, 2),
                "detections": detections,
                "timestamp": datetime.now().isoformat()
            }
        
        except Exception as e:
            logger.error(f"Error processing image: {str(e)}")
            logger.exception("Full traceback:")
            return {"error": str(e), "status": "failed"}
    
    def process_video(self, video_path: str, skip_frames: int = 5) -> Dict:
        """
        Process video file to detect parking spaces across frames
        
        Args:
            video_path: Path to video file
            skip_frames: Process every nth frame (default: 5 for performance)
            
        Returns:
            dict with video analysis results
        """
        if not self.model:
            return {"error": "Model not loaded", "status": "failed"}
        
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                return {"error": "Could not open video file", "status": "failed"}
            
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = 0
            processed_count = 0
            
            all_detections = []
            occupancy_history = []
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                frame_count += 1
                
                # Skip frames for performance
                if frame_count % skip_frames != 0:
                    continue
                
                processed_count += 1
                
                # Run inference
                results = self.model(frame, conf=self.confidence_threshold, verbose=False)
                result = results[0]
                
                # Parse detections
                detections = self._parse_detections(result)
                all_detections.extend(detections)
                
                # Calculate occupancy rate for this frame
                if detections:
                    occupied = sum(1 for d in detections if d["occupied"])
                    occupancy_rate = occupied / len(detections) * 100
                    occupancy_history.append({
                        "frame": frame_count,
                        "occupancy_rate": round(occupancy_rate, 2),
                        "occupied_spaces": occupied,
                        "total_spaces": len(detections)
                    })
            
            cap.release()
            
            # Calculate overall statistics
            avg_occupancy = sum(h["occupancy_rate"] for h in occupancy_history) / len(occupancy_history) if occupancy_history else 0
            
            logger.info(f"Video processed: {processed_count}/{total_frames} frames analyzed")
            logger.info(f"Average occupancy: {avg_occupancy:.1f}%")
            
            return {
                "status": "success",
                "video_path": video_path,
                "total_frames": total_frames,
                "fps": round(fps, 2),
                "processed_frames": processed_count,
                "average_occupancy": round(avg_occupancy, 2),
                "occupancy_history": occupancy_history,
                "detections_sample": all_detections[:100],  # Send sample for UI
                "timestamp": datetime.now().isoformat()
            }
        
        except Exception as e:
            logger.error(f"Error processing video: {str(e)}")
            return {"error": str(e), "status": "failed"}
    
    def process_stream_frame(self, frame: np.ndarray) -> Dict:
        """
        Process a single frame from live stream
        
        Args:
            frame: numpy array representing frame
            
        Returns:
            dict with detection results
        """
        if not self.model:
            return {"error": "Model not loaded", "status": "failed"}
        
        try:
            results = self.model(frame, conf=self.confidence_threshold, verbose=False)
            result = results[0]
            
            detections = self._parse_detections(result)
            
            total_spaces = len(detections)
            occupied_spaces = sum(1 for d in detections if d["occupied"])
            available_spaces = total_spaces - occupied_spaces
            occupancy_rate = (occupied_spaces / total_spaces * 100) if total_spaces > 0 else 0
            
            return {
                "status": "success",
                "total_spaces": total_spaces,
                "occupied_spaces": occupied_spaces,
                "available_spaces": available_spaces,
                "occupancy_rate": round(occupancy_rate, 2),
                "detections": detections,
                "timestamp": datetime.now().isoformat()
            }
        
        except Exception as e:
            logger.error(f"Error processing stream frame: {str(e)}")
            return {"error": str(e), "status": "failed"}
    
    def _parse_detections(self, result) -> List[Dict]:
        """
        Parse YOLO detection results
        
        Args:
            result: YOLO detection result object
            
        Returns:
            list of detection dictionaries
        """
        detections = []
        
        if result.boxes is not None:
            for box in result.boxes:
                # Extract box coordinates
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = box.conf[0].item()
                cls = int(box.cls[0].item())
                
                # Determine if space is occupied (class 1 = occupied, class 0 = empty)
                occupied = cls == 1
                
                detection = {
                    "box": {
                        "x1": round(x1, 2),
                        "y1": round(y1, 2),
                        "x2": round(x2, 2),
                        "y2": round(y2, 2),
                        "width": round(x2 - x1, 2),
                        "height": round(y2 - y1, 2)
                    },
                    "confidence": round(conf, 3),
                    "class": cls,
                    "occupied": occupied,
                    "status": "occupied" if occupied else "available"
                }
                detections.append(detection)
        
        return detections
    
    def get_model_status(self) -> Dict:
        """Get current model status"""
        return {
            "model_loaded": self.model is not None,
            "model_path": self.model_path,
            "model_exists": os.path.exists(self.model_path),
            "confidence_threshold": self.confidence_threshold
        }


# Global processor instance
_processor: Optional[VideoProcessor] = None

def get_processor() -> VideoProcessor:
    """Get or create global video processor instance"""
    global _processor
    if _processor is None:
        _processor = VideoProcessor()
    return _processor

def reload_processor():
    """Reload processor (useful after uploading new model)"""
    global _processor
    _processor = VideoProcessor()
    return _processor
