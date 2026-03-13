#!/usr/bin/env python
"""Download YOLO-NAS model"""
import logging
import sys
import os

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

logger.info("="*60)
logger.info("🔽 YOLO-NAS Model Download")
logger.info("="*60)

try:
    logger.info("Step 1: Importing super_gradients...")
    from super_gradients.training import models
    logger.info("✓ Import successful")
    
    logger.info("\nStep 2: Downloading YOLO-NAS model...")
    logger.info("This may take 5-15 minutes depending on your internet speed")
    logger.info("-" * 60)
    
    model = models.get("yolo_nas_l", pretrained_weights="coco")
    
    logger.info("-" * 60)
    logger.info("✅ Model downloaded successfully!")
    
    # Find where it's cached
    cache_dir = os.path.expanduser("~/.super_gradients/checkpoints")
    if os.path.exists(cache_dir):
        logger.info(f"\n📁 Model cached in: {cache_dir}")
        logger.info("📂 Files found:")
        for root, dirs, files in os.walk(cache_dir):
            for file in files:
                file_path = os.path.join(root, file)
                size_mb = os.path.getsize(file_path) / (1024 * 1024)
                logger.info(f"   ✓ {file} ({size_mb:.1f} MB)")
    
    logger.info("\n" + "="*60)
    logger.info("✅ You can now restart the backend!")
    logger.info("   The model will be loaded automatically")
    logger.info("="*60)
    
except Exception as e:
    logger.error(f"\n❌ Error: {str(e)}")
    logger.error("Traceback:", exc_info=True)
    sys.exit(1)
