"""
Enhanced Parking Space Detector v2
Supports video files, live webcam, and RTSP streams
"""

import cv2
import numpy as np
from typing import List, Dict, Optional, Callable
import logging
from datetime import datetime
from camera_handler import CameraHandler, VideoWriter

# Handle PyTorch 2.6+ weights loading BEFORE importing YOLO
try:
    import torch
    from ultralytics.nn import tasks
    
    # Monkey-patch torch_safe_load to disable weights_only check
    original_safe_load = tasks.torch_safe_load
    def patched_safe_load(weights, device=None):
        try:
            ckpt = torch.load(weights, map_location="cpu", weights_only=False)
            return ckpt, weights
        except:
            return original_safe_load(weights, device) if device else original_safe_load(weights)
    tasks.torch_safe_load = patched_safe_load
except:
    pass

from ultralytics import YOLO

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ParkingDetectorV2:
    """
    Enhanced parking detector with multi-source support
    Can process video files, webcam, or RTSP streams
    """
    
    def __init__(self, model_path: str = "yolov8n.pt", confidence: float = 0.5):
        """
        Initialize detector
        
        Args:
            model_path: Path to YOLOv8 model
            confidence: Detection confidence threshold (0-1)
        """
        self.model = YOLO(model_path)
        self.confidence = confidence
        logger.info(f"✓ YOLOv8 detector loaded: {model_path}")
    
    def detect_vehicles(self, frame: np.ndarray) -> List[Dict]:
        """
        Detect vehicles in a frame
        
        Args:
            frame: Input frame (BGR format)
        
        Returns:
            List of detections with bounding boxes and confidence scores
        """
        results = self.model(frame, conf=self.confidence, verbose=False)
        detections = []
        
        for result in results:
            for box in result.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                confidence = float(box.conf)
                class_id = int(box.cls)
                
                # Calculate center
                cx = (x1 + x2) // 2
                cy = (y1 + y2) // 2
                
                # Calculate area
                area = (x2 - x1) * (y2 - y1)
                
                detections.append({
                    'bbox': (x1, y1, x2, y2),
                    'confidence': confidence,
                    'class_id': class_id,
                    'center': (cx, cy),
                    'area': area
                })
        
        return detections
    
    def _draw_detections(self, frame: np.ndarray, detections: List[Dict]) -> np.ndarray:
        """
        Draw bounding boxes and info on frame
        
        Args:
            frame: Input frame
            detections: List of detections
        
        Returns:
            Annotated frame
        """
        annotated = frame.copy()
        
        for det in detections:
            x1, y1, x2, y2 = det['bbox']
            conf = det['confidence']
            
            # Draw bounding box (green)
            color = (0, 255, 0)
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            
            # Draw confidence
            label = f"{conf:.2f}"
            cv2.putText(annotated, label, (x1, y1 - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        
        return annotated
    
    def process_source(self, 
                      source: str,
                      output_video: Optional[str] = None,
                      callback: Optional[Callable] = None,
                      display: bool = True,
                      skip_frames: int = 0) -> Dict:
        """
        Process video/camera source
        
        Args:
            source: 0 for webcam, path to video, or RTSP URL
            output_video: Path to save annotated video (optional)
            callback: Function called for each frame with results
            display: Whether to display video while processing
            skip_frames: Process every Nth frame (for speed)
        
        Returns:
            Processing statistics
        """
        stats = {
            'total_frames': 0,
            'frames_processed': 0,
            'total_detections': 0,
            'avg_detections_per_frame': 0,
            'processing_time': 0,
            'source_info': None
        }
        
        try:
            with CameraHandler(source) as camera:
                stats['source_info'] = camera.get_info()
                logger.info(f"Processing: {camera.get_info()}")
                
                video_writer = None
                if output_video:
                    video_writer = VideoWriter(
                        output_video,
                        camera.fps,
                        (camera.frame_width, camera.frame_height)
                    )
                
                frame_count = 0
                detection_count = 0
                
                while True:
                    frame = camera.get_frame()
                    if frame is None:
                        break
                    
                    stats['total_frames'] += 1
                    
                    # Skip frames if requested
                    if skip_frames > 0 and frame_count % (skip_frames + 1) != 0:
                        frame_count += 1
                        continue
                    
                    # Detect vehicles
                    detections = self.detect_vehicles(frame)
                    detection_count += len(detections)
                    stats['total_detections'] += len(detections)
                    stats['frames_processed'] += 1
                    
                    # Draw annotations
                    annotated_frame = self._draw_detections(frame, detections)
                    
                    # Add info text
                    progress = camera.get_progress()
                    info_text = f"Frame: {camera.get_frame_count()} | Vehicles: {len(detections)} | Progress: {progress:.1f}%"
                    cv2.putText(annotated_frame, info_text, (10, 30),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                    
                    # Callback
                    if callback:
                        callback({
                            'frame_number': camera.get_frame_count(),
                            'detections': len(detections),
                            'detections_list': detections,
                            'progress': progress,
                            'confidence': self.confidence
                        })
                    
                    # Save to video
                    if video_writer:
                        video_writer.write(annotated_frame)
                    
                    # Display
                    if display:
                        cv2.imshow("SmartPark - Parking Detection", annotated_frame)
                        if cv2.waitKey(1) & 0xFF == ord('q'):
                            logger.info("User stopped processing")
                            break
                    
                    frame_count += 1
                
                # Cleanup
                if video_writer:
                    video_writer.release()
                
                if display:
                    cv2.destroyAllWindows()
                
                # Calculate statistics
                if stats['frames_processed'] > 0:
                    stats['avg_detections_per_frame'] = stats['total_detections'] / stats['frames_processed']
                
                logger.info(f"✓ Processing complete: {stats['frames_processed']} frames, {stats['total_detections']} vehicles detected")
                
                return stats
        
        except Exception as e:
            logger.error(f"Error processing source: {e}")
            raise
    
    def process_frame(self, frame: np.ndarray) -> Dict:
        """
        Process a single frame
        
        Args:
            frame: Input frame
        
        Returns:
            Dict with detections and annotated frame
        """
        detections = self.detect_vehicles(frame)
        annotated = self._draw_detections(frame, detections)
        
        return {
            'detections': detections,
            'count': len(detections),
            'frame': annotated
        }
    
    def estimate_occupancy(self, detections: List[Dict], total_spaces: int = 100) -> Dict:
        """
        Estimate parking lot occupancy from detections
        
        Args:
            detections: List of vehicle detections
            total_spaces: Total number of parking spaces
        
        Returns:
            Occupancy statistics
        """
        occupied = len(detections)
        available = max(0, total_spaces - occupied)
        percentage = (occupied / total_spaces * 100) if total_spaces > 0 else 0
        
        return {
            'occupied_count': occupied,
            'available_count': available,
            'total_spaces': total_spaces,
            'percentage': round(percentage, 2),
            'timestamp': datetime.now().isoformat()
        }


# Example usage
if __name__ == "__main__":
    detector = ParkingDetectorV2(confidence=0.5)
    
    # Example 1: Process webcam
    # stats = detector.process_source(0, display=True)
    
    # Example 2: Process demo video
    print("\n=== SmartPark Detector v2 ===\n")
    print("Usage examples:")
    print("1. Webcam:")
    print("   detector.process_source(0)")
    print("\n2. Video file:")
    print("   detector.process_source('parking_demo.mp4', output_video='output.mp4')")
    print("\n3. RTSP stream:")
    print("   detector.process_source('rtsp://192.168.1.100:554/stream')")
    print("\nPress 'q' to stop processing")
