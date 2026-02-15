# Mileage Tracking API Contract

This document defines the REST API used by the React Native app to communicate with the Cloudflare Workers backend. It is aligned with the D1 schema and the OpenAPI specification.

---

# 1. Authentication

## POST /auth/register
Create a new user.

### Request
    {
      "email": "user@example.com",
      "password": "plaintext-password"
    }

### Response
    {
      "userKey": 1,
      "email": "user@example.com"
    }

---

## POST /auth/login
Authenticate a user and return tokens.

### Request
    {
      "email": "user@example.com",
      "password": "plaintext-password"
    }

### Response
    {
      "accessToken": "jwt-here",
      "refreshToken": "refresh-token-here",
      "user": {
        "userKey": 1,
        "email": "user@example.com"
      }
    }

---

## POST /auth/refresh
Refresh the access token.

### Request
    {
      "refreshToken": "refresh-token-here"
    }

### Response
    {
      "accessToken": "new-jwt-here"
    }

---

# 2. Vehicles

## GET /vehicles
List all vehicles for the authenticated user.

### Response
    [
      {
        "vehicleKey": 10,
        "name": "Camry",
        "bluetoothMac": "AA:BB:CC:DD:EE:FF",
        "bluetoothName": "TOYOTA CAMRY",
        "isActive": true
      }
    ]

---

## POST /vehicles
Create a new vehicle and Bluetooth mapping.

### Request
    {
      "name": "Camry",
      "bluetoothMac": "AA:BB:CC:DD:EE:FF",
      "bluetoothName": "TOYOTA CAMRY"
    }

### Response
    {
      "vehicleKey": 10,
      "name": "Camry",
      "bluetoothMac": "AA:BB:CC:DD:EE:FF",
      "bluetoothName": "TOYOTA CAMRY",
      "isActive": true
    }

---

## PUT /vehicles/{vehicleKey}
Update vehicle name or active status.

### Request
    {
      "name": "Camry Hybrid",
      "isActive": true
    }

### Response
    {
      "vehicleKey": 10,
      "name": "Camry Hybrid",
      "isActive": true
    }

---

# 3. Trips

## GET /trips
List trips for the authenticated user.

### Query Parameters
- vehicleKey (optional)
- startDate (optional)
- endDate (optional)

### Response
    [
      {
        "tripKey": 100,
        "vehicleKey": 10,
        "startTime": "2025-01-01T10:00:00Z",
        "endTime": "2025-01-01T10:30:00Z",
        "distanceMiles": 12.3,
        "category": "business",
        "description": "Delivery run"
      }
    ]

---

## POST /trips
Create a new trip.

### Request
    {
      "vehicleKey": 10,
      "startTime": "2025-01-01T10:00:00Z",
      "startLat": 28.123,
      "startLng": -82.456
    }

### Response
    {
      "tripKey": 100
    }

---

## PUT /trips/{tripKey}
Update trip details (end time, distance, category, description).

### Request
    {
      "endTime": "2025-01-01T10:30:00Z",
      "endLat": 28.200,
      "endLng": -82.500,
      "distanceMiles": 12.3,
      "category": "business",
      "description": "Delivery run"
    }

### Response
    {
      "tripKey": 100,
      "updated": true
    }

---

# 4. Error Format

All errors follow this structure:

    {
      "error": "InvalidCredentials",
      "message": "Email or password is incorrect."
    }

---

# 5. Authentication Requirements

| Endpoint        | Auth Required |
|-----------------|---------------|
| /auth/register  | No            |
| /auth/login     | No            |
| /auth/refresh   | No            |
| /vehicles/*     | Yes           |
| /trips/*        | Yes           |

---

# End of API Contract
