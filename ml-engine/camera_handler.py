"""
Camera handler for SmartPark ML Engine
Supports: Webcam, Video files (MP4, AVI, MOV), RTSP streams, IP cameras
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Union, Optional, Tuple
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CameraHandler:
    """Handle multiple camera sources for real-time and demo footage"""
    
    def __init__(self, source: Union[int, str]):
        """
        Initialize camera handler
        
        Args:
            source: 
                - 0 for default webcam
                - 1, 2, etc. for other cameras
                - "path/to/video.mp4" for video file
                - "rtsp://ip:port/stream" for RTSP stream (IP camera)
        
        Raises:
            ValueError: If source cannot be opened
        """
        self.source = source
        self.cap = None
        self.total_frames = 0
        self.fps = 30
        self.frame_width = 1920
        self.frame_height = 1080
        self.current_frame = 0
        self.is_video_file = False
        self._initialize_source()
    
    def _initialize_source(self):
        """Initialize the video source"""
        self.cap = cv2.VideoCapture(self.source)
        
        if not self.cap.isOpened():
            raise ValueError(f"Failed to open source: {self.source}")
        
        # Get video properties
        self.fps = int(self.cap.get(cv2.CAP_PROP_FPS)) or 30
        self.frame_width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.frame_height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Check if source is a video file
        if isinstance(self.source, str):
            self.is_video_file = self.source.endswith(('.mp4', '.avi', '.mov', '.mkv', '.flv'))
        
        # Log initialization
        if isinstance(self.source, int):
            logger.info(f"✓ Webcam {self.source} initialized")
        else:
            source_type = "Video file" if self.is_video_file else "Stream"
            logger.info(f"✓ {source_type} initialized: {self.source}")
        
        logger.info(f"  Resolution: {self.frame_width}x{self.frame_height}")
        logger.info(f"  FPS: {self.fps}")
        
        if self.total_frames > 0:
            duration = self.total_frames / self.fps
            logger.info(f"  Duration: {duration:.2f}s ({self.total_frames} frames)")
    
    @property
    def is_valid(self) -> bool:
        """Check if camera source is valid and opened"""
        return self.cap is not None and self.cap.isOpened()
    
    def get_frame(self) -> Optional[np.ndarray]:
        """
        Get next frame from source
        
        Returns:
            np.ndarray of frame or None if end of stream
        """
        ret, frame = self.cap.read()
        if ret:
            self.current_frame += 1
            return frame
        return None
    
    def get_progress(self) -> float:
        """
        Get progress percentage (for video files)
        
        Returns:
            Progress 0-100, or 0 for live streams
        """
        if self.total_frames > 0:
            return (self.current_frame / self.total_frames) * 100
        return 0
    
    def get_frame_count(self) -> int:
        """Get current frame number"""
        return self.current_frame
    
    def reset(self):
        """Reset to beginning (only for video files)"""
        if self.is_video_file:
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            self.current_frame = 0
            logger.info("✓ Reset to frame 0")
    
    def seek_to_frame(self, frame_num: int):
        """
        Seek to specific frame (video files only)
        
        Args:
            frame_num: Frame number to seek to
        """
        if self.is_video_file:
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
            self.current_frame = frame_num
    
    def seek_to_time(self, seconds: float):
        """
        Seek to specific time (video files only)
        
        Args:
            seconds: Time in seconds to seek to
        """
        if self.is_video_file and self.fps > 0:
            frame_num = int(seconds * self.fps)
            self.seek_to_frame(frame_num)
    
    def release(self):
        """Release the video source"""
        if self.cap:
            self.cap.release()
            logger.info("✓ Camera released")
    
    def __enter__(self):
        return self
    
    def __exit__(self, *args):
        self.release()
    
    def get_info(self) -> dict:
        """Get camera information"""
        return {
            "source": str(self.source),
            "type": "video_file" if self.is_video_file else ("webcam" if isinstance(self.source, int) else "stream"),
            "resolution": (self.frame_width, self.frame_height),
            "fps": self.fps,
            "total_frames": self.total_frames,
            "current_frame": self.current_frame,
            "duration": self.total_frames / self.fps if self.total_frames > 0 else 0,
            "progress": self.get_progress()
        }


class VideoWriter:
    """Helper class for writing annotated videos"""
    
    def __init__(self, output_path: str, fps: float, frame_size: Tuple[int, int]):
        """
        Initialize video writer
        
        Args:
            output_path: Path to save video
            fps: Frames per second
            frame_size: (width, height)
        """
        self.output_path = output_path
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        self.writer = cv2.VideoWriter(output_path, fourcc, fps, frame_size)
        
        if not self.writer.isOpened():
            raise ValueError(f"Failed to open video writer for {output_path}")
        
        logger.info(f"✓ Video writer initialized: {output_path}")
    
    def write(self, frame: np.ndarray) -> bool:
        """Write frame to video"""
        self.writer.write(frame)
        return True
    
    def release(self):
        """Release writer"""
        if self.writer:
            self.writer.release()
            logger.info(f"✓ Video saved: {self.output_path}")
    
    def __enter__(self):
        return self
    
    def __exit__(self, *args):
        self.release()


# Utility functions
def is_video_file(source: str) -> bool:
    """Check if source is a video file"""
    if not isinstance(source, str):
        return False
    return source.endswith(('.mp4', '.avi', '.mov', '.mkv', '.flv', '.webm'))


def is_rtsp_stream(source: str) -> bool:
    """Check if source is an RTSP stream"""
    if not isinstance(source, str):
        return False
    return source.startswith(('rtsp://', 'http://', 'https://'))


def validate_source(source: Union[int, str]) -> bool:
    """Validate camera source without opening"""
    if isinstance(source, int):
        return True
    
    if isinstance(source, str):
        if is_rtsp_stream(source):
            return True
        if is_video_file(source):
            return Path(source).exists()
    
    return False
