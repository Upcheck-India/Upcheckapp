# UPCHECK APP - Backend API

## Overview
Complete Nest.js backend for the UPCHECK shrimp farming application with Supabase integration.

## Technology Stack
- **Framework**: Nest.js v11 (Express.js)
- **Database**: PostgreSQL (Supabase)
- **ORM**: TypeORM
- **Authentication**: Supabase Auth
- **Validation**: class-validator

---

## ✅ Implemented Features (14 Modules)

### Core Infrastructure
| Module | Description | Status |
|--------|-------------|--------|
| Auth | Supabase Auth, JWT, Guards | ✅ |
| Profiles | User profile management | ✅ |

### Farm Management
| Module | Description | Status |
|--------|-------------|--------|
| Farms | Farm CRUD operations | ✅ |
| Ponds | Pond management per farm | ✅ |
| Crops | Cultivation cycle tracking | ✅ |

### Operations
| Module | Description | Status |
|--------|-------------|--------|
| Water Quality | Water parameter records | ✅ |
| Feed Records | Feeding data tracking | ✅ |
| Shrimp Calculations | FCR, ADG, survival rate | ✅ |

### Finance & Inventory
| Module | Description | Status |
|--------|-------------|--------|
| Transactions | Income/expense tracking | ✅ |
| Inventory | Stock management | ✅ |

### Additional Features
| Module | Description | Status |
|--------|-------------|--------|
| News | Articles/news feed | ✅ |
| Alerts | User notifications | ✅ |
| Products | eShop products | ✅ |

---

## 🔗 API Endpoints

### Authentication
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/login/otp
POST /api/auth/verify-otp
POST /api/auth/refresh
GET  /api/auth/me (protected)
POST /api/auth/logout
```

### Profiles
```
POST   /api/profiles
GET    /api/profiles
GET    /api/profiles/:id
PATCH  /api/profiles/:id
```

### Farms
```
POST   /api/farms
GET    /api/farms?userId=
GET    /api/farms/:id
PATCH  /api/farms/:id
DELETE /api/farms/:id
```

### Ponds
```
POST   /api/ponds
GET    /api/ponds?farmId=
GET    /api/ponds/:id
PATCH  /api/ponds/:id
DELETE /api/ponds/:id
```

### Crops
```
POST   /api/crops
GET    /api/crops?pondId=
GET    /api/crops/:id
PATCH  /api/crops/:id
PATCH  /api/crops/:id/harvest
DELETE /api/crops/:id
```

### Water Quality
```
POST   /api/water-quality
GET    /api/water-quality?pondId=
GET    /api/water-quality/pond/:pondId/latest
GET    /api/water-quality/:id
PATCH  /api/water-quality/:id
DELETE /api/water-quality/:id
```

### Feed Records
```
POST   /api/feed-records
GET    /api/feed-records?pondId=
GET    /api/feed-records/pond/:pondId/total
GET    /api/feed-records/:id
PATCH  /api/feed-records/:id
DELETE /api/feed-records/:id
```

### Shrimp Calculations
```
POST /api/shrimp-calculations/fcr
POST /api/shrimp-calculations/adg
POST /api/shrimp-calculations/survival-rate
POST /api/shrimp-calculations/daily-feed
POST /api/shrimp-calculations/expected-harvest
POST /api/shrimp-calculations/growth-projection
GET  /api/shrimp-calculations/biomass?stockCount=&averageWeightG=
GET  /api/shrimp-calculations/recommended-feeding-rate?averageWeightG=
```

### Transactions
```
POST   /api/transactions
GET    /api/transactions?farmId=&type=
GET    /api/transactions/farm/:farmId/summary
GET    /api/transactions/:id
PATCH  /api/transactions/:id
DELETE /api/transactions/:id
```

### Inventory
```
POST   /api/inventory
GET    /api/inventory?farmId=&category=
GET    /api/inventory/low-stock/:farmId
GET    /api/inventory/:id
PATCH  /api/inventory/:id
DELETE /api/inventory/:id
```

### News
```
POST   /api/news
GET    /api/news?category=
GET    /api/news/:id
PATCH  /api/news/:id
DELETE /api/news/:id
```

### Alerts
```
POST   /api/alerts
GET    /api/alerts/user/:userId?unreadOnly=
GET    /api/alerts/user/:userId/count
PATCH  /api/alerts/:id/read
PATCH  /api/alerts/user/:userId/read-all
DELETE /api/alerts/:id
```

### Products
```
POST   /api/products
GET    /api/products?category=
GET    /api/products/:id
PATCH  /api/products/:id
PATCH  /api/products/:id/stock
DELETE /api/products/:id
```

---

## 🚀 Quick Start

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

---

## ⚙️ Environment Variables

```env
DATABASE_URL=postgresql://...
PORT=8080
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

