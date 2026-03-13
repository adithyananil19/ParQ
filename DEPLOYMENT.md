# SmartPark Deployment Guide

Complete guide for running the SmartPark system end-to-end.

## Prerequisites

1. **System Requirements**
   - Python 3.10+ (tested with 3.14.2)
   - Node.js 16+ (for mobile app)
   - Git
   - 2GB free disk space (ML models)

2. **Firebase Setup** (Required for database)
   - Create Firebase project: https://console.firebase.google.com
   - Enable Firestore Database (test mode)
   - Generate service account key
   - Save as `backend/serviceAccountKey.json`

3. **Environment Variables**
   ```bash
   # Create backend/.env
   FIREBASE_PROJECT_ID=your-project-id
   DEBUG=True
   HOST=0.0.0.0
   PORT=8000
   ```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                 Mobile App (React Native)               │
│         (Real-time occupancy from Firebase)             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│          Firebase Firestore (Real-time DB)              │
│       ├─ occupancy_percentage                           │
│       ├─ occupied_spaces                                │
│       ├─ available_spaces                               │
│       └─ occupancy_history                              │
└────────────────────▲────────────────────────────────────┘
                     │
         ┌───────────┴──────────────┐
         │                          │
         ▼                          ▼
    ┌──────────┐           ┌──────────────┐
    │ Backend  │           │  ML Engine   │
    │ FastAPI  │◄──────────┤ Detector v2  │
    └──────────┘           └──────────────┘
         ▲                          ▲
         │                          │
    HTTP API                   Camera Input
                           (Webcam/Video/RTSP)
```

## Quick Start (3 Steps)

### Step 1: Start Backend Server

```bash
cd backend
source venv/Scripts/activate  # Windows: venv\Scripts\activate
python main.py
```

**Expected Output:**
```
INFO:     Started server process [12345]
INFO:     Uvicorn running on http://0.0.0.0:8000
✓ Firebase Firestore connected  (or ⚠ running in demo mode)
```

**Test Backend:**
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy","service":"SmartPark API","version":"1.0.0"}
```

### Step 2: Run ML Engine (in new terminal)

```bash
cd ml-engine
source venv/Scripts/activate  # Windows: venv\Scripts\activate

# Option A: Process webcam (real-time)
python integration.py --source 0

# Option B: Process video file (demo)
python integration.py --source demo.mp4 --output annotated.mp4

# Option C: Process RTSP stream
python integration.py --source rtsp://camera-ip:554/stream
```

**What this does:**
1. Opens video/camera source
2. Detects vehicles frame-by-frame (YOLOv8)
3. Estimates parking occupancy
4. Pushes updates to backend API (every 5 seconds)
5. Backend stores in Firebase Firestore
6. Mobile app receives real-time updates

### Step 3: Launch Mobile App (in new terminal)

```bash
cd mobile
npm start  # or: expo start
```

Follow the prompts to run on:
- iOS Simulator: `i`
- Android Emulator: `a`  
- Expo Go: Scan QR code with phone

## API Reference

### Health & Status

```bash
# Health check
curl http://localhost:8000/health

# Get current occupancy
curl http://localhost:8000/api/v1/parking/default/occupancy

# Get available spaces
curl http://localhost:8000/api/v1/parking/default/available-spaces

# Get occupancy history (last 100 records)
curl http://localhost:8000/api/v1/parking/default/history
```

### Update Operations

```bash
# Update occupancy (from ML engine)
curl -X POST http://localhost:8000/api/v1/parking/default/occupancy \
  -H "Content-Type: application/json" \
  -d '{
    "occupied_count": 45,
    "available_count": 55,
    "total_spaces": 100,
    "confidence": 0.92
  }'

# Update individual space
curl -X POST http://localhost:8000/api/v1/parking/default/spaces/A001/status \
  -H "Content-Type: application/json" \
  -d '{
    "is_occupied": true,
    "confidence": 0.95
  }'

# Reset parking lot
curl -X DELETE http://localhost:8000/api/v1/parking/default
```

## Complete System Test

### 1. Verify Backend is Running

```bash
# In terminal 1 (already running)
python backend/main.py
```

Check: http://localhost:8000/health should return 200 OK

### 2. Start ML Engine with Demo Video

```bash
# In terminal 2
cd ml-engine
python integration.py --source path/to/demo.mp4 --skip-frames 1 --push-interval 5
```

Expected console output:
```
Starting detection on: path/to/demo.mp4
Backend: http://localhost:8000 | Lot: default
Progress: 10.5% | Frames: 123 | Detections: 456
✓ Pushed to backend: 45.2% occupied
```

### 3. Monitor Backend Receiving Updates

```bash
# In terminal 3 - check occupancy endpoint
watch -n 1 'curl -s http://localhost:8000/api/v1/parking/default/occupancy | jq'
```

