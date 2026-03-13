# SmartPark Setup Guide

## Prerequisites

- Python 3.10 or higher
- Node.js 18+ (for mobile app)
- PostgreSQL 12+ (for backend database)
- Git
- ffmpeg (for video processing)

## Project Structure

```
SmartPark/
├── backend/              # FastAPI backend
├── ml-engine/            # YOLOv8 computer vision
├── mobile/               # React Native app
└── docs/                 # Documentation
```

---

## Backend Setup

### 1. Navigate to backend directory
```bash
cd backend
```

### 2. Create Python virtual environment
```bash
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure environment variables
Create `.env` file in `backend/` directory:
```
DEBUG=True
HOST=0.0.0.0
PORT=8000
DATABASE_URL=postgresql://user:password@localhost:5432/smartpark
PARKING_LOT_ID=default
TOTAL_SPOTS=100
ML_ENGINE_URL=http://localhost:8001
ML_UPDATE_INTERVAL=5
CLOUD_SYNC_ENABLED=True
CLOUD_SYNC_INTERVAL=2
```

### 5. Set up PostgreSQL database
```bash
# Create database
createdb smartpark

# Run migrations (if schema file exists)
# psql smartpark < schema.sql
```

### 6. Run backend server
```bash
python main.py
```

Backend will be available at `http://localhost:8000`

---

## ML Engine Setup

### 1. Navigate to ml-engine directory
```bash
cd ml-engine
```

### 2. Create Python virtual environment
```bash
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Download YOLOv8 models
```bash
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
```

### 5. Configure camera source
Create `config.yaml` in `ml-engine/`:
```yaml
camera:
  source: 0  # 0 for webcam, or provide RTSP URL
  resolution: [1920, 1080]
  fps: 30

detection:
  model: yolov8n.pt
  confidence_threshold: 0.5
  
parking_lot:
  lot_id: default
  total_spaces: 100
  backend_url: http://localhost:8000/api/v1
```

### 6. Run ML engine
```bash
python detector.py
```

---

## Mobile App Setup

### 1. Navigate to mobile directory
```bash
cd mobile
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure API endpoint
Create `.env` file in `mobile/`:
```
REACT_APP_API_URL=http://localhost:8000/api/v1
```

### 4. Update `app.json` for your bundle ID (iOS/Android)

### 5. Start Expo development server
```bash
npm start
```

### 6. Run on simulator or device
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on physical device

---

## Full Stack Development

### Option 1: Run in separate terminals

Terminal 1 - Backend:
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python main.py
```

Terminal 2 - ML Engine:
```bash
cd ml-engine
source venv/bin/activate  # or venv\Scripts\activate on Windows
python detector.py
```

Terminal 3 - Mobile App:
```bash
cd mobile
npm start
```

### Option 2: Using Docker (Future)

Build and run containers:
```bash
docker-compose up
```

---

## Testing

### Backend Tests
```bash
cd backend
pytest tests/
```

### ML Engine Tests
```bash
cd ml-engine
pytest tests/
```

### Mobile App Tests
```bash
cd mobile
npm test
```

---

## Troubleshooting

### Backend Issues
- **Port already in use**: Change PORT in `.env`
- **Database connection failed**: Verify PostgreSQL is running
- **CORS errors on mobile**: Ensure backend CORS is configured

### ML Engine Issues
- **Camera not detected**: Check camera ID/RTSP URL
- **Out of memory**: Reduce image resolution or batch size
- **Slow inference**: Use faster model (yolov8n vs yolov8l)

### Mobile App Issues
- **API connection failed**: Check API_URL and ensure backend is running
- **Module not found**: Run `npm install` again
- **Expo connection issues**: Ensure devices on same network

---

## Next Steps

1. Configure actual camera feed (RTSP URL or IP camera)
2. Set up PostgreSQL database with schema
3. Implement API endpoints in backend
4. Train custom YOLOv8 model for your parking lot
5. Deploy to production servers

---

## Documentation Links

- [Architecture](ARCHITECTURE.md)
- [API Reference](API.md)
- [YOLOv8 Documentation](https://docs.ultralytics.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Native Documentation](https://reactnative.dev/)
