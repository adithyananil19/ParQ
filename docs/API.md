# SmartPark API Documentation

## Base URL
```
http://localhost:8000/api/v1
```

## Authentication
Currently, the API uses no authentication. Future versions will implement JWT-based auth.

---

## Endpoints

### Parking Occupancy

#### Get Parking Lot Occupancy
```
GET /parking/{lot_id}/occupancy
```

**Parameters**:
- `lot_id` (path, required): Parking lot identifier

**Response**:
```json
{
  "lot_id": "default",
  "total_spaces": 100,
  "occupied_spaces": 45,
  "available_spaces": 55,
  "occupancy_percentage": 45.0,
  "timestamp": "2024-01-15T10:30:00Z",
  "spaces": [
    {
      "space_id": "A1",
      "is_occupied": true,
      "last_updated": "2024-01-15T10:29:55Z",
      "confidence": 0.95
    }
  ]
}
```

---

#### Get Available Spaces
```
GET /parking/{lot_id}/available-spaces
```

**Response**:
```json
{
  "lot_id": "default",
  "available_count": 55,
  "spaces": [
    {
      "space_id": "A2",
      "location": "Row A, Spot 2",
      "distance_from_entrance": 45.5
    }
  ]
}
```

---

#### Receive Occupancy Update (from ML Engine)
```
POST /parking/{lot_id}/update
```

**Request Body**:
```json
{
  "updates": [
    {
      "space_id": "A1",
      "is_occupied": true,
      "confidence": 0.95
    },
    {
      "space_id": "A2",
      "is_occupied": false,
      "confidence": 0.92
    }
  ]
}
```

**Response**:
```json
{
  "status": "success",
  "processed": 2,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

### Historical Data

#### Get Occupancy History
```
GET /parking/{lot_id}/history?days=7
```

**Parameters**:
- `lot_id` (path, required): Parking lot identifier
- `days` (query, optional): Number of days to retrieve (default: 7)

**Response**:
```json
{
  "lot_id": "default",
  "entries": [
    {
      "timestamp": "2024-01-15T10:00:00Z",
      "occupancy_percentage": 42.0,
      "occupied_spaces": 42,
      "available_spaces": 58
    }
  ]
}
```

---

### Health & Status

#### Health Check
```
GET /health
```

**Response**:
```json
{
  "status": "healthy",
  "service": "SmartPark API",
  "version": "1.0.0"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid request parameters"
}
```

### 404 Not Found
```json
{
  "detail": "Parking lot not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

---

## Rate Limiting
Currently not implemented. Will be added in future versions.

---

## WebSocket (Future)

Real-time occupancy updates via WebSocket:
```
ws://localhost:8000/ws/parking/{lot_id}
```

Messages will be sent in real-time when occupancy changes detect.
