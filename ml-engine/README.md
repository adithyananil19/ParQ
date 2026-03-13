# ML Engine README

## Overview

The ML Engine is the computer vision component of SmartPark. It uses YOLOv8 to detect vehicles in camera feeds and analyze parking space occupancy in real-time.

## Components

### Core Modules

1. **detector.py** - Main detection engine
   - Vehicle detection using YOLOv8
   - Parking space occupancy analysis
   - Statistics calculation

2. **utils/preprocessing.py** - Image processing
   - Frame preprocessing and resizing
   - Image enhancement
   - Shadow detection

### Models

- `models/` - Directory for storing trained YOLOv8 models
- Default model: `yolov8n.pt` (nano version, fastest)
- Alternative: `yolov8s.pt`, `yolov8m.pt`, `yolov8l.pt` (larger, more accurate)

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Download YOLOv8 model
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

# Run detector
python detector.py
```

## Configuration

Create `config.yaml`:
```yaml
camera:
  source: 0  # or RTSP URL
  resolution: [1920, 1080]
  fps: 30

detection:
  model: yolov8n.pt
  confidence: 0.5

parking:
  lot_id: default
  total_spaces: 100
```

## API Integration

ML Engine sends updates to backend:
```
POST http://localhost:8000/api/v1/parking/default/update
```

## Performance

- **Inference Time**: ~50ms per frame (GPU) / ~200ms (CPU)
- **Memory Usage**: ~500MB for nano model
- **Recommended**: NVIDIA GPU for real-time performance

## Future Enhancements

- License plate recognition
- Space-specific ROI analysis
- Multi-camera support
- Custom model training pipeline
