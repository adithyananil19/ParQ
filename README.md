# SmartPark (ParQ) - Intelligent Parking Management System

> A full-stack intelligent parking management solution providing real-time visibility into parking occupancy using AI-powered computer vision and a mobile application.

![version](https://img.shields.io/badge/version-1.0.0-blue)
![python](https://img.shields.io/badge/python-3.10%2B-green)
![react-native](https://img.shields.io/badge/react--native-expo-blue)
![status](https://img.shields.io/badge/status-in%20development-yellow)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the System](#running-the-system)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## 🎯 Overview

SmartPark transforms surveillance camera feeds into a live digital map of parking availability. Using advanced computer vision (YOLOv11s trained on PKLot dataset), the system identifies occupied and vacant parking spaces in real-time, synchronizing data with a cloud backend and mobile app for instant access.

**Use Cases:**
- Reduce time spent searching for parking spaces
- Provide real-time occupancy data to drivers
- Enable parking administrators to monitor facility usage
- Generate analytics and historical trends
- Support future feature integration (bookings, LPR, predictions)

## ✨ Key Features

- ✅ **Real-Time Detection** — AI-powered vision identifies occupied/vacant parking spaces
- ✅ **Mobile Dashboard** — React Native app with admin & client interfaces
- ✅ **JWT Authentication** — Hardcoded admin account + Firebase client login
- ✅ **REST API** — FastAPI endpoints for video upload and status queries
- ✅ **Cloud Integration** — Firebase Firestore for real-time data sync
- ✅ **Model Evaluation** — Confusion matrix & performance metrics for model validation
- ✅ **Cross-Platform** — Works on iOS/Android via Expo

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | FastAPI 0.135.1, uvicorn, Python 3.10+ |
| **ML/Vision** | YOLOv11s, PyTorch, OpenCV, Ultralytics |
| **Mobile** | React Native 0.81.5, Expo SDK 54, Redux Toolkit |
| **Authentication** | JWT tokens (3600s expiry), Firebase Auth |
| **Database** | Firebase Firestore, Future: PostgreSQL |
| **Deployment** | Modular microservices architecture |

## 📁 Project Structure

```
SmartPark/
├── backend/                          # FastAPI REST API
│   ├── app/
│   │   ├── auth.py                 # JWT token generation & verification
│   │   ├── auth_routes.py          # Login/register endpoints
│   │   ├── models.py               # Pydantic data schemas
│   │   ├── routes.py               # Parking API endpoints
│   │   ├── video_processor.py      # Video/image processing with YOLOv11s
│   │   ├── video_routes.py         # Video upload endpoints
│   │   ├── parking_detector.py     # Detector integration
│   │   ├── ml_detector.py          # ML model wrapper
│   │   └── utils.py                # Helper functions
│   ├── main.py                     # FastAPI app entry point
│   ├── config.py                   # Configuration settings
│   ├── firebase_db.py              # Firebase Firestore connection
│   ├── requirements.txt            # Python dependencies
│   ├── models/
│   │   └── best.pt                # Trained YOLOv11s model (PKLot dataset)
│   └── tests/
│       └── test_api.py            # API unit tests
├── ml-engine/                        # ML pipeline & training
│   ├── detector_v2.py             # Enhanced detection engine (video/RTSP)
│   ├── camera_handler.py          # Video source management
│   ├── integration.py             # Backend integration
│   ├── train_parking_detector.py  # Model training pipeline
│   ├── predict_parking_spaces.py  # Inference utilities
│   ├── preprocessing.py           # Image preprocessing
│   ├── requirements.txt           # ML dependencies
│   └── tests/
│       └── test_detector.py       # ML unit tests
├── mobile/                           # React Native Expo app
│   ├── src/
│   │   ├── screens/               # UI screens
│   │   │   ├── AdminDashboard.js
│   │   │   ├── AdminLoginScreen.js
│   │   │   ├── ClientLoginScreen.js
│   │   │   ├── RegisterScreen.js
│   │   │   ├── BookingScreen.js
│   │   │   ├── ParkingMapScreen.js
│   │   │   └── ...
│   │   ├── services/              # API clients
│   │   │   ├── authService.js
│   │   │   └── parkingService.js
│   │   ├── redux/                 # State management
│   │   │   ├── authSlice.js
│   │   │   ├── parkingSlice.js
│   │   │   └── store.js
│   │   ├── components/            # Reusable UI components
│   │   ├── config/                # Configuration
│   │   │   └── api.js            # API endpoint config
│   │   └── utils/
│   │       └── tokenStorage.js   # AsyncStorage helpers
│   ├── App.js                    # App entry point
│   ├── package.json              # Dependencies
│   └── app.json                  # Expo configuration
├── docs/
│   ├── ARCHITECTURE.md           # System design & integration
│   ├── API.md                    # Complete API reference
│   ├── SETUP.md                  # Detailed setup guide
│   └── DEPLOYMENT.md             # Deployment procedures
├── uploads/                        # Uploaded parking images (test)
├── .github/
│   └── copilot-instructions.md  # AI assistant configurations
├── README.md                       # This file
├── QUICKSTART.md                   # Quick setup for developers
├── PROJECT_STATUS.md               # Development roadmap
└── .gitignore
```

## 📋 Prerequisites

### System Requirements
- **OS**: Windows, macOS, or Linux
- **Disk Space**: 2+ GB (model + dependencies)
- **RAM**: 4+ GB recommended
- **Internet**: Required for Firebase & Expo

### Software Requirements

| Component | Requirement |
|-----------|-------------|
| **Python** | 3.10+ |
| **Node.js** | 16+ LTS |
| **npm** | 8+ |
| **Git** | Latest |
| **Firebase** | Account with Firestore enabled |

### Accounts Required
1. **Firebase Account** — For Firestore and Authentication
   - Create project: https://console.firebase.google.com/
   - Enable Firestore Database
   - Enable Authentication (Email/Password)
   - Download service account JSON
   
2. **GitHub Account** (for version control)

## 🛠 Installation

### Step 1: Clone Repository

```bash
# Via HTTPS
git clone https://github.com/adithyananil19/ParQ.git
cd ParQ

# Via SSH (if configured)
git clone git@github.com:adithyananil19/ParQ.git
cd ParQ
```

###  Step 2: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download YOLOv11s model (if not present)
python -c "from ultralytics import YOLO; YOLO('yolov11s.pt')"
```

### Step 3: ML Engine Setup

```bash
# Navigate to ml-engine
cd ../ml-engine

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 4: Mobile App Setup

```bash
# Navigate to mobile directory
cd ../mobile

# Install dependencies
npm install

# Install Expo CLI (if not installed globally)
npm install -g expo-cli

# (Optional) Install specific Expo-compatible packages
npm install expo-image-picker@~17.0.10
npm install @react-native-async-storage/async-storage@2.2.0
```

## ⚙️ Configuration

### Backend Configuration

1. **Create `.env` file** in `backend/`:
```bash
cp backend/.env.example backend/.env
```

2. **Edit `backend/.env`**:
```env
# FastAPI
DEBUG=True
HOST=0.0.0.0
PORT=8000

# Admin Credentials (Hardcoded)
ADMIN_EMAIL=admin@smartpark.com
ADMIN_PASSWORD=Admin123

# JWT
JWT_SECRET_KEY=your-super-secret-key-change-this
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=1

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_API_KEY=your-api-key

# Model
MODEL_PATH=backend/models/best.pt
CONFIDENCE_THRESHOLD=0.25
```

3. **Add Firebase Service Account**:
   - Download `serviceAccountKey.json` from Firebase Console
   - Place in `backend/` directory
   - **Important**: This file is in `.gitignore` and should NOT be committed

### ML Engine Configuration

1. **Create `.env` file** in `ml-engine/`:
```bash
cp ml-engine/.env.example ml-engine/.env
```

2. **Edit `ml-engine/.env`**:
```env
BACKEND_URL=http://localhost:8000
MODEL_PATH=../backend/models/best.pt
CONFIDENCE_THRESHOLD=0.25
```

### Mobile Configuration

The mobile app uses `mobile/src/config/api.js` for API endpoints:

```javascript
// Update API_BASE_URL to match your backend IP
export const API_BASE_URL = 'http://192.168.x.x:8000'; // Replace with your IP
```

## 🚀 Running the System

### Terminal 1: Backend Server

```bash
cd backend

# Activate venv (if not active)
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

# Start FastAPI server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Expected output:**
```
✓ Uvicorn running on http://0.0.0.0:8000
✓ Model loaded successfully (YOLOv11s)
✓ API docs available at http://localhost:8000/docs
```

### Terminal 2: Expo Development Server

```bash
cd mobile

# Start Expo development server
npx expo start --lan

# Or use the shorthand:
npm start
```

**Expected output:**
```
✓ Expo development server started
✓ Metro bundler ready
✓ Scan QR code to open in Expo Go app
```

### Terminal 3: ML Engine (Optional)

```bash
cd ml-engine

# Activate venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

# Run detector
python detector_v2.py
```

### Access the System

| Component | URL | Credentials |
|-----------|-----|-----------|
| **Backend API** | http://localhost:8000 | - |
| **API Docs (Swagger)** | http://localhost:8000/docs | - |
| **API Docs (ReDoc)** | http://localhost:8000/redoc | - |
| **Mobile App** | Scan QR in terminal | See below |
| **Admin Login** | In mobile app | `admin@smartpark.com` / `Admin123` |

### Test Admin Login

```bash
# In PowerShell/Terminal:
curl -X POST http://localhost:8000/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"admin@smartpark.com",
    "password":"Admin123"
  }'
```

## 📚 API Documentation

### Authentication Endpoints

- **POST** `/api/v1/auth/admin/login` — Admin login
- **POST** `/api/v1/auth/client/login` — Client login
- **POST** `/api/v1/auth/client/register` — Client registration

### Parking Detection Endpoints

- **POST** `/api/v1/parking/upload-image` — Analyze parking image
- **POST** `/api/v1/parking/upload-video` — Process parking video
- **GET** `/api/v1/parking/model-status` — Check model status
- **POST** `/api/v1/parking/reload-model` — Reload ML model

**Full API reference**: [docs/API.md](docs/API.md)

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Activate venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Run API tests
pytest tests/test_api.py -v
```

### ML Engine Tests

```bash
cd ml-engine

# Activate venv
source venv/bin/activate

# Run detector tests
pytest tests/test_detector.py -v
```

### Model Evaluation

```bash
cd backend

# Generate confusion matrix
python evaluate_model.py

# Output: backend/confusion_matrix.png
```

## 🐛 Troubleshooting

### Backend Issues

| Issue | Solution |
|-------|----------|
| **Port 8000 already in use** | Change port in `uvicorn main:app --port 8001` |
| **Model not found** | Ensure `backend/models/best.pt` exists or download via `python -c "from ultralytics import YOLO; YOLO('yolov11s.pt')"` |
| **Firebase credentials error** | Verify `serviceAccountKey.json` is in `backend/` directory |
| **CORS errors** | Check `mobile/src/config/api.js` has correct backend IP |

### Mobile Issues

| Issue | Solution |
|-------|----------|
| **AsyncStorage errors** | Ensure `@react-native-async-storage/async-storage@2.2.0` is installed |
| **Cannot connect to backend** | Verify backend IP in `mobile/src/config/api.js` matches your machine's IP |
| **QR code won't scan** | Restart Expo with `npm start` and ensure WiFi is on same network |
| **Module not found errors** | Run `npm install` in `mobile/` directory |

### ML Engine Issues

| Issue | Solution |
|-------|----------|
| **CUDA/GPU errors** | Remove GPU dependencies or install correct PyTorch version |
| **Model inference slow** | Use smaller model (`yolov11n.pt`) or reduce image resolution |
| **Memory issues** | Reduce batch size or use lower resolution images |

## 📖 Additional Documentation

- **[QUICKSTART.md](QUICKSTART.md)** — 5-minute setup guide
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — System design & integration details
- **[docs/API.md](docs/API.md)** — Complete API reference
- **[docs/SETUP.md](docs/SETUP.md)** — Advanced setup & deployment
- **[ml-engine/README.md](ml-engine/README.md)** — ML engine-specific documentation
- **[PROJECT_STATUS.md](PROJECT_STATUS.md)** — Development roadmap & priorities

## 🚧 Future Roadmap

- [ ] **Phase 3**: Parking reservation system
- [ ] **Phase 4**: License plate recognition (LPR)
- [ ] **Phase 5**: Predictive occupancy analytics
- [ ] **Phase 6**: Multi-lot management
- [ ] **Phase 7**: Mobile payments integration
- [ ] **Phase 8**: Advanced admin dashboard

See [PROJECT_STATUS.md](PROJECT_STATUS.md) for detailed progress.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit with clear messages (`git commit -m 'Add amazing feature'`)
5. Push to your branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

This project is part of the SmartPark intelligent parking initiative.

---

## 📞 Support

For issues, questions, or suggestions:
- 📧 Email: adithyananil19@gmail.com
- 💬 GitHub Issues: [github.com/adithyananil19/ParQ/issues](https://github.com/adithyananil19/ParQ/issues)
- 📚 Documentation: See [docs/](docs/) folder

**Last Updated**: March 14, 2026  
**Version**: 1.0.0
