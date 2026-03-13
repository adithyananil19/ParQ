# SmartPark - System Setup & Usage Guide

## 🎯 Quick Start (First Time Setup)

### 1️⃣ Backend Setup & Launch (5 minutes)

```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies (if not already done)
pip install -r requirements.txt

# Start the backend server
python main.py
```

**Expected Output:**
```
INFO:     Started server process [12345]
INFO:     Uvicorn running on http://0.0.0.0:8000
✓ Firebase Firestore connected  (or ⚠ running in demo mode if no credentials)
```

**Verify Backend is Running:**
```bash
curl http://localhost:8000/health
# Returns: {"status":"healthy","service":"SmartPark API","version":"1.0.0"}
```

---

### 2️⃣ ML Engine Setup & Launch (3 minutes)

**In a NEW terminal:**

```bash
# Navigate to ML engine directory
cd ml-engine

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies (if not already done)
pip install -r requirements.txt

# Process webcam and send detections to backend
python integration.py --source 0

# OR process demo video file
python integration.py --source demo.mp4 --output annotated.mp4

# OR process IP camera stream
python integration.py --source rtsp://camera-ip:554/stream
```

**What's Happening:**
- 🎥 Opening video source (webcam/file/RTSP)
- 🤖 Running YOLOv8 detection on each frame
- 📊 Calculating parking occupancy
- 🚀 Pushing updates to backend API every 5 seconds
- 💾 Backend stores in Firebase Firestore (if configured)

**Expected Console Output:**
```
Starting detection on: 0
Backend: http://localhost:8000 | Lot: default
Progress: 10.5% | Frames: 123 | Detections: 456
✓ Pushed to backend: 45.2% occupied
```

---

### 3️⃣ Mobile App Launch (2 minutes)

**In a NEW terminal:**

```bash
# Navigate to mobile directory
cd mobile

# Start Expo development server
npm start

# Choose one:
# Press 'i' for iOS simulator
# Press 'a' for Android emulator
# Scan QR code with phone for live preview
```

**What You'll See:**
- Home tab: Real-time parking occupancy dashboard
- Bookings tab: Reserve parking spaces
- Settings tab: User preferences

---

## 📊 Monitor System Realtime

```bash
# In a new terminal - watch occupancy updates
watch -n 1 'curl -s http://localhost:8000/api/v1/parking/default/occupancy | jq'
```

Sample output:
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

---

## 🔧 Configuration

### Firebase Setup (Required for Production)

1. **Create Firebase Project:**
   - Go to https://console.firebase.google.com
   - Click "Create a new project"
   - Name it "SmartPark"
   - Skip analytics
   - Create project

2. **Enable Firestore:**
   - In console, go to "Firestore Database"
   - Click "Create Database"
   - Start in test mode
   - Select region (e.g., `us-central1`)
   - Create

3. **Get Service Account Key:**
   - Project Settings ⚙️ → Service Accounts
   - Click "Generate New Private Key"
   - Download JSON file

4. **Save Credentials:**
   ```bash
   # Copy downloaded file to:
   backend/serviceAccountKey.json
   ```

5. **Environment Variables:**
   ```bash
   # Create backend/.env with:
   FIREBASE_PROJECT_ID=your-project-id
   DEBUG=True
   HOST=0.0.0.0
   PORT=8000
   ```

### Optional: PostgreSQL (for future use)

Currently using Firebase for MVP (no server management). PostgreSQL can be added later:

```bash
# backend/requirements-postgres.txt (future)
pip install psycopg3 sqlalchemy alembic
```

---

## 🎬 Usage Examples

### Process Webcam (Real-time)
```bash
cd ml-engine
python integration.py --source 0 --skip-frames 1 --push-interval 2
```

### Process Video File (Demo)
```bash
cd ml-engine
python integration.py --source path/to/video.mp4 --output annotated.mp4
```

### Process IP Camera (RTSP)
```bash
cd ml-engine
python integration.py --source rtsp://192.168.1.100:554/stream --skip-frames 2
```

### Multiple Parking Lots
```bash
cd ml-engine

# Terminal 1: Lot A
python integration.py --source camera_a.mp4 --lot lot_A

# Terminal 2: Lot B  
python integration.py --source camera_b.mp4 --lot lot_B
```

---

## 📚 API Reference

### Get Current Occupancy
```bash
curl http://localhost:8000/api/v1/parking/default/occupancy
```

Response:
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

### Get Occupancy History
```bash
curl "http://localhost:8000/api/v1/parking/default/history?limit=10"
```

### Get Available Spaces
```bash
curl http://localhost:8000/api/v1/parking/default/available-spaces
```

### Update Individual Space
```bash
curl -X POST http://localhost:8000/api/v1/parking/default/spaces/A001/status \
  -H "Content-Type: application/json" \
  -d '{
    "is_occupied": true,
    "confidence": 0.95
  }'
```

### Get Statistics
```bash
curl http://localhost:8000/api/v1/parking/default/stats
```

### Reset Parking Lot
```bash
curl -X DELETE http://localhost:8000/api/v1/parking/default
```

---

## 🐛 Troubleshooting

### Backend Won't Start

**Error:** `Address already in use`
```bash
# Port 8000 is already in use
# Option 1: Kill the process using that port
# Option 2: Use different port
export PORT=8001
python main.py
```

