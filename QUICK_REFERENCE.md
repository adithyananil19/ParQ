# SmartPark Quick Reference

## Quick Start (5 Minutes)

### Terminal 1 - Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # or source venv/bin/activate on macOS/Linux
pip install -r requirements.txt
python main.py
```

### Terminal 2 - ML Engine
```bash
cd ml-engine
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
python detector.py
```

### Terminal 3 - Mobile App
```bash
cd mobile
npm install
npm start
```

---

## Project Structure at a Glance

```
SmartPark/
├── backend/
│   ├── app/
│   │   ├── models.py          (Data schemas)
│   │   └── utils.py           (Helper functions)
│   ├── tests/
│   ├── config.py              (Configuration)
│   ├── main.py                (Entry point)
│   └── requirements.txt
│
├── ml-engine/
│   ├── models/                (YOLOv8 weights)
│   ├── utils/
│   │   └── preprocessing.py   (Image processing)
│   ├── detector.py            (Main detection engine)
│   └── requirements.txt
│
├── mobile/
│   ├── src/
│   │   ├── screens/           (UI screens)
│   │   ├── components/        (Reusable components)
│   │   ├── services/          (API client)
│   │   └── redux/             (State management)
│   ├── App.js                 (Entry point)
│   ├── app.json               (Expo config)
│   └── package.json
│
├── docs/
│   ├── ARCHITECTURE.md        (System design)
│   ├── API.md                 (API reference)
│   └── SETUP.md               (Detailed setup)
│
└── README.md
```

---

## Key Endpoints (To Be Implemented)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Health check |
| GET | `/api/v1/parking/{lot_id}/occupancy` | Get current occupancy |
| GET | `/api/v1/parking/{lot_id}/available-spaces` | List available spaces |
| POST | `/api/v1/parking/{lot_id}/update` | Receive ML updates |
| GET | `/api/v1/parking/{lot_id}/history` | Get historical data |

---

## Environment Variables

### Backend (.env)
```
DEBUG=False
PORT=8000
DATABASE_URL=postgresql://user:password@localhost:5432/smartpark
ML_ENGINE_URL=http://localhost:8001
```

### ML Engine (.env)
```
CAMERA_SOURCE=0
MODEL_PATH=models/yolov8n.pt
BACKEND_URL=http://localhost:8000
```

### Mobile (.env)
```
REACT_APP_API_URL=http://localhost:8000/api/v1
```

---

## Testing Commands

```bash
# Backend
cd backend
pytest tests/

# ML Engine
cd ml-engine
pytest tests/

# Mobile
cd mobile
npm test
```

---

## Common Tasks

### Add Backend Endpoint
1. Define model in `backend/app/models.py`
2. Create route in `backend/main.py`
3. Add tests in `backend/tests/`
4. Test with `curl` or Postman

### Add ML Detection Feature
1. Add method to `ml-engine/detector.py`
2. Add tests in `ml-engine/tests/`
3. Run and verify with test images

### Add Mobile Screen
1. Create component in `src/screens/FirstNewScreen.js`
2. Import in `App.js`
3. Add to navigation
4. Connect to Redux store

---

## File Association

**Work Area** | **Primary Files** | **Tech Stack**
---|---|---
Backend API | `backend/main.py`, `config.py` | FastAPI, Python
ML Detection | `ml-engine/detector.py`, `preprocessing.py` | YOLOv8, OpenCV
Mobile UI | `mobile/src/screens/*`, `App.js` | React Native, Expo
State Management | `mobile/src/redux/*` | Redux, Redux Toolkit
API Communication | `mobile/src/services/parkingService.js` | Axios

---

## Useful Commands

```bash
# Format Python code
black backend/ ml-engine/

# Lint Python
pylint backend/ ml-engine/

# Install Python package
pip install package_name

# Update Python packages
pip install -r requirements.txt --upgrade

# Install npm package
npm install package_name

# Clear npm cache
npm cache clean --force

# Rebuild node_modules
rm -rf node_modules package-lock.json && npm install

# Run specific test
pytest tests/test_api.py::test_health_check
```

---

## Important URLs

- Backend API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs` (Swagger)
- Mobile: `http://localhost:19000` (Expo)

---

## Debugging Tips

**Backend not responding?**
- Check if on correct port (default 8000)
- Verify no CORS issues
- Check logs in terminal

**ML Engine timing out?**
- Verify camera source is accessible
- Check GPU/CPU availability
- Reduce resolution in config

**Mobile app won't connect?**
- Ensure backend is running
- Verify API URL in `.env`
- Check network on same subnet
- Use physical IP instead of localhost

---

## Documentation

- Full setup guide: [docs/SETUP.md](docs/SETUP.md)
- System architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- API reference: [docs/API.md](docs/API.md)
- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)
- Project status: [PROJECT_STATUS.md](PROJECT_STATUS.md)

---

## Need Help?

1. Check relevant documentation in `docs/`
2. Review code comments and docstrings
3. Check GitHub issues
4. Create a new issue with details

---

*Last Updated: March 2026*
