-- ============================================================
-- D1 Schema Initialization
-- Mileage Tracking App
-- ============================================================

PRAGMA foreign_keys = ON;

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS Users (
    UserKey            INTEGER PRIMARY KEY AUTOINCREMENT,
    Email              TEXT NOT NULL UNIQUE,
    PasswordHash       TEXT NOT NULL,
    CreatedAt          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS IX_Users_Email
    ON Users (Email);


-- ============================================================
-- VEHICLES
-- ============================================================

CREATE TABLE IF NOT EXISTS Vehicles (
    VehicleKey         INTEGER PRIMARY KEY AUTOINCREMENT,
    OwnerUserKey       INTEGER NOT NULL,
    VehicleName        TEXT NOT NULL,
    BluetoothMac       TEXT NOT NULL UNIQUE,
    BluetoothName      TEXT,
    IsActive           INTEGER NOT NULL DEFAULT 1,
    CreatedAt          TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (OwnerUserKey) REFERENCES Users(UserKey)
);

CREATE INDEX IF NOT EXISTS IX_Vehicles_OwnerUserKey
    ON Vehicles (OwnerUserKey);

CREATE INDEX IF NOT EXISTS IX_Vehicles_BluetoothMac
    ON Vehicles (BluetoothMac);


-- ============================================================
-- TRIPS
-- ============================================================

CREATE TABLE IF NOT EXISTS Trips (
    TripKey            INTEGER PRIMARY KEY AUTOINCREMENT,
    UserKey            INTEGER NOT NULL,
    VehicleKey         INTEGER NOT NULL,

    StartTime          TEXT NOT NULL,
    EndTime            TEXT,
    
    StartLat           REAL,
    StartLng           REAL,
    EndLat             REAL,
    EndLng             REAL,

    DistanceMiles      REAL DEFAULT 0,

    Category           TEXT NOT NULL DEFAULT 'uncategorized'
        CHECK (Category IN ('business', 'personal', 'uncategorized')),

    Description        TEXT,

    CreatedAt          TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (UserKey) REFERENCES Users(UserKey),
    FOREIGN KEY (VehicleKey) REFERENCES Vehicles(VehicleKey)
);

CREATE INDEX IF NOT EXISTS IX_Trips_UserKey
    ON Trips (UserKey);

CREATE INDEX IF NOT EXISTS IX_Trips_VehicleKey
    ON Trips (VehicleKey);

CREATE INDEX IF NOT EXISTS IX_Trips_StartTime
    ON Trips (StartTime);


-- ============================================================
-- OPTIONAL FUTURE TABLES (COMMENTED OUT)
-- ============================================================

-- -- Business Purpose Templates
-- CREATE TABLE IF NOT EXISTS BusinessPurposes (
--     PurposeKey        INTEGER PRIMARY KEY AUTOINCREMENT,
--     UserKey           INTEGER NOT NULL,
--     Label             TEXT NOT NULL,
--     CreatedAt         TEXT NOT NULL DEFAULT (datetime('now')),
--     FOREIGN KEY (UserKey) REFERENCES Users(UserKey)
-- );

-- -- Auto-Categorization Rules
-- CREATE TABLE IF NOT EXISTS CategorizationRules (
--     RuleKey           INTEGER PRIMARY KEY AUTOINCREMENT,
--     UserKey           INTEGER NOT NULL,
--     Label             TEXT NOT NULL,
--     Latitude          REAL NOT NULL,
--     Longitude         REAL NOT NULL,
--     RadiusMeters      INTEGER NOT NULL,
--     DefaultCategory   TEXT NOT NULL CHECK (DefaultCategory IN ('business', 'personal', 'ask')),
--     CreatedAt         TEXT NOT NULL DEFAULT (datetime('now')),
--     FOREIGN KEY (UserKey) REFERENCES Users(UserKey)
-- );

