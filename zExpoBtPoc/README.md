# Expo Bluetooth + Location POC

A minimal POC here doesn’t need to look pretty or talk to your backend. The whole point is to answer one question with confidence:

**“Can Expo (with a custom dev client) reliably detect Bluetooth connections and track location in the background on iOS for our use case?”**

To get that answer, you only need a tiny, focused prototype. No UI polish, no navigation, no auth, no backend. Just a single screen that logs events.

Below is the cleanest, fastest path to that POC.

---
## 🎯 What the POC Must Prove
### 1. Bluetooth Feasibility
#### Can Expo (with a custom dev client) run a Bluetooth library that:
- Scans for nearby devices
- Reads MAC addresses (or iOS‑safe identifiers)
- Detects connection/disconnection events
### 2. Location Feasibility
#### Can the app:
- Request location permissions
- Track location in the background
- Detect movement reliably
- Run without being killed by iOS
### 3. Combined Behavior
#### Can we:
- Detect Bluetooth connect
- Start low‑frequency location tracking
- Detect movement
- Switch to high‑frequency tracking
- Detect Bluetooth disconnect
- Stop tracking

If the POC can do those three things, the full app is absolutely viable.

---
## 🧪 Minimal POC Scope (What We Actually Build)

A single screen with:
- A “Start Bluetooth Scan” button
- A log window showing:
  - Bluetooth devices found
  - Connection events
  - Disconnection events
  - Location updates
  - Speed calculations

No backend.

No UI.

No navigation.

No persistent storage.

Just logs.

---
## 🛠️ Tools & Libraries Needed

Because Expo’s managed workflow doesn’t support Bluetooth, we use:
### Expo + Custom Dev Client
This gives us:
- Expo tooling
- Ability to include native modules
### Bluetooth Library Options
You only need one of these:
#### Option A (Preferred): `react-native-ble-plx`
- Most mature
- Works on iOS
- Supports scanning + connection events
- Works with custom dev client
#### Option B: `react-native-bluetooth-classic`
- Better for classic Bluetooth (cars often use classic, not BLE)
- Works with custom dev client
- Supports connection/disconnection events

For car head units, classic Bluetooth is more common, so Option B may be the better fit.

### Location Library

Expo’s built‑in:
- expo-location

Supports:
- Foreground tracking
- Background tracking
- Significant location change
- Speed detection
---
## 🧪 Minimal POC Steps

Here’s the exact sequence to build the POC.
---
### Step 1 — Create a new Expo project
```
npx create-expo-app mileage-poc
```

---
### Step 2 — Add Bluetooth library + location

Example for classic Bluetooth:
```
npx expo install react-native-bluetooth-classic
npx expo install expo-location
```

---
### Step 3 — Create a custom dev client

This is required for Bluetooth.
```
npx expo prebuild
npx expo run:ios
```

This builds a native iOS app with the Bluetooth library included.

---
### Step 4 — Add a single screen with logs
The screen should:

#### Bluetooth
- Request Bluetooth permissions
- Start scanning
- Log discovered devices
- Log connection events
- Log disconnection events
#### Location
- Request location permissions
- Start background location updates
- Log:
  - latitude
  - longitude
  - speed
  - timestamp
#### Combined
- When Bluetooth connects → start location tracking
- When Bluetooth disconnects → stop tracking

---
### Step 5 — Test with your actual cars

You’ll test:
#### Bluetooth
- Does the car appear in scan results?
- Does the library expose a stable identifier?
- Does iOS allow reading MAC addresses?
  - (iOS often hides MAC addresses; we may need to use UUID instead.)
- Does the library fire a “connected” event when you start the car?
- Does it fire a “disconnected” event when you turn the car off?
#### Location
- Does background tracking continue when the screen is off?
- Does iOS throttle updates?
- Does speed detection work?
- Does the app survive a 10–15 minute drive?
#### Combined
- Does Bluetooth connect before movement?
- Does movement detection work?
- Does Bluetooth disconnect reliably end the trip?

---
## 🧪 What Success Looks Like

If the POC can:
- Detect your car’s Bluetooth reliably
- Detect connect/disconnect events
- Track location in background
- Detect movement
- Log everything without crashing

Then **Expo + custom dev client is fully viable** for the full app.

If any of these fail, we pivot to:
- Bare React Native
- Or a different Bluetooth library
- Or a different pairing strategy

But we’ll know early.

---
## ⏱️ Time Required

You can build this POC in:
#### 2–4 hours
(If I generate the code and you run it)

Or:
#### 1 day
(If you want to write it yourself and explore)

---
## 🎁 If you want, I can generate next:

#### A. The full POC code (single screen, ready to paste)
#### B. The custom dev client config
#### C. The Bluetooth + location logging screen
#### D. A test checklist for your cars
#### E. A fallback plan if iOS hides MAC addresses

Just tell me which direction you want to go.