---

## 🔐 Truecaller verification

The `TruecallerService` (`backend/src/auth/truecaller.service.ts`) verifies the
two flows produced by the Android Truecaller SDK 2.6.0 and exchanges the result
for a Supabase session via `POST /auth/supabase/oauth/truecaller`.

### Flows

- **Flow A — One-Tap (signed payload).** The client posts
  `{ payload, signature, signatureAlgorithm, requestNonce, phoneNumber, firstName, lastName }`.
  The service verifies the RSA signature against the cached Truecaller public
  keys, decodes the base64 JSON payload, and checks the embedded `requestNonce`
  and `requestTime` (Requirements 9.1, 9.4, 9.5, 9.6).
- **Flow B — OTP / missed-call (access token).** The client posts
  `{ accessToken, phoneNumber, firstName, lastName }`. The service issues a
  server-to-server `GET` to the Truecaller profile API with a Bearer token and
  cross-checks the returned `phoneNumber` against the request after stripping
  `+91`/`91` and non-digits (Requirements 10.1–10.4).

On success, both flows feed `SupabaseAuthService.signInWithTruecaller` with
profile fields sourced from the verified payload (never the request body) and
return a `{ user, session }` body identical to `POST /auth/supabase/signin`.

### Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `TRUECALLER_PUBLIC_KEY_TTL_SECONDS` | `3600` | Public-key cache TTL in seconds. Clamped to `[3600, 86400]` per Requirement 9.2. Values outside the window are coerced to the nearest bound and a warning is logged. |
| `TRUECALLER_NONCE_TTL_SECONDS` | `600` | Replay-store TTL in seconds. Floor of `600` enforced per Requirement 9.7. Values below the floor are coerced up and logged. No upper bound; align with the public-key cache window when desired. |
| `TRUECALLER_PROFILE_API_URL` | `https://api5.truecaller.com/v1/otp/installation/verify/profile` | Endpoint used for Flow B access-token exchange. Override for staging or replay tests. |
| `TRUECALLER_KEYS_API_URL` | `https://api4.truecaller.com/v1/key` | Endpoint that returns the RSA public keys used to verify Flow A signatures. Override for staging. |

The legacy `TRUECALLER_APP_KEY` / `TRUECALLER_APP_SECRET` variables are not used
by `TruecallerService` and are retained only for older code paths.

### Operational notes

- The public-key cache is in-memory per process and uses singleflight refresh:
  concurrent misses share one outbound request, and a fetch that fails or
  returns zero usable keys raises `Public key fetch failed` (distinct from
  `Invalid signature`) so a Truecaller outage is visible in logs.
- The nonce replay store is in-memory with lazy eviction. Multi-instance
  deployments should swap in a Redis-backed `NonceReplayStore` (e.g.
  `SET NX EX`) so a replay attempted on a different instance is still rejected.
- All error responses match the exact strings required by Requirements 9 and 10:
  `Invalid signature`, `Invalid payload`, `Nonce mismatch`, `Payload expired`,
  `Nonce already used`, `Invalid access token`, `Invalid Truecaller profile`,
  `Phone number mismatch`.
- Sensitive fields (`payload`, `signature`, `requestNonce`, `accessToken`, full
  `phoneNumber`) are never logged. Phone numbers in diagnostic logs are masked
  to the last four digits, e.g. `+91XXXXXX1234` (Requirement 13.3).

---

## 📁 Project Structure

```
backend/src/
├── auth/           # Authentication
├── profiles/       # User profiles
├── farms/          # Farm management
├── ponds/          # Pond management
├── crops/          # Crop/season cycles
├── water-quality/  # Water parameters
├── feed-records/   # Feeding data
├── shrimp-calculations/ # Calculators
├── transactions/   # Financial records
├── inventory/      # Stock management
├── news/           # News articles
├── alerts/         # Notifications
├── products/       # eShop products
├── app.module.ts   # Root module
└── main.ts         # Entry point
```
