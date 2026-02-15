# Trip Lifecycle and Tracking Flow

This document describes the complete end‑to‑end lifecycle of a trip in the Mileage Tracking App. It covers Bluetooth detection, movement detection, trip creation, updates, categorization, and final persistence to the backend.

The flow is designed for reliability, battery efficiency, and clarity, while aligning with the D1 schema and API contract.

---

# 1. High‑Level Overview

A trip progresses through the following phases:

1. Bluetooth Connect Detected  
2. Vehicle Identified  
3. Category Prompt Shown (optional)  
4. Movement Detected → Trip Start  
5. Active Trip Tracking  
6. Bluetooth Disconnect Detected → Trip End  
7. Category Confirmation (if needed)  
8. Trip Upload to Backend  
9. Local State Reset

Each phase is described in detail below.

---

# 2. Detailed Lifecycle

## 2.1 Bluetooth Connect Detected

The app listens for Bluetooth connection events from paired devices.

When a connection occurs:

- The app reads the Bluetooth MAC address.
- It checks the local cache of vehicles.
- If the MAC matches a known vehicle:
  - The app identifies the vehicle.
- If not:
  - No trip is started.
  - (Future enhancement: prompt user to add a new vehicle.)

State transition:
- from: idle  
- to: vehicle_detected

---

## 2.2 Vehicle Identified

Once the vehicle is identified:

- The app loads the vehicle record from local storage.
- The app prepares a new trip context in memory:
    vehicleKey  
    userKey  
    startTime (pending)  
    category (initially "uncategorized")  

State transition:
- from: vehicle_detected  
- to: awaiting_category_selection

---

## 2.3 Category Prompt Shown

Immediately after identifying the vehicle:

- A non‑blocking banner or modal appears:
    "Trip type for Camry?"
    [Business] [Personal] [Ask Later]

If the user selects:
- Business → category = business  
- Personal → category = personal  
- Ask Later → category remains uncategorized  

If the user ignores the prompt:
- The trip continues as uncategorized until trip end.

State transition:
- from: awaiting_category_selection  
- to: awaiting_movement

---

## 2.4 Movement Detected → Trip Start

The app monitors location using low‑frequency updates or significant‑change monitoring.

When movement exceeds a threshold (for example, 3–5 mph):

- The trip officially begins.
- The app records:
    startTime  
    startLat  
    startLng  
- The app switches to high‑frequency location tracking.

A POST request is prepared for:
    /trips

Example payload:
    {
      "vehicleKey": 10,
      "startTime": "2025-01-01T10:00:00Z",
      "startLat": 28.123,
      "startLng": -82.456
    }

State transition:
- from: awaiting_movement  
- to: tracking_active

---

## 2.5 Active Trip Tracking

During the trip:

- The app collects periodic GPS points.
- Distance is calculated incrementally using the Haversine formula.
- The app maintains:
    currentDistanceMiles  
    lastKnownLocation  
    lastUpdateTime  

The app does not yet send updates to the backend (MVP design).  
All data is held locally until the trip ends.

State transition:
- remains: tracking_active

---

## 2.6 Bluetooth Disconnect Detected → Trip End

When the phone disconnects from the vehicle’s Bluetooth:

- The app stops location tracking.
- The app records:
    endTime  
    endLat  
    endLng  
    finalDistanceMiles  

A PUT request is prepared for:
    /trips/{tripKey}

Example payload:
    {
      "endTime": "2025-01-01T10:30:00Z",
      "endLat": 28.200,
      "endLng": -82.500,
      "distanceMiles": 12.3,
      "category": "business",
      "description": "Delivery run"
    }

Grace period:
- If Bluetooth reconnects within a short window (for example, 10 seconds), the trip is not ended.

State transition:
- from: tracking_active  
- to: awaiting_category_confirmation

---

## 2.7 Category Confirmation (If Needed)

If the trip is still uncategorized:

- The app shows a modal:
    "Categorize this trip?"
    [Business] [Personal]

If the user still does not choose:
- The trip is saved as uncategorized.
- The user can edit it later.

State transition:
- from: awaiting_category_confirmation  
- to: ready_to_upload

---

## 2.8 Trip Upload to Backend

Two API calls occur:

1. POST /trips (if not already sent at movement detection)  
2. PUT /trips/{tripKey} with final details  

If the device is offline:
- The trip is queued locally.
- A background sync retries until successful.

State transition:
- from: ready_to_upload  
- to: completed

---

## 2.9 Local State Reset

After successful upload:

- Active trip state is cleared.
- Category prompt is dismissed.
- Tracking hooks reset.
- App returns to idle state.

State transition:
- from: completed  
- to: idle

---

# 3. State Machine Summary

Below is a simplified state machine representation.

    idle
      ↓ (Bluetooth connect)
    vehicle_detected
      ↓ (show category prompt)
    awaiting_category_selection
      ↓ (movement detected)
    awaiting_movement
      ↓ (speed > threshold)
    tracking_active
      ↓ (Bluetooth disconnect)
    awaiting_category_confirmation
      ↓ (user confirms or skips)
    ready_to_upload
      ↓ (API success)
    completed
      ↓
    idle

---

# 4. Error Handling

## Bluetooth Disconnect During Startup
If Bluetooth disconnects before movement:
- Trip is never started.
- State resets to idle.

## GPS Permission Revoked Mid‑Trip
- App pauses tracking.
- User is prompted to re‑enable permissions.
- If not restored, trip ends with partial data.

## API Failure
- Trip is stored locally.
- Background sync retries until success.

---

# 5. Future Enhancements

## Auto‑Categorization Rules
- Based on start or end location.
- Rules stored in a future CategorizationRules table.

## Mid‑Trip Updates
- Periodic PUT calls for long trips.
- Useful for crash recovery.

## Offline‑First Mode
- Full local queueing of trips.
- Sync on reconnect.

---

# End of Trip Lifecycle Document
