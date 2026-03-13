# SmartPark - Intelligent Parking Management System

A full-stack intelligent parking management solution that provides real-time visibility into parking occupancy using computer vision and a mobile application.

## Overview

SmartPark transforms surveillance camera feeds into a live digital map of parking availability. By utilizing advanced computer vision (YOLOv8), the system identifies occupied and vacant spaces in real-time, synchronizing data with a cloud backend and mobile app for instant user access.

## Project Structure

```
SmartPark/
├── backend/                 # FastAPI backend service
│   ├── app/                 # Application modules
│   ├── tests/               # Unit tests
│   ├── requirements.txt      # Python dependencies
│   ├── main.py              # FastAPI entry point
│   └── config.py            # Configuration settings
├── ml-engine/              # Computer Vision & ML Pipeline
│   ├── models/             # Trained YOLOv8 models
│   ├── utils/              # Vision processing utilities
│   ├── tests/              # ML tests
│   ├── detector.py         # Parking detection engine
│   └── requirements.txt     # ML dependencies
├── mobile/                 # React Native mobile app
│   ├── src/               # App source code
│   ├── app.json           # Expo configuration
│   └── package.json       # Dependencies
├── docs/                  # Project documentation
│   ├── ARCHITECTURE.md    # System architecture
│   ├── API.md             # API documentation
│   └── SETUP.md           # Setup instructions
├── .github/               # GitHub configuration
│   └── copilot-instructions.md
└── .gitignore
```

## Technology Stack

- **Backend**: FastAPI, Python 3.10+
- **Computer Vision**: OpenCV, YOLOv8, PyTorch
- **Mobile**: React Native (Expo)
- **Cloud**: Real-time data sync with cloud backend
- **Database**: PostgreSQL (configured in backend)

## Key Features

✅ **Real-Time Parking Detection** - AI-powered vision system identifies occupied/vacant spaces  
✅ **Live Cloud Sync** - Occupancy data updates instantly  
✅ **Mobile Access** - User-friendly app for parking availability  
✅ **Digital Twin** - Bird's-eye view of entire parking facility  
✅ **Scalable Architecture** - Modular design for future enhancements  

## Future Scope

- **Reservation Systems** - Book parking spots in advance
- **License Plate Recognition** - Automated billing and entry/exit management
- **Predictive Analytics** - Forecast occupancy based on historical patterns
- **Multi-lot Support** - Manage multiple parking facilities

## Quick Start

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### ML Engine Setup
```bash
cd ml-engine
pip install -r requirements.txt
python detector.py --camera-feed <url_or_device_id>
```

### Mobile App
```bash
cd mobile
npm install
npm start
```

## Documentation

- [Architecture & Design](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Setup Guide](docs/SETUP.md)
- [ML Engine Documentation](ml-engine/README.md)

## Project Status

🚀 **In Development** - Core infrastructure being established

## License

This project is part of the SmartPark intelligent parking initiative.

---

For questions or contributions, please refer to the documentation folder.
