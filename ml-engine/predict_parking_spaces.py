import os
import cv2
import numpy as np
from pathlib import Path
from typing import List, Dict, Tuple
import logging

from super_gradients.training import models
from super_gradients.training.models.detection_models.pp_yolo_e import (
    PPYoloEPostPredictionCallback
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class ParkingSpacePredictor:
    """Predict parking spaces using trained YOLO-NAS model"""
    
    CLASSES = ['free_parking_space', 'not_free_parking_space', 'partially_free_parking_space']
    NUM_CLASSES = len(CLASSES)
    MODEL_NAME = 'yolo_nas_l'
    
    def __init__(self, checkpoint_path: str, conf_threshold: float = 0.4):
        """
        Initialize predictor with trained model
        
        Args:
            checkpoint_path: Path to trained model checkpoint (.pth file)
            conf_threshold: Confidence threshold for predictions
        """
        self.checkpoint_path = checkpoint_path
        self.conf_threshold = conf_threshold
        self.model = self._load_model()
        logger.info(f"Model loaded from {checkpoint_path}")
    
    def _load_model(self):
        """Load trained YOLO-NAS model"""
        model = models.get(
            self.MODEL_NAME,
            num_classes=self.NUM_CLASSES,
            checkpoint_path=self.checkpoint_path
        )
        return model
    
    def predict_image(self, image_path: str) -> Dict:
        """
        Predict parking spaces in a single image
        
        Args:
            image_path: Path to image file
            
        Returns:
            Dict with predictions and visualizations
        """
        logger.info(f"Predicting image: {image_path}")
        
        # Read image
        image = cv2.imread(image_path)
        if image is None:
            logger.error(f"Failed to read image: {image_path}")
            return {"error": "Failed to read image"}
        
        # Run prediction
        predictions = self.model.predict(image_path, conf=self.conf_threshold)
        
        return {
            "image_path": image_path,
            "predictions": predictions,
            "num_predictions": len(predictions.prediction.bboxes_xyxy)
        }
    
    def predict_batch(self, image_paths: List[str]) -> List[Dict]:
        """
        Predict parking spaces in multiple images
        
        Args:
            image_paths: List of image file paths
            
        Returns:
            List of prediction dictionaries
        """
        logger.info(f"Predicting batch of {len(image_paths)} images")
        
        # Run batch prediction
        predictions = self.model.predict(image_paths, conf=self.conf_threshold)
        
        results = []
        for idx, pred in enumerate(predictions):
            results.append({
                "image_path": image_paths[idx],
                "predictions": pred,
                "num_detections": len(pred.prediction.bboxes_xyxy)
            })
        
        return results
    
    def detect_space_at_point(
        self, 
        image: np.ndarray, 
        click_x: int, 
        click_y: int,
        threshold: int = 100
    ) -> Dict:
        """
        Detect parking space at clicked point
        
        Args:
            image: Image as numpy array (BGR format)
            click_x: X coordinate of click
            click_y: Y coordinate of click
            threshold: Distance threshold to find nearest detection (pixels)
            
        Returns:
            Dict with detected space polygon and metadata
        """
        # Run detection on image
        predictions = self.model.predict(image, conf=self.conf_threshold)
        
        if len(predictions) == 0 or len(predictions.prediction.bboxes_xyxy) == 0:
            return {"found": False, "message": "No parking spaces detected"}
        
        bboxes = predictions.prediction.bboxes_xyxy
        confidences = predictions.prediction.confidence
        class_ids = predictions.prediction.class_ids
        
        # Find nearest detection to click point
        min_distance = float('inf')
        nearest_idx = -1
        
        for idx, bbox in enumerate(bboxes):
            x1, y1, x2, y2 = bbox
            # Calculate centroid
            cx = (x1 + x2) / 2
            cy = (y1 + y2) / 2
            
            # Calculate distance to click point
            distance = np.sqrt((cx - click_x)**2 + (cy - click_y)**2)
            
            if distance < min_distance:
                min_distance = distance
                nearest_idx = idx
        
        # Check if nearest detection is within threshold
        if min_distance > threshold:
            return {
                "found": False,
                "message": f"No parking space within {threshold}px of click point"
            }
        
        # Extract detected space info
        bbox = bboxes[nearest_idx]
        x1, y1, x2, y2 = bbox
        
        # Convert bbox to polygon (4 corners)
        polygon = [
            [int(x1), int(y1)],  # Top-left
            [int(x2), int(y1)],  # Top-right
            [int(x2), int(y2)],  # Bottom-right
            [int(x1), int(y2)]   # Bottom-left
        ]
        
        class_id = int(class_ids[nearest_idx])
        confidence = float(confidences[nearest_idx])
        space_class = self.CLASSES[class_id]
        
        return {
            "found": True,
            "polygon": polygon,
            "confidence": confidence,
            "space_class": space_class,
            "bbox": [int(x1), int(y1), int(x2), int(y2)],
            "distance_from_click": float(min_distance)
        }
    
    def get_all_detections(self, image: np.ndarray) -> Dict:
        """
        Get all parking space detections in image
        
        Args:
            image: Image as numpy array (BGR format)
            
        Returns:
            Dict with all detections
        """
        predictions = self.model.predict(image, conf=self.conf_threshold)
        
        if len(predictions) == 0 or len(predictions.prediction.bboxes_xyxy) == 0:
            return {"detections": [], "count": 0}
        
        bboxes = predictions.prediction.bboxes_xyxy
        confidences = predictions.prediction.confidence
        class_ids = predictions.prediction.class_ids
        
        detections = []
        for idx, bbox in enumerate(bboxes):
            x1, y1, x2, y2 = bbox
            polygon = [
                [int(x1), int(y1)],
                [int(x2), int(y1)],
                [int(x2), int(y2)],
                [int(x1), int(y2)]
            ]
            
            class_id = int(class_ids[idx])
            
            detections.append({
                "space_id": idx + 1,
                "polygon": polygon,
                "confidence": float(confidences[idx]),
                "space_class": self.CLASSES[class_id],
                "bbox": [int(x1), int(y1), int(x2), int(y2)]
            })
        
        return {
            "detections": detections,
            "count": len(detections),
            "class_distribution": self._get_class_distribution(class_ids)
        }
    
    def _get_class_distribution(self, class_ids):
        """Get distribution of detected classes"""
        distribution = {cls: 0 for cls in self.CLASSES}
        for class_id in class_ids:
            distribution[self.CLASSES[int(class_id)]] += 1
        return distribution


def main():
    """Example usage of predictor"""
    
    # Path to trained model checkpoint
    model_checkpoint = "ml-engine/checkpoints/parking_space_detection/average_model.pth"
    
    # Initialize predictor
    predictor = ParkingSpacePredictor(
        checkpoint_path=model_checkpoint,
        conf_threshold=0.4
    )
    
    # Example: Predict on image
    test_image_path = "test_image.jpg"  # Replace with your test image
    
    if os.path.exists(test_image_path):
        # Predict all spaces
        result = predictor.predict_image(test_image_path)
        print("Full Prediction Result:")
        print(result)
        
        # Detect space at specific click point
        image = cv2.imread(test_image_path)
        space_result = predictor.detect_space_at_point(
            image=image,
            click_x=150,
            click_y=200,
            threshold=100
        )
        print("\nDetection at point (150, 200):")
        print(space_result)
    else:
        logger.warning(f"Test image not found: {test_image_path}")


if __name__ == "__main__":
    main()
