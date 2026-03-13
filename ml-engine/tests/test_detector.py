"""
ML Engine Detector Tests
"""

import pytest
import numpy as np
from detector import ParkingSpaceDetector

@pytest.fixture
def detector():
    """Create detector instance for testing"""
    return ParkingSpaceDetector(confidence_threshold=0.5)

def test_detector_initialization(detector):
    """Test detector initialization"""
    assert detector is not None
    assert detector.confidence_threshold == 0.5

def test_get_occupancy_statistics():
    """Test occupancy statistics calculation"""
    detector = ParkingSpaceDetector()
    
    # Mock detections
    detections = [
        {'confidence': 0.95, 'bbox': (10, 20, 100, 200)},
        {'confidence': 0.92, 'bbox': (110, 20, 200, 200)},
        {'confidence': 0.88, 'bbox': (210, 20, 300, 200)},
    ]
    
    stats = detector.get_occupancy_statistics(detections)
    
    assert stats['total_vehicles'] == 3
    assert stats['average_confidence'] > 0
    assert 'detection_timestamp' in stats

# Additional tests will be added as features are developed
