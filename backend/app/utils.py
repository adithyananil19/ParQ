"""
Common utilities for backend
"""

import logging
from datetime import datetime
from typing import Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def get_logger(name: str) -> logging.Logger:
    """Get logger instance"""
    return logging.getLogger(name)

def format_response(data: Any, status: str = "success", message: str = "") -> Dict:
    """Format API response"""
    return {
        "status": status,
        "data": data,
        "message": message,
        "timestamp": datetime.now().isoformat()
    }

def calculate_occupancy_percentage(occupied: int, total: int) -> float:
    """Calculate occupancy percentage"""
    if total == 0:
        return 0.0
    return round((occupied / total) * 100, 2)
