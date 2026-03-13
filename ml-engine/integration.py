"""
ML Engine Integration with Backend API
Detects vehicles in video/camera sources and pushes to Firebase via backend API
"""

import argparse
import asyncio
import aiohttp
import logging
from pathlib import Path
from typing import Optional
import sys
import time
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from camera_handler import CameraHandler
from detector_v2 import ParkingDetectorV2

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MLBackendIntegration:
    """Integrates ML detection with backend API"""
    
    def __init__(self, api_url: str = "http://localhost:8000", lot_id: str = "default"):
        """
        Initialize integration
        
        Args:
            api_url: Backend API URL
            lot_id: Parking lot identifier
        """
        self.api_url = api_url
        self.lot_id = lot_id
        self.detector = ParkingDetectorV2()
        self.session = None
        self.is_running = False
        
    async def initialize(self):
        """Initialize async session"""
        self.session = aiohttp.ClientSession()
        
    async def close(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()
    
    async def push_occupancy_to_backend(self, occupancy_data: dict):
        """
        Push occupancy data to backend API
        
        Args:
            occupancy_data: Occupancy data with occupied/available/total
            
        Returns:
            Response from backend
        """
        endpoint = f"{self.api_url}/api/v1/parking/{self.lot_id}/occupancy"
        
        try:
            async with self.session.post(endpoint, json=occupancy_data) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    percentage = (occupancy_data['occupied_count'] / occupancy_data['total_spaces'] * 100) if occupancy_data['total_spaces'] > 0 else 0
                    logger.info(f"✓ Pushed to backend: {percentage:.1f}% occupied")
                    return result
                else:
                    error = await resp.text()
                    logger.error(f"✗ Backend error ({resp.status}): {error}")
                    return None
        except aiohttp.ClientError as e:
            logger.error(f"Connection error: {e}")
            return None
    
    async def process_source(self, source: str, output_path: Optional[str] = None, 
                            skip_frames: int = 1, push_interval: int = 5):
        """
        Process video/camera source and push results to backend
        
        Args:
            source: Video file path, webcam (0), or RTSP stream URL
            output_path: Optional output video file path
            skip_frames: Process every Nth frame
            push_interval: Seconds between backend API pushes
        """
        logger.info(f"Starting detection on: {source}")
        logger.info(f"Backend: {self.api_url} | Lot: {self.lot_id}")
        
        camera = CameraHandler(source)
        if not camera.is_valid:
            logger.error(f"Failed to open source: {source}")
            return
        
        frame_count = 0
        detection_count = 0
        last_push_time = time.time()
        occupancy_history = []
        
        writer = None
        if output_path:
            writer = camera.VideoWriter(output_path)
            logger.info(f"Writing output to: {output_path}")
        
        # Processing loop
        while True:
            frame = camera.get_frame()
            if frame is None:
                break
            
            frame_count += 1
            
            # Skip frames for performance
            if frame_count % skip_frames != 0:
                continue
            
            # Detect vehicles
            detections = self.detector.detect_vehicles(frame)
            detection_count += len(detections)
            
            # Estimate occupancy
            occupancy = self.detector.estimate_occupancy(detections, total_spaces=100)
            occupancy_history.append(occupancy)
            
            # Draw detections on frame
            annotated_frame = self.detector._draw_detections(frame, detections)
            
            # Write output if enabled
            if writer:
                writer.write(annotated_frame)
            
            # Push to backend periodically
            current_time = time.time()
            if current_time - last_push_time >= push_interval:
                # Average occupancy over the interval
                avg_occupancy = {
                    'occupied_count': int(sum(o['occupied_count'] for o in occupancy_history) / len(occupancy_history)) if occupancy_history else 0,
                    'available_count': int(sum(o['available_count'] for o in occupancy_history) / len(occupancy_history)) if occupancy_history else 0,
                    'total_spaces': 100,
                    'confidence': 0.85
                }
                
                await self.push_occupancy_to_backend(avg_occupancy)
                occupancy_history = []
                last_push_time = current_time
            
            # Log progress for video files
            progress = camera.get_progress()
            if progress > 0:
                logger.info(f"Progress: {progress:.1f}% | Frames: {frame_count} | Detections: {detection_count}")
        
        # Cleanup
        if writer:
            writer.release()
        camera.release()
        
        logger.info(f"Completed: {frame_count} frames processed, {detection_count} vehicles detected")

async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="SmartPark ML Engine - Backend Integration",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Process webcam and send to backend
  python integration.py --source 0 --api http://localhost:8000
  
  # Process video file with output
  python integration.py --source demo.mp4 --output output.mp4 --skip-frames 2
  
  # Process RTSP stream
  python integration.py --source rtsp://camera-ip:554/stream --api http://camera-server:8000
        """
    )
    
    parser.add_argument("--source", default="0", help="Video file, webcam (0), or RTSP stream")
    parser.add_argument("--api", default="http://localhost:8000", help="Backend API URL")
    parser.add_argument("--lot", default="default", help="Parking lot ID")
    parser.add_argument("--output", help="Output video file path")
    parser.add_argument("--skip-frames", type=int, default=1, help="Process every Nth frame")
    parser.add_argument("--push-interval", type=int, default=5, help="Seconds between API pushes")
    
    args = parser.parse_args()
    
    # Convert source (handle webcam int)
    source = args.source
    if source.isdigit():
        source = int(source)
    
    # Initialize integration
    integration = MLBackendIntegration(api_url=args.api, lot_id=args.lot)
    
    try:
        await integration.initialize()
        await integration.process_source(
            source=source,
            output_path=args.output,
            skip_frames=args.skip_frames,
            push_interval=args.push_interval
        )
    finally:
        await integration.close()

if __name__ == "__main__":
    asyncio.run(main())
