# Mileage Tracking App — Architecture & Planning Document

## 📌 Purpose

This project aims to create a lightweight, secure, and reliable mileage‑tracking system for two users (Tony and spouse) and multiple vehicles. The app should automatically detect when a user connects to a vehicle via AVAudioSession, track mileage using location services, and store trip data in an Azure hosted backend.

The goals are:

- Learn and gain experience with **React Native (Expo)**.
- Build a **simple but robust** personal mileage tracker.
- Ensure **security**, **data integrity**, and **future extensibility**.
- Keep the app minimal while supporting real‑world usage.

---

# 🧱 Overall Architecture

The system consists of three major components:

## 1. **Mobile App (React Native + Expo)**
- Runs on two iPhones.
- Detects vehicle connections via **AVAudioSession**.
- Tracks location and calculates mileage.
- Prompts for business/personal classification.
- Syncs trips and vehicles with backend APIs.

## 2. **Backend (Azure Functions + Azure SQL Database)**
- Exposes secure REST APIs for:
  - Authentication
  - Vehicle management
  - Trip creation and updates
  - User data syncing
- Stores normalized relational data in **Azure SQL Database – Basic Tier (5 DTUs)**.
- Uses environment‑stored secrets for JWT signing and optional HMAC request signing.

## 3. **Azure Infrastructure**
- Azure Functions for compute.
- Azure SQL Database for relational storage.
- Optional future use of Azure Blob Storage for caching.
- Azure security features (rate limiting, IP reputation, secret storage).

---

# 🧩 Design Decisions (Snapshot)

This section captures all decisions made during the planning session.

## 1. Authentication & Security

### ✔ Per‑User Authentication
- Each user has an account (email + password).
- JWT access tokens (short‑lived) + refresh tokens.
- Phones are just clients; no per‑device identity required.

### ✔ API Security Model
- Public API behind Azure API Management.
- Secrets stored in Azure Key Vault.
- HMAC‑signed requests for integrity.
- Rate limiting to prevent abuse.

### ✔ GitHub‑Safe
- Codebase can be public.
- Secrets never stored in code.

---

## 2. Vehicle Identification

### Initial set-up
- At app launch (after authentication), if no vehicles are registered, prompt user to add a vehicle.  Ensure with the user that the phone is already connected to the car's AVAudioSession to capture the audio route name (and if possible, the audio profile or any stable identifier). This will be the primary method for identifying the vehicle in future trips.
- User names the vehicle.
- App stores:
  - Vehicle name
  - Audio route name (from AVAudioSession)
  - Optional: Bluetooth MAC address (if available and stable)
  - Optional: audio profile (A2DP, HFP, CarAudio, etc.)
- Backend stores the mapping.
- Both users’ apps sync the same vehicle list.

NOTE: Apple iOS does not provide stable Bluetooth MAC addresses for connected devices, and Bluetooth scanning is unreliable for identifying vehicles. Instead, the app relies on AVAudioSession to detect when the phone connects to a car's audio system, which provides a stable and unique identifier for each vehicle.

### Additional vehicles
- User can add more vehicles manually.
- For each new vehicle, user must first connect to it via AVAudioSession to capture the audio route name and profile.  When user selects to "add new vehicle," prompt them to connect to the new vehicle's AVAudioSession first, then capture the audio route name and profile to create a new vehicle entry in the app. This ensures that each vehicle has a stable identifier for future detection.
- This ensures all vehicles have a stable identifier for future detection.

---

## 3. Trip Lifecycle

### ✔ Trip Start Logic
Trip “intent” begins when:
- AVAudioSession connects to a known vehicle.

App must be in the foreground or background (with appropriate permissions) to detect this event. The trip is not officially “started” until movement is detected, but this connection event signals the user’s intent to drive.

Actual trip begins when:
- Movement is detected (speed > ~3–5 mph).

Benefits:
- Reduces battery usage.
- Avoids recording idle time in driveway.
- More accurate trip boundaries.

### ✔ Location Services Required
- App requires location permissions.
- Uses low‑frequency updates until movement begins.
- Switches to high‑frequency updates during active trip.

### ✔ Trip End Logic
- Trip ends when AVAudioSession disconnects.
- Grace period to avoid false splits (e.g., brief signal loss).
- Optional future enhancement: auto‑end after long idle periods.

---

## 4. Trip Categorization (Business vs Personal)

### ✔ Prompt on AVAudioSession Connect
- Non‑blocking modal/banner:
  - Business
  - Personal
  - Ask Later

### ✔ No Default Category
- Trips start as **Uncategorized**.
- If user doesn’t choose at start, prompt again at trip end.

### ✔ Future Auto‑Categorization (Not in MVP)
- Location‑based rules (home, church, tea shop, etc.).
- Rules may specify:
  - Always business
  - Always personal
  - Always ask
- User can override suggestions.

---

## 5. Data Model (Normalized)

### ✔ Conceptual Schema (Initial)

#### `users`
- user_key
- email
- password_hash
- created_at

#### `vehicles`
- vehicle_key
- user_key (or shared group id)
- vehicle_name
- audio_route_name
- audio_profile
- vehicle_make
- vehicle_color
- created_at
- is_active

#### `trips`
- trip_key
- user_key (driver)
- vehicle_key
- start_time
- end_time
- start_lat
- start_lng
- end_lat
- end_lng
- distance_miles
- category (business/personal/uncategorized)
- description
- created_at

### ✔ Future Tables (Optional)
- `rules` for auto‑categorization
- `business_purpose_templates`

---

## 6. React Native App Structure

### ✔ Expo with Custom Dev Client
- Allows use of native Bluetooth libraries.
- Keeps Expo tooling benefits.

### Core Features
- Login / signup
- Vehicle list + add/edit
- Trip history
- Trip detail
- Background trip tracking
- Bluetooth detection
- Category prompts
- Developer mode for simulation

---

## 7. Testing Strategy

### ✔ Developer Mode (App)
- Simulate:
  - Bluetooth connect/disconnect
  - Movement
  - Trip start/end
- Allows testing without driving.

### ✔ Backend Simulation
- Scripts to generate:
  - Fake users
  - Fake vehicles
  - Fake trips

### ✔ Real‑World Testing
- Short drives to validate:
  - Bluetooth timing
  - GPS accuracy
  - Battery impact
  - Edge cases

---

## 8. Future Enhancements

### ✔ Exporting Data
- Export via D1 queries.
- Future API endpoint for CSV/PDF.

### ✔ Auto‑Categorization
- Location‑based rules.
- Suggestions with override.

### ✔ Cloudflare KV (Optional)
- Cache:
  - User’s vehicle list
  - MAC → vehicle_id mapping
- Only needed if performance requires it.

---

# 🗺 High‑Level System Flow

1. User logs in → receives JWT + refresh token.
2. App syncs vehicles from backend.
3. App monitors Bluetooth connections.
4. On connect:
   - Identify vehicle by MAC.
   - Prompt for category (optional).
   - Begin low‑frequency location tracking.
5. On movement:
   - Start trip.
   - Switch to high‑frequency tracking.
6. On disconnect:
   - End trip.
   - Prompt for category if still uncategorized.
   - Upload trip to backend.
7. Backend stores trip in D1.
8. User can view/edit trips in app.

---

# 🧭 Summary

This document captures the complete architectural and design decisions for the mileage tracking app MVP. The system is intentionally simple, secure, and extensible, with a clean separation between mobile app, backend APIs, and data storage.

Next steps:

1. Finalize D1 schema.
2. Define API endpoints and payloads (OpenAPI-style).
3. Create React Native screen/component map.
4. Create project folder structure.
5. Begin implementation.

