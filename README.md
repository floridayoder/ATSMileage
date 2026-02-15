# Mileage Tracking App — Architecture & Planning Document

## 📌 Purpose

This project aims to create a lightweight, secure, and reliable mileage‑tracking system for two users (Tony and spouse) and multiple vehicles. The app should automatically detect when a user connects to a vehicle via Bluetooth, track mileage using location services, and store trip data in a Cloudflare‑hosted backend.

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
- Detects Bluetooth connections to known vehicles.
- Tracks location and calculates mileage.
- Prompts for business/personal classification.
- Syncs trips and vehicles with backend APIs.
- Uses Expo with a **custom dev client** to support Bluetooth libraries.

## 2. **Backend (Cloudflare Workers + D1 Database)**
- Exposes secure REST APIs for:
  - Authentication
  - Vehicle management
  - Trip creation and updates
  - User data syncing
- Stores normalized relational data in **D1**.
- Uses environment‑stored secrets for JWT signing and optional HMAC request signing.

## 3. **Cloudflare Infrastructure**
- Cloudflare Workers for compute.
- Cloudflare D1 for relational storage.
- Optional future use of Cloudflare KV for caching.
- Cloudflare security features (rate limiting, IP reputation, secret storage).

---

# 🧩 Design Decisions (Snapshot)

This section captures all decisions made during the planning session.

## 1. Authentication & Security

### ✔ Per‑User Authentication
- Each user has an account (email + password).
- JWT access tokens (short‑lived) + refresh tokens.
- Phones are just clients; no per‑device identity required.

### ✔ API Security Model
- Public API behind Cloudflare.
- Secrets stored in Cloudflare environment variables.
- Optional HMAC‑signed requests for integrity.
- No Cloudflare Zero Trust (too much friction for mobile apps).

### ✔ GitHub‑Safe
- Codebase can be public.
- Secrets never stored in code.

---

## 2. Vehicle Identification & Bluetooth Mapping

### ✔ One‑Time Pairing Flow
- App scans for nearby Bluetooth devices.
- User selects the car’s Bluetooth device.
- App stores:
  - Vehicle name
  - Bluetooth MAC address
  - Bluetooth display name
- Backend stores the mapping.
- Both users’ apps sync the same vehicle list.

### ✔ MAC Address as Primary Identifier
- More reliable than Bluetooth name.
- Ensures correct vehicle detection even if names are generic.

---

## 3. Trip Lifecycle

### ✔ Trip Start Logic
Trip “intent” begins when:
- Bluetooth connects to a known vehicle.

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
- Trip ends when Bluetooth disconnects.
- Grace period to avoid false splits (e.g., brief signal loss).
- Optional future enhancement: auto‑end after long idle periods.

---

## 4. Trip Categorization (Business vs Personal)

### ✔ Prompt on Bluetooth Connect
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
- bluetooth_mac
- bluetooth_name
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

