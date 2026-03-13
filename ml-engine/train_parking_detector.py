import os
import random
import torch
import logging
from pathlib import Path

from super_gradients.training import Trainer, dataloaders, models
from super_gradients.training.losses import PPYoloELoss
from super_gradients.training.metrics import DetectionMetrics_050

from super_gradients.training.dataloaders.dataloaders import (
    coco_detection_yolo_format_train, 
    coco_detection_yolo_format_val
)

from super_gradients.training.models.detection_models.pp_yolo_e import (
    PPYoloEPostPredictionCallback
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class ParkingDetectorConfig:
    """Configuration for parking space detector training"""
    
    # Trainer params
    CHECKPOINT_DIR = 'ml-engine/checkpoints'
    EXPERIMENT_NAME = 'parking_space_detection'
    
    # Dataset params - adjust these paths based on your data location
    DATA_DIR = './datasets'  # Parent directory where data lives
    TRAIN_IMAGES_DIR = 'train/images'
    TRAIN_LABELS_DIR = 'train/labels'
    VAL_IMAGES_DIR = 'valid/images'
    VAL_LABELS_DIR = 'valid/labels'
    TEST_IMAGES_DIR = 'test/images'
    TEST_LABELS_DIR = 'test/labels'
    
    # Classes - exactly as in Kaggle notebook
    CLASSES = ['free_parking_space', 'not_free_parking_space', 'partially_free_parking_space']
    NUM_CLASSES = len(CLASSES)
    
    # Dataloader params
    DATALOADER_PARAMS = {
        'batch_size': 4,
        'num_workers': 2
    }
    
    # Model params
    MODEL_NAME = 'yolo_nas_l'  # Choose from: yolo_nas_s, yolo_nas_m, yolo_nas_l
    PRETRAINED_WEIGHTS = 'coco'


def setup_directories():
    """Create checkpoint directory if it doesn't exist"""
    os.makedirs(ParkingDetectorConfig.CHECKPOINT_DIR, exist_ok=True)
    logger.info(f"Checkpoint directory: {ParkingDetectorConfig.CHECKPOINT_DIR}")


def load_dataloaders():
    """Load train, validation, and test dataloaders"""
    logger.info("Loading datasets...")
    
    train_data = coco_detection_yolo_format_train(
        dataset_params={
            'data_dir': ParkingDetectorConfig.DATA_DIR,
            'images_dir': ParkingDetectorConfig.TRAIN_IMAGES_DIR,
            'labels_dir': ParkingDetectorConfig.TRAIN_LABELS_DIR,
            'classes': ParkingDetectorConfig.CLASSES
        },
        dataloader_params=ParkingDetectorConfig.DATALOADER_PARAMS
    )
    
    val_data = coco_detection_yolo_format_val(
        dataset_params={
            'data_dir': ParkingDetectorConfig.DATA_DIR,
            'images_dir': ParkingDetectorConfig.VAL_IMAGES_DIR,
            'labels_dir': ParkingDetectorConfig.VAL_LABELS_DIR,
            'classes': ParkingDetectorConfig.CLASSES
        },
        dataloader_params=ParkingDetectorConfig.DATALOADER_PARAMS
    )
    
    test_data = coco_detection_yolo_format_val(
        dataset_params={
            'data_dir': ParkingDetectorConfig.DATA_DIR,
            'images_dir': ParkingDetectorConfig.TEST_IMAGES_DIR,
            'labels_dir': ParkingDetectorConfig.TEST_LABELS_DIR,
            'classes': ParkingDetectorConfig.CLASSES
        },
        dataloader_params=ParkingDetectorConfig.DATALOADER_PARAMS
    )
    
    logger.info("Datasets loaded successfully")
    return train_data, val_data, test_data


def load_model():
    """Load YOLO-NAS model with pre-trained weights"""
    logger.info(f"Loading {ParkingDetectorConfig.MODEL_NAME} with {ParkingDetectorConfig.PRETRAINED_WEIGHTS} weights...")
    
    model = models.get(
        ParkingDetectorConfig.MODEL_NAME,
        num_classes=ParkingDetectorConfig.NUM_CLASSES,
        pretrained_weights=ParkingDetectorConfig.PRETRAINED_WEIGHTS
    )
    
    logger.info("Model loaded successfully")
    return model


def get_training_params():
    """Get training parameters - exactly as Kaggle notebook"""
    train_params = {
        "average_best_models": True,
        "warmup_mode": "linear_epoch_step",
        "warmup_initial_lr": 1e-6,
        "lr_warmup_epochs": 3,
        "initial_lr": 5e-4,
        "lr_mode": "cosine",
        "cosine_final_lr_ratio": 0.1,
        "optimizer": "AdamW",
        "optimizer_params": {"weight_decay": 0.0001},
        "zero_weight_decay_on_bias_and_bn": True,
        "ema": True,
        "ema_params": {"decay": 0.9, "decay_type": "threshold"},
        "max_epochs": 30,
        "mixed_precision": True,
        "loss": PPYoloELoss(
            use_static_assigner=False,
            num_classes=ParkingDetectorConfig.NUM_CLASSES,
            reg_max=16
        ),
        "valid_metrics_list": [
            DetectionMetrics_050(
                score_thres=0.1,
                top_k_predictions=300,
                num_cls=ParkingDetectorConfig.NUM_CLASSES,
                normalize_targets=True,
                post_prediction_callback=PPYoloEPostPredictionCallback(
                    score_threshold=0.01,
                    nms_top_k=1000,
                    max_predictions=300,
                    nms_threshold=0.7
                )
            )
        ],
        "metric_to_watch": 'mAP@0.50'
    }
    return train_params


def train_model(model, train_data, val_data):
    """Train the parking space detector"""
    logger.info("Starting training...")
    
    trainer = Trainer(
        experiment_name=ParkingDetectorConfig.EXPERIMENT_NAME,
        ckpt_root_dir=ParkingDetectorConfig.CHECKPOINT_DIR
    )
    
    train_params = get_training_params()
    
    trainer.train(
        model=model,
        training_params=train_params,
        train_loader=train_data,
        valid_loader=val_data
    )
    
    logger.info("Training completed")
    return trainer


def test_model(best_model, test_data):
    """Test the trained model"""
    logger.info("Starting testing...")
    
    trainer = Trainer(
        experiment_name=ParkingDetectorConfig.EXPERIMENT_NAME,
        ckpt_root_dir=ParkingDetectorConfig.CHECKPOINT_DIR
    )
    
    trainer.test(
        model=best_model,
        test_loader=test_data,
        test_metrics_list=DetectionMetrics_050(
            score_thres=0.1,
            top_k_predictions=300,
            num_cls=ParkingDetectorConfig.NUM_CLASSES,
            normalize_targets=True,
            post_prediction_callback=PPYoloEPostPredictionCallback(
                score_threshold=0.01,
                nms_top_k=1000,
                max_predictions=300,
                nms_threshold=0.7
            )
        )
    )
    
    logger.info("Testing completed")


def main():
    """Main training pipeline"""
    setup_directories()
    
    # Load data
    train_data, val_data, test_data = load_dataloaders()
    
    # Load model
    model = load_model()
    
    # Train model
    trainer = train_model(model, train_data, val_data)
    
    # Load best model
    best_model = models.get(
        ParkingDetectorConfig.MODEL_NAME,
        num_classes=ParkingDetectorConfig.NUM_CLASSES,
        checkpoint_path=os.path.join(
            ParkingDetectorConfig.CHECKPOINT_DIR,
            ParkingDetectorConfig.EXPERIMENT_NAME,
            'average_model.pth'
        )
    )
    
    # Test model
    test_model(best_model, test_data)
    
    logger.info("Training pipeline completed successfully!")


if __name__ == "__main__":
    main()
