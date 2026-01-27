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