**Error:** `ModuleNotFoundError: No module named 'config'`
```bash
# Virtual environment not activated
# Make sure you're in backend directory and activated venv
cd backend
venv\Scripts\activate
python main.py
```

**Error:** `Firebase not available - running in demo mode`
```bash
# This is normal if serviceAccountKey.json is missing
# Data will be stored in memory only (resets on restart)
# To use Firebase, download credentials (see Firebase Setup section)
```

### ML Engine Issues

**Error:** `ModuleNotFoundError: No module named 'ultralytics'`
```bash
cd ml-engine
pip install -r requirements.txt
```

**Error:** `[ERROR] Camera failed to open`
```bash
# Check if camera/video file exists
# For webcam, try: python integration.py --source 0
# For video file, check path is correct
python integration.py --source /full/path/to/video.mp4
```

**Slow Processing**
```bash
# Process fewer frames (skip every 3rd frame)
python integration.py --source 0 --skip-frames 3

# Or convert video to H.264 first
ffmpeg -i input.mp4 -c:v libx264 -preset fast output.mp4
```

### Mobile App Issues

**Error:** `npm command not found`
```bash
# Node.js not installed
# Download from https://nodejs.org
# Or use package manager:
# macOS: brew install node
# Windows: choco install nodejs
```

**Error:** `Metro bundler crashed`
```bash
# Clear cache and restart
cd mobile
npm start -- --reset-cache
```

---

## 📂 Project Structure

```
SmartPark/
├── README.md                          # This file
├── DEPLOYMENT.md                      # Production deployment guide
├── VALIDATE.py                        # System validation script
│
├── backend/
│   ├── main.py                        # FastAPI application
│   ├── config.py                      # Configuration settings
│   ├── firebase_db.py                 # Firebase Firestore integration
│   ├── app/
│   │   ├── __init__.py
│   │   └── routes.py                  # API endpoints
│   ├── requirements.txt               # Python dependencies
│   ├── serviceAccountKey.json         # Firebase credentials (user-provided)
│   └── venv/                          # Virtual environment
│
├── ml-engine/
│   ├── detector_v2.py                 # YOLOv8 parking detector
│   ├── camera_handler.py              # Multi-source camera handler
│   ├── integration.py                 # Backend API integration
│   ├── requirements.txt               # Python dependencies
│   └── venv/                          # Virtual environment
│
├── mobile/
│   ├── App.js                         # React Native app entry
│   ├── package.json                   # NPM dependencies
│   ├── app.json                       # Expo configuration
│   ├── src/
│   │   ├── components/                # Reusable UI components
│   │   ├── screens/                   # Navigation screens
│   │   ├── services/                  # Firebase & API integration
│   │   └── redux/                     # State management (future)
│   └── node_modules/                  # Installed packages
│
└── docs/
    ├── ARCHITECTURE.md                # System architecture
    ├── API.md                         # API documentation
    └── CONTRIBUTING.md                # Development guidelines
```

---

## 🚀 Full System Test

**Terminal 1 - Backend:**
```bash
cd backend && venv\Scripts\activate && python main.py
```

**Terminal 2 - ML Engine:**
```bash
cd ml-engine && venv\Scripts\activate
python integration.py --source 0 --skip-frames 1
```

**Terminal 3 - Monitor:**
```bash
watch -n 2 'curl -s http://localhost:8000/api/v1/parking/default/occupancy | jq .occupancy_percentage'
```

**Terminal 4 - Mobile:**
```bash
cd mobile && npm start
```

**All 4 terminals running = System operational!** ✅

---

## 💡 Key Concepts

### Occupancy Percentage
Calculated as: `(occupied_spaces / total_spaces) × 100`

### Detection Confidence
ML model confidence score (0.0-1.0). Higher = more likely a vehicle.

### Skip Frames
Process every Nth frame:
- `--skip-frames 1` = Process all frames (high accuracy, slower)
- `--skip-frames 3` = Process every 3rd frame (faster, decent accuracy)

### Push Interval
Send updates to backend every N seconds:
- `--push-interval 2` = Update backend every 2 seconds (more frequent)
- `--push-interval 10` = Update backend every 10 seconds (reduces Firebase writes)

---

## 📞 Support & Next Steps

1. **System Validation:**
   ```bash
   python VALIDATE.py
   ```
   Checks all components and reports missing dependencies.

2. **View Logs:**
   - Backend logs: stdout in Terminal 1
   - ML logs: stdout in Terminal 2
   - Mobile logs: Expo console after `npm start`

3. **Performance Monitoring:**
   ```bash
   # Watch occupancy percentage in real-time
   watch -n 1 'curl -s http://localhost:8000/api/v1/parking/default/stats | jq'
   ```

4. **Production Deployment:**
   See [DEPLOYMENT.md](DEPLOYMENT.md) for containerization and cloud hosting.

---

## 🎓 Learning Resources

- **FastAPI:** https://fastapi.tiangolo.com
- **YOLOv8:** https://docs.ultralytics.com
- **Firebase:** https://firebase.google.com/docs
- **React Native:** https://reactnative.dev

---

**Last Updated:** January 2024  
**Version:** 1.0.0  
**Status:** Beta (ready for testing)

