"""
Image preprocessing utilities for parking detection
"""

import cv2
import numpy as np
from typing import Tuple, Optional

def preprocess_frame(frame: np.ndarray, target_size: Tuple[int, int] = (640, 480)) -> np.ndarray:
    """
    Preprocess camera frame for detection
    
    Args:
        frame: Input frame (BGR)
        target_size: Target resolution (width, height)
    
    Returns:
        Preprocessed frame
    """
    # Resize frame
    resized = cv2.resize(frame, target_size)
    
    # Normalize pixel values
    normalized = resized.astype(np.float32) / 255.0
    
    return normalized

def enhance_image(frame: np.ndarray, brightness: float = 1.0, contrast: float = 1.0) -> np.ndarray:
    """
    Enhance image for better vehicle detection
    
    Args:
        frame: Input frame
        brightness: Brightness adjustment factor
        contrast: Contrast adjustment factor
    
    Returns:
        Enhanced frame
    """
    # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY))
    
    return enhanced

def detect_shadows(frame: np.ndarray, threshold: int = 50) -> np.ndarray:
    """
    Create shadow mask for removing shadows from detection
    
    Args:
        frame: Input frame
        threshold: Shadow threshold value
    
    Returns:
        Binary shadow mask
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    _, shadow_mask = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)
    
    return shadow_mask

class FramePreprocessor:
    """Utility class for frame preprocessing"""
    
    def __init__(self, target_size: Tuple[int, int] = (640, 480)):
        self.target_size = target_size
    
    def process(self, frame: np.ndarray) -> np.ndarray:
        """Complete preprocessing pipeline"""
        frame = preprocess_frame(frame, self.target_size)
        return frame
