"""
Lazy-loading YOLOv8 detector for the backend.
Loaded once on first use and reused for all requests.
"""

import cv2
import numpy as np
import logging
from pathlib import Path
from typing import Dict, List

logger = logging.getLogger(__name__)

# Vehicle class IDs in COCO dataset (used by yolov8n.pt)
VEHICLE_CLASSES = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}

_detector = None
_model_path = str(Path(__file__).parent.parent.parent / "ml-engine" / "yolov8n.pt")


def _get_detector():
    """Lazy-load the detector singleton."""
    global _detector
    if _detector is None:
        try:
            import torch
            try:
                from ultralytics.nn import tasks as _tasks
                _orig = _tasks.torch_safe_load
                def _patched(weights, device=None):
                    try:
                        ckpt = torch.load(weights, map_location="cpu", weights_only=False)
                        return ckpt, weights
                    except Exception:
                        return _orig(weights, device) if device else _orig(weights)
                _tasks.torch_safe_load = _patched
            except Exception:
                pass

            from ultralytics import YOLO
            _detector = YOLO(_model_path)
            logger.info(f"✓ YOLOv8 model loaded from {_model_path}")
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            raise RuntimeError(f"Could not load YOLOv8 model: {e}")
    return _detector


def analyze_image(image_bytes: bytes, confidence: float = 0.45) -> Dict:
    """
    Run vehicle detection on raw image bytes.

    Returns a dict with:
      - vehicles: list of detections [{class, confidence, bbox}]
      - vehicle_count: int
      - occupied_count: int  (same as vehicle_count)
      - confidence_avg: float
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Could not decode image")

    model = _get_detector()
    results = model(frame, conf=confidence, verbose=False)

    vehicles: List[Dict] = []
    for result in results:
        for box in result.boxes:
            cls_id = int(box.cls)
            if cls_id not in VEHICLE_CLASSES:
                continue
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            vehicles.append({
                "class": VEHICLE_CLASSES[cls_id],
                "confidence": round(float(box.conf), 3),
                "bbox": [x1, y1, x2, y2],
            })

    avg_conf = round(sum(v["confidence"] for v in vehicles) / len(vehicles), 3) if vehicles else 0.0

    return {
        "vehicles": vehicles,
        "vehicle_count": len(vehicles),
        "occupied_count": len(vehicles),
        "confidence_avg": avg_conf,
    }
