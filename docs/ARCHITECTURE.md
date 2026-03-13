# SmartPark Architecture

## System Overview

SmartPark is a distributed system composed of three main components that work together to provide real-time parking occupancy information:

```
┌─────────────────────────────────────────────────────────────┐
│                       Camera Feed(s)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    ML Engine (Python)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  YOLOv8 Detection │ OpenCV Processing │ Tracking    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            FastAPI Backend (Python)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Data Aggregation │ Cloud Sync │ API Endpoints      │  │
│  └──────────────────────────────────────────────────────┘  │
└────┬──────────────────────────┬──────────────────────────┘
     │                          │
     ▼                          ▼
┌──────────────────┐    ┌──────────────────┐
│  PostgreSQL DB   │    │  Mobile App      │
│  (Occupancy)     │    │  (React Native)  │
└──────────────────┘    └──────────────────┘
```

## Component Architecture

### 1. ML Engine (ml-engine/)

**Purpose**: Real-time parking space detection and occupancy analysis

**Key Components**:
- **YOLOv8 Model**: Detects vehicles in camera feed
- **OpenCV Pipeline**: Image preprocessing and enhancement
- **Detector Module**: Orchestrates detection and analysis

**Workflow**:
1. Capture frame from camera feed
2. Preprocess image (resize, enhance, normalize)
3. Run YOLOv8 inference
4. Analyze vehicle positions relative to parking spaces
5. Generate occupancy status
6. Send updates to Backend API

**Key Files**:
- `detector.py` - Main detection engine
- `utils/preprocessing.py` - Image processing utilities
- `models/` - Trained YOLOv8 weights

### 2. Backend (backend/)

**Purpose**: API server, data aggregation, and cloud synchronization

**Key Components**:
- **FastAPI Server**: RESTful API endpoints
- **Data Models**: Request/response schemas
- **Database Layer**: PostgreSQL integration
- **Real-time Updates**: WebSocket support for live occupancy

**Key Endpoints** (to be implemented):
- `GET /api/v1/parking/{lot_id}/occupancy` - Current occupancy status
- `GET /api/v1/parking/{lot_id}/available-spaces` - List available spaces
- `GET /api/v1/parking/{lot_id}/history` - Historical data
- `POST /api/v1/parking/{lot_id}/update` - Receive updates from ML engine
- `GET /health` - Health check

**Key Files**:
- `main.py` - FastAPI application entry
- `config.py` - Configuration settings
- `app/models.py` - Data models

### 3. Mobile App (mobile/)

**Purpose**: User interface for real-time parking availability

**Technology Stack**:
- React Native with Expo
- Redux for state management
- Axios for API communication

**Key Screens**:
- **Home Screen**: Parking overview and statistics
- **Parking Map**: Visual representation of parking lot
- **Bookings**: Reservation management (future)
- **Settings**: User preferences

**Key Files**:
- `App.js` - Navigation setup
- `src/screens/` - Screen components
- `src/redux/` - State management
- `src/services/parkingService.js` - API client

## Data Flow

### Real-time Occupancy Update Flow

```
1. Camera Feed
   ↓
2. ML Engine detects vehicles
   ↓
3. ML Engine sends update to Backend API
   ↓
4. Backend stores in database
   ↓
5. Backend broadcasts update (WebSocket or polling)
   ↓
6. Mobile app receives update
   ↓
7. Mobile app displays to user
```

## Database Schema (PostgreSQL)

```sql
-- Occupancy History Table
CREATE TABLE occupancy_history (
    id SERIAL PRIMARY KEY,
    lot_id VARCHAR(255),
    timestamp TIMESTAMP,
    total_spaces INT,
    occupied_spaces INT,
    available_spaces INT,
    occupancy_percentage FLOAT
);

-- Parking Spaces Table
CREATE TABLE parking_spaces (
    id SERIAL PRIMARY KEY,
    lot_id VARCHAR(255),
    space_id VARCHAR(255),
    location_x INT,
    location_y INT,
    is_occupied BOOLEAN,
    last_updated TIMESTAMP
);
```

## Integration Points

### ML Engine ↔ Backend
- ML Engine polls Backend for configuration
- ML Engine pushes occupancy updates to Backend via REST API
- Backend stores and aggregates updates

### Backend ↔ Mobile App
- Mobile app polls Backend for occupancy status (5s interval)
- Backend provides real-time data via REST endpoints
- Future: WebSocket for instant updates

## Future Enhancements

1. **License Plate Recognition**: Integrate ALPR for automated billing
2. **Predictive Analytics**: Machine learning model for occupancy prediction
3. **Reservation System**: Allow users to book spots in advance
4. **Multi-lot Support**: Manage multiple parking facilities
5. **Payment Integration**: Integrate with payment gateways
6. **Space-specific Analytics**: Track individual space patterns

## Deployment Architecture

```
[Edge Device/Camera]
    ↓
[ML Engine Container]
    ↓
[Backend API Container]
    ↓
[PostgreSQL Database]

[Mobile App] ←→ [Backend API]
```
