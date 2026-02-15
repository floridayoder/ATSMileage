/
├── backend/                         # Cloudflare Workers backend
│   ├── src/
│   │   ├── api/
│   │   │   ├── auth/                # Login, refresh tokens, user mgmt
│   │   │   ├── vehicles/            # Vehicle CRUD + pairing
│   │   │   ├── trips/               # Trip creation, updates, queries
│   │   │   └── middleware/          # Auth, validation, HMAC, rate limits
│   │   ├── db/
│   │   │   ├── client.ts            # D1 client wrapper
│   │   │   ├── queries/             # SQL queries grouped by domain
│   │   │   └── models/              # TypeScript models/interfaces
│   │   ├── utils/
│   │   │   ├── crypto.ts            # JWT, hashing, HMAC helpers
│   │   │   ├── validation.ts        # Input validation schemas
│   │   │   └── response.ts          # Standard API response helpers
│   │   ├── config/
│   │   │   ├── env.ts               # Environment variable loader
│   │   │   └── constants.ts         # Constants, enums, categories
│   │   └── index.ts                 # Worker entrypoint
│   │
│   ├── migrations/                  # D1 database schema + migrations
│   │   ├── 0001_init.sql
│   │   ├── 0002_seed_data.sql
│   │   └── ... (future migrations)
│   │
│   ├── tests/                       # Backend integration tests
│   │   ├── auth.test.ts
│   │   ├── vehicles.test.ts
│   │   └── trips.test.ts
│   │
│   ├── wrangler.toml                # Cloudflare Worker config
│   ├── package.json
│   └── README.md
│
├── mobile/                          # React Native / Expo app
│   ├── app/                         # Expo Router (if using)
│   │   ├── (auth)/                  # Login, signup screens
│   │   ├── (vehicles)/              # Vehicle list, add/edit
│   │   ├── (trips)/                 # Trip history, trip detail
│   │   ├── (tracking)/              # Background tracking logic
│   │   └── _layout.tsx              # Navigation layout
│   │
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   │   ├── VehicleCard.tsx
│   │   │   ├── TripCard.tsx
│   │   │   └── CategoryPrompt.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useBluetooth.ts      # Bluetooth scanning + events
│   │   │   ├── useLocation.ts       # Location tracking logic
│   │   │   ├── useTripManager.ts    # Trip lifecycle state machine
│   │   │   └── useApi.ts            # API wrapper with auth
│   │   │
│   │   ├── services/
│   │   │   ├── api.ts               # REST API client
│   │   │   ├── auth.ts              # Login, refresh, token mgmt
│   │   │   └── storage.ts           # Secure local storage helpers
│   │   │
│   │   ├── state/
│   │   │   ├── userStore.ts         # User auth state
│   │   │   ├── vehicleStore.ts      # Vehicles synced from backend
│   │   │   └── tripStore.ts         # Active trip + history
│   │   │
│   │   ├── utils/
│   │   │   ├── distance.ts          # Haversine distance calc
│   │   │   ├── time.ts              # Time formatting helpers
│   │   │   └── permissions.ts       # Permission checks
│   │   │
│   │   ├── constants/
│   │   │   ├── colors.ts
│   │   │   ├── enums.ts
│   │   │   └── config.ts
│   │   │
│   │   └── types/
│   │       ├── api.ts               # API request/response types
│   │       ├── models.ts            # Trip, Vehicle, User types
│   │       └── bluetooth.ts
│   │
│   ├── assets/                      # Images, icons, fonts
│   ├── scripts/                     # Dev scripts (simulated trips, etc.)
│   ├── app.json
│   ├── package.json
│   └── README.md
│
├── docs/                            # Project documentation
│   ├── architecture.md
│   ├── api-contract.md              # Endpoint definitions
│   ├── data-model.md                # D1 schema + ERD
│   ├── tracking-flow.md             # Trip lifecycle diagrams
│   └── roadmap.md
│
├── .gitignore
├── README.md                        # Main project overview
└── LICENSE (optional)