Should see:
```json
{
  "lot_id": "default",
  "occupancy_percentage": 45.2,
  "occupied_spaces": 45,
  "available_spaces": 55,
  "total_spaces": 100,
  "last_updated": "2024-01-15T10:30:45"
}
```

### 4. Check Firebase (if connected)

- Navigate to https://console.firebase.google.com
- Select your project → Firestore Database
- Browse collections → `parking_lots/default/occupancy`
- See real-time updates as ML engine processes frames

### 5. View History

```bash
curl http://localhost:8000/api/v1/parking/default/history?limit=10 | jq '.[0]'
```

Should show timestamped occupancy records.

## Performance Tuning

### Optimize for Real-time Processing

```bash
# Process only every 3rd frame (faster but less accurate)
python integration.py --source 0 --skip-frames 3 --push-interval 2
```

**Impact:**
- Reduces frame processing from 30 FPS to 10 FPS
- Faster occupancy updates (every 2 seconds vs 5)
- Higher throughput, slight accuracy decrease

### Optimize for Accuracy

```bash
# Process every frame (slower but most accurate)
python integration.py --source 0 --skip-frames 1 --push-interval 10
```

**Impact:**
- Full 30 FPS processing
- Longer between API updates (reduces Firebase writes)
- Best detection accuracy

### With Video Output (for analysis)

```bash
python integration.py --source demo.mp4 --output annotated.mp4 --skip-frames 1
```

Creates `annotated.mp4` with:
- Green bounding boxes around detected vehicles
- Confidence scores overlaid
- Time and frame number in corner

## Troubleshooting

### Backend Won't Start

```bash
# Check if port 8000 is already in use
netstat -anb | grep 8000  # Windows

# If in use, kill process or use different port
export PORT=8001
python main.py
```

### "ImportError: No module named 'ultralytics'"

```bash
# ML dependencies not installed
cd ml-engine
source venv/Scripts/activate
pip install -r requirements.txt
```

### "Firebase not available - running in demo mode"

```bash
# Check if serviceAccountKey.json exists
ls -la backend/serviceAccountKey.json

# If missing, download from Firebase Console:
# 1. Go to Project Settings → Service Accounts
# 2. Click "Generate New Private Key"
# 3. Save as backend/serviceAccountKey.json
```

### Very Slow Video Processing

```bash
# Increase skip_frames
python integration.py --source demo.mp4 --skip-frames 3

# Try GPU acceleration (if CUDA available)
# Edit detector_v2.py: device = "cuda:0" instead of "cpu"
```

### No "Completed" Message (video stuck)

```bash
# Video codec might not be supported
# Try converting video to H.264
ffmpeg -i input.mp4 -c:v libx264 -preset fast output.mp4
python integration.py --source output.mp4
```

## File Structure for Reference

```
SmartPark/
├── backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── app/
│   │   └── routes.py              # Parking API endpoints
│   ├── firebase_db.py             # Firebase integration
│   ├── config.py                  # Configuration
│   ├── requirements.txt           # Python dependencies
│   └── serviceAccountKey.json     # Firebase credentials (created by user)
│
├── ml-engine/
│   ├── detector_v2.py             # Enhanced parking detector
│   ├── camera_handler.py          # Multi-source camera handler
│   ├── integration.py             # Backend API integration (RUN THIS)
│   └── requirements.txt           # ML dependencies
│
└── mobile/
    ├── App.js                     # React Native app entry point
    ├── package.json               # NPM dependencies
    └── src/
        └── services/parkingService.js  # Firebase real-time subscription
```

## Next Steps

1. **Create Firebase Project** (if not done)
   - https://console.firebase.google.com → New Project → "SmartPark"

2. **Download Service Account** (required for Firebase connection)
   - Project Settings → Service Accounts → Generate Python key
   - Save to `backend/serviceAccountKey.json`

3. **Test End-to-End**
   - Start backend: `python backend/main.py`
   - Start ML engine: `python ml-engine/integration.py --source 0`
   - Monitor API: `curl http://localhost:8000/api/v1/parking/default/occupancy`

4. **Deploy Mobile App**
   - Install Firebase SDK: `npm install firebase` (in mobile/)
   - Update parkingService.js with Firebase config
   - Run on device or emulator

5. **Production Deployment** (Future)
   - Containerize backend (Docker)
   - Deploy to cloud (AWS/GCP/Azure)
   - Set up SSL certificates
   - Configure load balancing for multiple cameras

## Support

For issues:
1. Check logs: `grep ERROR /var/log/smartpark/`
2. Verify all services running: `curl http://localhost:8000/health`
3. Check Firebase connection: Look for `✓ Firebase Firestore connected` on startup
4. Review ARCHITECTURE.md for system overview

