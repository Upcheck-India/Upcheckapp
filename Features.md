# Shrimp Aquaculture Management App — Full Development Specification

> **Document Purpose:** End-to-end technical specification covering database schema, API design, business logic, validation rules, UI/UX requirements, and implementation notes for every feature in the app.

---

## Table of Contents

1. [Tech Stack Recommendations](#1-tech-stack-recommendations)
2. [Database Schema](#2-database-schema)
3. [Farm & Cycle Management](#3-farm--cycle-management)
4. [Water Quality Recording](#4-water-quality-recording)
5. [Feed & Feeding Tray Management](#5-feed--feeding-tray-management)
6. [Sampling](#6-sampling)
7. [Treatments](#7-treatments)
8. [Harvest & Mortality](#8-harvest--mortality)
9. [Chemical, Plankton & Microbiology Logging](#9-chemical-plankton--microbiology-logging)
10. [Disease Logging](#10-disease-logging)
11. [Disease Encyclopedia](#11-disease-encyclopedia)
12. [Farm Calculators](#12-farm-calculators)
13. [Simulation Tools](#13-simulation-tools)
14. [Notifications & Validation Warnings](#14-notifications--validation-warnings)
15. [Media & File Handling](#15-media--file-handling)
16. [Authentication & Multi-Tenancy](#16-authentication--multi-tenancy)
17. [API Endpoint Reference](#17-api-endpoint-reference)
18. [Business Logic Rules Summary](#18-business-logic-rules-summary)
19. [Testing Requirements](#19-testing-requirements)
20. [Implementation Milestones](#20-implementation-milestones)

---

## 1. Tech Stack Recommendations

### Mobile App (Frontend)
- **Framework:** React Native (Expo)
- **State Management:** Zustand / Redux Toolkit (React Native)
- **Local DB / Offline Cache:** SQLite via Expo SQLite (Aligning to the existing project)
- **Camera/Gallery:** expo-image-picker or image_picker
- **Charts:** Victory Native or fl_chart

### Backend
- **Runtime:** Refer to Existing Architecture
- **Database:** PostgreSQL (primary relational store)
- **File Storage:** Supabase Storage
- **Auth:** JWT with refresh tokens; OAuth2 optional
- **ORM:** Prisma (Node) or SQLAlchemy (Python)

### Infrastructure
- **Hosting:** Supabase
- **CDN:** Refer to existing architecture
- **Monitoring:** Refer to existing architecture

---

## 2. Database Schema

### 2.1 Entity Relationship Overview

```
users
  └── farms
        └── ponds
              └── cycles
                    ├── water_quality_logs
                    ├── feed_logs
                    │     └── feeding_tray_logs
                    ├── sampling_logs
                    ├── treatment_logs
                    ├── harvest_logs
                    ├── mortality_logs
                    ├── chemical_logs
                    ├── plankton_logs
                    ├── microbiology_logs
                    └── disease_logs

diseases (encyclopedia - seeded, read-only)
```

---

### 2.2 Full Table Definitions

#### `users`
```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  phone           VARCHAR(20),
  password_hash   TEXT NOT NULL,
  role            VARCHAR(20) DEFAULT 'farmer',  -- 'farmer', 'admin', 'viewer'
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### `farms`
```sql
CREATE TABLE farms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  location        VARCHAR(255),
  latitude        DECIMAL(9,6),
  longitude       DECIMAL(9,6),
  total_area_m2   DECIMAL(12,2),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### `ponds`
```sql
CREATE TABLE ponds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id         UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  shape           VARCHAR(10) NOT NULL CHECK (shape IN ('square', 'circle')),

  -- Dimensions (meters)
  length          DECIMAL(8,2),   -- used for square/rectangular ponds
  width           DECIMAL(8,2),   -- used for square/rectangular ponds
  diameter        DECIMAL(8,2),   -- used for circular ponds
  depth           DECIMAL(6,2) NOT NULL,

  -- Computed (stored for performance)
  area_m2         DECIMAL(12,4) NOT NULL,  -- auto-calculated on save

  status          VARCHAR(20) DEFAULT 'idle',  -- 'idle', 'active', 'harvested'
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- COMPUTED AREA RULE:
-- square/rect: area = length * width
-- circle: area = π * (diameter/2)²
```

#### `cycles`
```sql
CREATE TABLE cycles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pond_id               UUID NOT NULL REFERENCES ponds(id) ON DELETE CASCADE,

  -- Stocking Info
  stocking_date         DATE NOT NULL,
  initial_age_days      INT NOT NULL DEFAULT 0,  -- PL age at stocking
  total_seed            INT NOT NULL,             -- number of post-larvae stocked
  species               VARCHAR(100) NOT NULL DEFAULT 'Penaeus Vannamei',
  hatchery              VARCHAR(150),
  broodstock            VARCHAR(150),

  -- Economics
  feed_price_per_kg     DECIMAL(10,2),           -- local currency per kg of feed
  seed_price_per_unit   DECIMAL(10,4),
  overhead_cost         DECIMAL(12,2) DEFAULT 0,

  -- Targets
  carrying_capacity_kg  DECIMAL(10,2),           -- max biomass the pond can support
  target_size_g         DECIMAL(6,2),            -- target harvest size in grams
  target_survival_rate  DECIMAL(5,2),            -- percentage 0-100
  target_fcr            DECIMAL(5,2),            -- target feed conversion ratio
  target_days           INT,                     -- target grow-out duration

  -- Water volume
  water_volume_m3       DECIMAL(12,2),           -- filled during cycle start

  -- Status
  status                VARCHAR(20) DEFAULT 'active',  -- 'active', 'completed', 'aborted'
  end_date              DATE,
  end_reason            TEXT,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
```

#### `water_quality_logs`
```sql
CREATE TABLE water_quality_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id            UUID NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  logged_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  log_date            DATE NOT NULL,
  time_of_day         VARCHAR(10),  -- 'morning', 'afternoon', 'evening'

  -- Parameters
  ph                  DECIMAL(4,2),
  salinity_ppt        DECIMAL(5,2),
  temperature_c       DECIMAL(5,2),
  do_mg_l             DECIMAL(5,2),    -- dissolved oxygen
  transparency_cm     DECIMAL(6,2),
  orp_mv              DECIMAL(7,2),    -- oxidation reduction potential
  water_color         VARCHAR(50),
  weather             VARCHAR(50),     -- 'sunny', 'cloudy', 'rainy', 'overcast'
  conductivity_ms_cm  DECIMAL(8,3),
  turbidity_ntu       DECIMAL(8,2),
  water_height_cm     DECIMAL(7,2),

  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

#### `feed_logs`
```sql
CREATE TABLE feed_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id            UUID NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  log_date            DATE NOT NULL,
  is_fasting_day      BOOLEAN DEFAULT FALSE,

  -- Feed amounts per meal (kg) — up to 4 meals per day
  meal_1_amount_kg    DECIMAL(8,3),
  meal_1_time         TIME,
  meal_2_amount_kg    DECIMAL(8,3),
  meal_2_time         TIME,
  meal_3_amount_kg    DECIMAL(8,3),
  meal_3_time         TIME,
  meal_4_amount_kg    DECIMAL(8,3),
  meal_4_time         TIME,

  total_feed_kg       DECIMAL(10,3),  -- computed sum of meals
  feed_product_id     UUID REFERENCES feed_products(id),
  feed_product_name   VARCHAR(150),   -- fallback if product not in DB
  protein_percentage  DECIMAL(5,2),

  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

#### `feed_products`
```sql
CREATE TABLE feed_products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),  -- NULL = global/seeded
  brand         VARCHAR(100) NOT NULL,
  product_name  VARCHAR(150) NOT NULL,
  protein_pct   DECIMAL(5,2),
  price_per_kg  DECIMAL(10,2),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### `feeding_tray_logs`
```sql
CREATE TABLE feeding_tray_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_log_id   UUID NOT NULL REFERENCES feed_logs(id) ON DELETE CASCADE,
  tray_number   INT NOT NULL CHECK (tray_number BETWEEN 1 AND 4),
  status        VARCHAR(20) NOT NULL CHECK (status IN ('empty', 'few_left', 'a_lot_left')),
  checked_at    TIMESTAMPTZ DEFAULT NOW(),
  notes         TEXT
);
```

#### `sampling_logs`
```sql
CREATE TABLE sampling_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id        UUID NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  sample_date     DATE NOT NULL,
  day_of_culture  INT,  -- auto-calculated: sample_date - stocking_date + initial_age_days
  mbw_grams       DECIMAL(6,3) NOT NULL,   -- mean body weight
  sample_count    INT,                      -- number of shrimp weighed
  photos          TEXT[],                   -- array of storage URLs
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### `treatment_logs`
```sql
CREATE TABLE treatment_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id        UUID NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  treatment_date  DATE NOT NULL,
  type            VARCHAR(30),   -- 'chemical', 'biological', 'physical', 'other'
  product_name    VARCHAR(150),
  dosage          VARCHAR(100),
  dosage_unit     VARCHAR(30),
  target_issue    VARCHAR(200),  -- what problem the treatment addresses
  written_notes   TEXT,
  photos          TEXT[],
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### `harvest_logs`
```sql
CREATE TABLE harvest_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id          UUID NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  harvest_date      DATE NOT NULL,
  harvest_type      VARCHAR(20) DEFAULT 'partial',  -- 'partial', 'final'
  weight_kg         DECIMAL(10,3) NOT NULL,
  count             INT,
  price_per_kg      DECIMAL(10,2),
  total_revenue     DECIMAL(12,2),  -- computed: weight_kg * price_per_kg
  buyer_name        VARCHAR(150),
  buyer_contact     VARCHAR(100),
  average_size_g    DECIMAL(6,2),   -- can be computed from weight/count * 1000
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

#### `mortality_logs`
```sql
CREATE TABLE mortality_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id            UUID NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  mortality_date      DATE NOT NULL,
  estimated_count     INT NOT NULL,
  multiplier          DECIMAL(6,2) DEFAULT 1.0,  -- for tray sampling extrapolation
  estimated_total     INT,  -- computed: estimated_count * multiplier
  cause               VARCHAR(150),
  photos              TEXT[],
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

#### `chemical_logs`
```sql
CREATE TABLE chemical_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id          UUID NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  log_date          DATE NOT NULL,

  -- Nitrogen compounds (mg/L)
  ammonia_mg_l      DECIMAL(8,4),
  nitrite_mg_l      DECIMAL(8,4),
  nitrate_mg_l      DECIMAL(8,4),

  -- Alkalinity & Hardness
  alkalinity_mg_l   DECIMAL(8,2),
  calcium_mg_l      DECIMAL(8,2),
  magnesium_mg_l    DECIMAL(8,2),
  hardness_mg_l     DECIMAL(8,2),

  -- Other
  phosphate_mg_l    DECIMAL(8,4),
  iron_mg_l         DECIMAL(8,4),
  copper_ug_l       DECIMAL(8,4),
  hydrogen_sulfide  DECIMAL(8,6),   -- H2S mg/L
  co2_mg_l          DECIMAL(8,2),
  chlorine_mg_l     DECIMAL(8,4),

  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

#### `plankton_logs`
```sql
CREATE TABLE plankton_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id              UUID NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  log_date              DATE NOT NULL,

  -- Counts (cells/mL or units/mL)
  green_algae           INT,
  diatom                INT,
  cyanobacteria         INT,
  dinoflagellate        INT,
  protozoa              INT,
  euglenophyte          INT,
  other_phytoplankton   INT,
  zooplankton           INT,
  total_count           INT,  -- computed sum

  method                VARCHAR(50),  -- 'haemocytometer', 'plankton net', etc.
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
```

#### `microbiology_logs`
```sql
CREATE TABLE microbiology_logs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id                  UUID NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  log_date                  DATE NOT NULL,

  -- Vibrio types (CFU/mL)
  vibrio_total              DECIMAL(12,2),
  vibrio_parahaemolyticus   DECIMAL(12,2),
  vibrio_harveyi            DECIMAL(12,2),
  vibrio_alginolyticus      DECIMAL(12,2),
  vibrio_vulnificus         DECIMAL(12,2),

  -- Total bacteria
  total_bacteria_cfu        DECIMAL(14,2),

  -- Ratios
  vibrio_ratio_pct          DECIMAL(6,2),   -- vibrio_total / total_bacteria * 100

  lab_name                  VARCHAR(100),
  sample_source             VARCHAR(50),    -- 'water', 'sediment', 'shrimp hepatopancreas'
  notes                     TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);
```

#### `disease_logs`
```sql
CREATE TABLE disease_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id        UUID NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  disease_id      UUID REFERENCES diseases(id),    -- optional link to encyclopedia
  observed_date   DATE NOT NULL,
  disease_name    VARCHAR(150),
  symptoms        TEXT,
  severity        VARCHAR(20),  -- 'mild', 'moderate', 'severe'
  affected_count  INT,
  photos          TEXT[],
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### `diseases` (Encyclopedia - seeded)
```sql
CREATE TABLE diseases (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                VARCHAR(30) UNIQUE NOT NULL,  -- e.g. 'AHPND', 'WSSV', 'WFD', 'BG'
  common_name         VARCHAR(150) NOT NULL,
  full_name           VARCHAR(255),
  causative_agent     TEXT,
  description         TEXT,
  signs_symptoms      TEXT,
  affected_organs     TEXT,
  transmission        TEXT,
  prevention          TEXT,
  treatment_notes     TEXT,
  reference_images    TEXT[],     -- storage URLs to reference images
  external_links      TEXT[],
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

#### `simulation_runs`
```sql
CREATE TABLE simulation_runs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES users(id),
  name                      VARCHAR(150),

  -- Inputs
  farm_area_m2              DECIMAL(12,2) NOT NULL,
  stocking_amount_per_m2    DECIMAL(8,2),
  total_stocking            INT NOT NULL,
  target_survival_rate_pct  DECIMAL(5,2) NOT NULL,
  feed_price_per_kg         DECIMAL(10,2) NOT NULL,
  market_price_per_kg       DECIMAL(10,2) NOT NULL,
  initial_abw_g             DECIMAL(6,2) DEFAULT 0.001,  -- PL weight
  target_size_g             DECIMAL(6,2),
  initial_fcr               DECIMAL(5,2) DEFAULT 1.0,

  -- Partial harvest settings (stored as JSON array)
  partial_harvests          JSONB DEFAULT '[]',
  -- Structure: [{ age_days: INT, percentage: DECIMAL }]

  created_at                TIMESTAMPTZ DEFAULT NOW()
);
```

#### `simulation_results`
```sql
CREATE TABLE simulation_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id   UUID NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
  day             INT NOT NULL,
  abw_g           DECIMAL(8,3),
  population      INT,
  biomass_kg      DECIMAL(12,3),
  cumulative_feed_kg DECIMAL(12,3),
  fcr             DECIMAL(6,3),
  total_feed_cost DECIMAL(14,2),
  is_harvest_day  BOOLEAN DEFAULT FALSE,
  harvest_type    VARCHAR(20),   -- 'partial', 'final'
  harvest_kg      DECIMAL(12,3),
  harvest_revenue DECIMAL(14,2)
);
```

---

## 3. Farm & Cycle Management

### 3.1 Create Pond

#### Required Fields
| Field | Type | Validation |
|---|---|---|
| `name` | String | 1–100 chars, unique per farm |
| `shape` | Enum | `square` or `circle` |
| `depth` | Float | > 0, max 10m |
| `length` | Float | Required if shape = `square`; > 0 |
| `width` | Float | Required if shape = `square`; > 0 |
| `diameter` | Float | Required if shape = `circle`; > 0 |

#### Area Calculation Logic
```
IF shape == 'square':
  area_m2 = length * width
IF shape == 'circle':
  area_m2 = π * (diameter / 2)²
```

Area must be stored as a computed field and recalculated any time dimensions change.

#### UI Requirements
- Shape selector toggles input fields: show Length + Width for square, Diameter for circle.
- Live area preview updates as user types dimensions.
- Area displayed with two decimal places and unit label (m²).
- Validation fires on blur, not on every keystroke.

---

### 3.2 Create Cycle

#### Required Fields
| Field | Type | Notes |
|---|---|---|
| `stocking_date` | Date | Cannot be in the future |
| `total_seed` | Int | > 0 |
| `initial_age_days` | Int | ≥ 0 (PL age at stocking, e.g., PL12 = 12) |
| `species` | String | Default: `Penaeus Vannamei` |

#### Optional but Recommended Fields
| Field | Type | Notes |
|---|---|---|
| `hatchery` | String | Free text |
| `broodstock` | String | Free text or catalog |
| `feed_price_per_kg` | Decimal | Used by calculators |
| `carrying_capacity_kg` | Decimal | Used for simulation cap |
| `target_size_g` | Decimal | Used in harvest simulation |
| `target_survival_rate` | Decimal | 0–100% |

#### Business Rules
- Only one `active` cycle is allowed per pond at a time. If an active cycle exists, user must complete or abort it before starting a new one.
- `day_of_culture` (DOC) is always computed as: `(current_date - stocking_date) + initial_age_days`.
- When cycle status is set to `completed`, `end_date` must be recorded.
- Completing a cycle changes pond status back to `idle`.

---

### 3.3 Pond Dashboard (Per-Cycle View)

The main screen for an active pond/cycle should surface:

- Current DOC
- Latest MBW from most recent sampling log
- Latest water quality reading (summary row of key parameters)
- Total feed used (sum of all `total_feed_kg` in `feed_logs` for cycle)
- Estimated biomass (using latest MBW × estimated population)
- Estimated population: `total_seed × (current_SR / 100)` — SR from cultivation performance calculator
- Running FCR
- Alerts for any out-of-range water quality readings (last 24h)

---

## 4. Water Quality Recording

### 4.1 Parameter Normal Ranges & Validation

| Parameter | Unit | Warning Low | Warning High | Critical Low | Critical High |
|---|---|---|---|---|---|
| pH | — | 7.5 | 8.5 | 7.0 | 9.0 |
| Salinity | ppt | 5 | 30 | 0 | 45 |
| Temperature | °C | 23 | 31 | 15 | 35 |
| DO | mg/L | 4.0 | — | 3.0 | 15.0 |
| Transparency | cm | 25 | 50 | 10 | 80 |
| ORP | mV | 200 | 400 | 100 | 450 |
| Turbidity | NTU | — | 100 | — | 200 |
| Water Height | cm | — | — | 20 | — |

#### Validation Behavior
- **Warning:** Yellow highlight + icon. User can still save. Warning message is displayed inline.
- **Critical:** Red highlight + icon. User is prompted with a modal to confirm save. Saved record is flagged with `is_critical = TRUE`.
- All out-of-range records should be surfaced in the dashboard alert feed.

### 4.2 UI Requirements
- Input can be recorded multiple times per day (morning/afternoon/evening sessions).
- Show trend sparklines for each parameter on the parameter detail view (last 7 days).
- Provide a comparison view: today vs. yesterday vs. 7-day average.
- `water_color` field: use a predefined color picker with labels (Green, Brown, Gray, Black, Clear, Yellow, etc.) plus a free text field.
- `weather` field: icon-based selector (Sunny, Cloudy, Rainy, Overcast).

### 4.3 Data Export
- Allow exporting water quality logs as CSV or PDF table, filtered by date range.

---

## 5. Feed & Feeding Tray Management

### 5.1 Daily Feed Log

#### Fields Per Meal
- Amount (kg) — decimal, ≥ 0
- Time — time picker
- Up to 4 meals per day

#### Feed Product Selection
- Searchable dropdown linked to `feed_products` table.
- Allow "add new product" inline.
- Auto-fill protein % and price from product record.

#### Fasting Day
- Toggle: when enabled, all meal amount fields are disabled and set to 0.
- Still creates a `feed_log` record with `is_fasting_day = TRUE`.

#### Total Feed Calculation
```
total_feed_kg = SUM(meal_1 + meal_2 + meal_3 + meal_4)
```

### 5.2 Feeding Tray Monitoring

Each pond may have up to **4 feeding trays**. After each feeding:
- User selects tray status for each tray: `Empty`, `Few Left`, `A Lot Left`.
- Status is stored in `feeding_tray_logs` linked to the `feed_log` for that meal/day.
- Dashboard shows last-recorded tray status with timestamp.

#### Tray Status Business Rules
- If tray is consistently `A Lot Left` for 2+ consecutive days → trigger feed reduction suggestion notification.
- If tray is consistently `Empty` for 3+ consecutive days → trigger feed increase suggestion notification.

### 5.3 Cumulative Feed Tracking

At any point in the cycle:
```
cumulative_feed_kg = SUM(total_feed_kg) for all non-fasting feed_logs in cycle
```

Used by the cultivation performance calculator for FCR.

---

## 6. Sampling

### 6.1 Sampling Log Entry

| Field | Type | Validation |
|---|---|---|
| `sample_date` | Date | ≤ today, ≥ stocking_date |
| `mbw_grams` | Decimal | > 0, max 200g |
| `sample_count` | Int | > 0, recommended ≥ 30 |
| `photos` | Array | Optional, max 5 images per log |

### 6.2 Auto-Calculated Fields
```
day_of_culture = (sample_date - stocking_date) + initial_age_days
```

### 6.3 Growth Curve
- Plot MBW vs DOC for all sampling records within a cycle.
- Overlay: standard growth curve for `Penaeus Vannamei` (seeded reference data or configurable by admin).
- Show ADG (Average Daily Gain): `ADG = (current_MBW - previous_MBW) / days_between_samples`

### 6.4 Photo Handling
- Device camera and gallery access required.
- Max image size per photo: 5MB (compress client-side before upload).
- Stored in cloud storage, URL saved to `photos[]` array.
- Thumbnails displayed in log list; tap to view full-screen.

---

## 7. Treatments

### 7.1 Treatment Log Fields

| Field | Type | Notes |
|---|---|---|
| `treatment_date` | Date | Required |
| `type` | Enum | chemical, biological, physical, other |
| `product_name` | String | Free text or from product catalog |
| `dosage` | String | Numeric value |
| `dosage_unit` | String | ppm, g/m³, L/ha, etc. |
| `target_issue` | String | What problem this addresses |
| `written_notes` | Text | Free-form treatment journal |
| `photos` | Array | Optional supporting photos |

### 7.2 Product Catalog Integration
- Allow saving frequently used treatment products to a user catalog.
- Auto-fill dosage suggestions when a known product is selected.

### 7.3 Treatment History View
- Timeline view grouped by date.
- Filter by treatment type.
- Summary count: total treatments in current cycle.

---

## 8. Harvest & Mortality

### 8.1 Harvest Log

#### Required Fields
| Field | Type | Validation |
|---|---|---|
| `harvest_date` | Date | ≥ stocking_date |
| `weight_kg` | Decimal | > 0 |
| `harvest_type` | Enum | `partial` or `final` |

#### Optional Fields
| Field | Type | Notes |
|---|---|---|
| `count` | Int | Number of shrimp harvested |
| `price_per_kg` | Decimal | Local market price |
| `buyer_name` | String | Name of buyer |
| `buyer_contact` | String | Phone/contact info |

#### Computed Fields
```
total_revenue = weight_kg * price_per_kg
average_size_g = (weight_kg / count) * 1000   -- only if count provided
```

#### Final Harvest Business Rule
- Selecting `harvest_type = final` triggers cycle completion workflow.
- User must confirm: "Ending this cycle. This action cannot be undone."
- On confirmation: `cycles.status = 'completed'`, `cycles.end_date = harvest_date`, `ponds.status = 'idle'`.

### 8.2 Mortality Log

#### Required Fields
| Field | Type | Validation |
|---|---|---|
| `mortality_date` | Date | ≥ stocking_date |
| `estimated_count` | Int | > 0 |

#### Multiplier Logic
The multiplier allows extrapolation from tray sampling:
```
If user counts 50 dead shrimp in one corner of a pond that has 10 equal sections:
  multiplier = 10
  estimated_total = 50 * 10 = 500
```

#### Running Mortality Tracking
```
cumulative_mortality = SUM(estimated_total) for all mortality_logs in cycle
cumulative_mortality_pct = (cumulative_mortality / total_seed) * 100
```

Alert if `cumulative_mortality_pct` exceeds 20% → send notification to user.

---

## 9. Chemical, Plankton & Microbiology Logging

### 9.1 Chemical Log — Normal Ranges

| Parameter | Unit | Safe Low | Safe High |
|---|---|---|---|
| Ammonia (TAN) | mg/L | 0 | 0.5 |
| Nitrite | mg/L | 0 | 0.5 |
| Nitrate | mg/L | 0 | 50 |
| Alkalinity | mg/L CaCO₃ | 100 | 200 |
| Calcium | mg/L | 200 | 500 |
| Magnesium | mg/L | 1200 | 1800 |
| Phosphate | mg/L | 0 | 1.0 |
| H₂S | mg/L | 0 | 0.01 |

### 9.2 Plankton Log

- All count fields are optional (user may not have equipment to measure all types).
- `total_count` auto-computed as sum of all non-null plankton fields.
- Dominant plankton type auto-identified (field with highest count).
- Show a pie chart of plankton composition on the log detail view.

#### Plankton Ratio Alerts
- If Cyanobacteria > 30% of total → warn: "Potential cyanobacterial bloom risk."
- If Protozoa > 20% of total → warn: "High protozoan count — monitor shrimp feeding behavior."

### 9.3 Microbiology Log

#### Vibrio Risk Thresholds
| Metric | Warning | Critical |
|---|---|---|
| Total Vibrio (CFU/mL) | > 100 | > 1,000 |
| Vibrio ratio to total bacteria | > 10% | > 30% |
| *V. parahaemolyticus* | > 10 | > 100 |

```
vibrio_ratio_pct = (vibrio_total / total_bacteria_cfu) * 100
```

---

## 10. Disease Logging

### 10.1 Log Entry

- `observed_date`: required.
- `disease_id`: optional FK to encyclopedia. If linked, auto-populates disease name.
- Free-text `symptoms` field for custom observations.
- Severity selector: Mild / Moderate / Severe.
- `affected_count`: estimated number of shrimp showing signs.
- Up to 5 photos.

### 10.2 Disease Alert Feed
- Any disease log entry triggers a high-priority dashboard notification.
- Disease history shown as timeline within cycle.
- Link to related encyclopedia entry from the log view.

---

## 11. Disease Encyclopedia

### 11.1 Seeded Disease Records

The following diseases must be pre-loaded at DB initialization:

| Code | Common Name | Full Name |
|---|---|---|
| `AHPND` | EMS | Acute Hepatopancreatic Necrosis Disease |
| `BG` | Black Gill | Black Gill Disease |
| `WFD` | White Feces Disease | White Feces Disease |
| `WSSV` | White Spot | White Spot Syndrome Virus |
| `EHP` | EHP | Enterocytozoon hepatopenaei |
| `NHP` | NHP | Necrotizing Hepatopancreatitis |
| `TSV` | Taura Syndrome | Taura Syndrome Virus |
| `IMNV` | IMNV | Infectious Myonecrosis Virus |

### 11.2 UI Requirements
- Searchable list with full-text search across `common_name`, `full_name`, `description`, `signs_symptoms`.
- Filter by affected organ system.
- Each disease detail page shows:
  - Description, causative agent
  - Signs & symptoms (with bullet list)
  - Affected organs (body diagram if possible)
  - Transmission routes
  - Prevention guidelines
  - Treatment/management notes
  - Reference photo carousel (zoomable)
  - External links (open in in-app browser)
- Offline access: encyclopedia data should be bundled or cached locally.

---

## 12. Farm Calculators

### 12.1 Cultivation Performance Calculator

**Purpose:** Calculate Biomass, Population, FCR, and Survival Rate using logged data.

#### Inputs (from cycle logs or manually entered)
| Input | Source |
|---|---|
| Total Seed | `cycles.total_seed` |
| Total Feed Used (kg) | Sum of `feed_logs.total_feed_kg` |
| Current MBW (g) | Latest `sampling_logs.mbw_grams` |
| Total Mortality | Sum of `mortality_logs.estimated_total` |
| Total Harvested (kg) | Sum of `harvest_logs.weight_kg` |

#### Formulas
```
Estimated Population = total_seed - cumulative_mortality - total_harvested_count
Survival Rate (SR %) = (Estimated Population / total_seed) * 100

Biomass (kg) = (Estimated Population * MBW_g) / 1000

FCR = Total Feed Used (kg) / Total Biomass Produced (kg)
  where Total Biomass Produced = current_biomass + total_harvested_kg
```

#### Output Display
- Each metric shown in its own card with current value, trend indicator (↑ ↓), and target value (from cycle settings).
- Color-coded: green (on target), yellow (warning), red (off target).

---

### 12.2 Daily Feed Calculator

**Purpose:** Calculate recommended daily feed amount.

#### Inputs
| Input | Type |
|---|---|
| Initial Stocking (count) | Int |
| Average Body Weight ABW (g) | Decimal |
| Feeding Rate FR (%) | Decimal |
| Survival Rate SR (%) | Decimal |

#### Formula
```
Estimated Population = Initial_Stocking * (SR / 100)
Estimated Biomass (kg) = (Estimated Population * ABW) / 1000
Daily Feed (kg) = Estimated Biomass * (FR / 100)
```

**Feeding Rate Reference Table** (pre-loaded, editable by user):

| ABW Range (g) | Suggested FR (%) |
|---|---|
| 0 – 1 | 10 – 15 |
| 1 – 3 | 7 – 10 |
| 3 – 7 | 5 – 8 |
| 7 – 12 | 4 – 6 |
| 12 – 20 | 3 – 5 |
| 20+ | 2 – 4 |

---

### 12.3 Product Amount Calculator

**Purpose:** Calculate exact product dosage for pond treatment.

#### Inputs
| Input | Type |
|---|---|
| Pond Area (m²) | Decimal — auto-filled from pond |
| Water Height / Level (m) | Decimal |
| Target Concentration (ppm) | Decimal |
| Product Density (g/mL) | Decimal (default 1.0 for water-based) |

#### Formula
```
Water Volume (m³) = Pond Area (m²) * Water Height (m)
Water Volume (L) = Water Volume (m³) * 1000

Product Amount (g) = Target_ppm * Water_Volume_L / 1000
Product Amount (mL) = Product_Amount_g / Product_Density
```

#### Notes
- For granular products: result shown in grams and kg.
- For liquid products: result shown in mL and L.
- Unit toggle between metric and local units.

---

### 12.4 Free Ammonia Calculator

**Purpose:** Calculate toxic unionized ammonia (NH₃) concentration.

#### Inputs
| Input | Type |
|---|---|
| Temperature (°C) | Decimal |
| pH | Decimal |
| Total Ammonia Nitrogen (TAN mg/L) | Decimal |

#### Formula
The fraction of un-ionized ammonia (α) is calculated using the Henderson–Hasselbalch equation:

```
pKa = 0.09018 + (2729.92 / (273.2 + Temperature_C))
α = 1 / (1 + 10^(pKa - pH))
NH3 (mg/L) = TAN * α
```

#### Output
- NH₃ in mg/L displayed prominently.
- Risk classification:
  - < 0.1 mg/L: Safe (Green)
  - 0.1 – 0.3 mg/L: Caution (Yellow) — monitor closely
  - 0.3 – 0.5 mg/L: Warning (Orange) — take corrective action
  - > 0.5 mg/L: Critical (Red) — immediate action required

---

## 13. Simulation Tools

### 13.1 Cultivation & Harvest Simulation

#### Inputs
| Input | Required | Default |
|---|---|---|
| Farm Area (m²) | Yes | — |
| Stocking Density (PL/m²) | Yes | — |
| Target Survival Rate (%) | Yes | 80% |
| Feed Price (per kg) | Yes | — |
| Market Price per kg of Shrimp | Yes | — |
| Target Size (g) | No | 20g |
| Initial FCR | No | 1.0 |
| Growth Rate Model | No | Standard Vannamei curve |

#### Partial Harvest Settings
Users can add multiple partial harvest rules:
```
[
  { age_days: 60, percentage: 30 },   -- harvest 30% of population at DOC 60
  { age_days: 90, percentage: 40 }    -- harvest 40% of remaining at DOC 90
]
```
Rules validated: sum of all percentages ≤ 100%.

#### Growth Model

Use a standard Vannamei growth table (DOC → ABW) or a configurable logistic growth model:
```
ABW(t) = ABW_max / (1 + exp(-k * (t - t_mid)))
```

Where:
- `ABW_max` = target harvest size
- `k` = growth rate constant (default derived from species)
- `t_mid` = inflection point (day at half max weight)

For simplicity, a piecewise linear approximation using the seeded growth table is acceptable.

### 13.2 Simulation Projections — Output Tables

#### Feed Table (Weekly rows)
| DOC | ABW (g) | Daily Feed (kg) | Weekly Feed (kg) | Cumulative Feed (kg) | FCR | Total Feed Cost |
|---|---|---|---|---|---|---|

#### Biomass Table (Weekly rows)
| DOC | ABW (g) | Estimated Population | Biomass (kg) | SR (%) |
|---|---|---|---|---|

#### Harvest Table
| Harvest # | Type | Date / DOC | Estimated Count | Weight (kg) | Price/kg | Revenue |
|---|---|---|---|---|---|---|

#### Summary Card
```
Total Feed Cost = cumulative_feed_kg * feed_price_per_kg
Total Revenue = SUM of all harvest revenues
Gross Profit = Total Revenue - Total Feed Cost - (seed_cost if provided)
ROI % = (Gross Profit / Total Cost) * 100
Break-even Price = Total Feed Cost / Total Harvest Weight
```

### 13.3 Simulation Persistence
- Simulations can be saved and named.
- Saved simulations are retrievable from a history list.
- User can duplicate a saved simulation and modify parameters to compare scenarios.

---

## 14. Notifications & Validation Warnings

### 14.1 In-App Notification Types

| Trigger | Level | Message |
|---|---|---|
| Water quality out of range | Warning/Critical | "pH reading 9.2 is above safe range (7.5–8.5)" |
| Cumulative mortality > 20% | Critical | "Mortality exceeded 20% of initial stock" |
| Vibrio critical threshold | Critical | "Total Vibrio count critical: [value] CFU/mL" |
| Disease logged | High | "Disease logged: [name] — Review recommended" |
| Tray consistently Full (3d) | Info | "Feeding trays consistently full — consider reducing feed" |
| Tray consistently Empty (3d) | Info | "Feeding trays consistently empty — consider increasing feed" |
| Alkalinity out of range | Warning | "Alkalinity [value] mg/L — Optimal: 100–200 mg/L" |

### 14.2 Notification Storage
```sql
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  cycle_id    UUID REFERENCES cycles(id),
  type        VARCHAR(30),
  level       VARCHAR(10),   -- 'info', 'warning', 'critical'
  title       VARCHAR(150),
  body        TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 14.3 Push Notifications
- Use Firebase Cloud Messaging (FCM) for mobile push.
- Store FCM device token per user session.
- Critical-level notifications always trigger push; info/warning configurable in user settings.

---

## 15. Media & File Handling

### 15.1 Image Upload Flow
1. User selects image from camera or gallery.
2. Client-side compression: resize to max 1920×1920px, quality 80%.
3. Upload to cloud storage (S3/Supabase) via presigned URL or direct upload API.
4. On success, store returned URL in the respective log's `photos[]` field.
5. Display upload progress indicator.

### 15.2 Storage Structure
```
/{user_id}/
  cycles/{cycle_id}/
    sampling/{sampling_log_id}/{filename}.jpg
    mortality/{mortality_log_id}/{filename}.jpg
    treatments/{treatment_log_id}/{filename}.jpg
    diseases/{disease_log_id}/{filename}.jpg
  encyclopedia/
    diseases/{disease_code}/{filename}.jpg
```

### 15.3 Offline Handling
- If upload fails (no network): queue image upload locally using a job queue.
- Log record is saved locally with a placeholder status (`upload_pending`).
- Retry upload when connectivity resumes.
- Show upload status badge on relevant log entries.

---

## 16. Authentication & Multi-Tenancy

### 16.1 Auth Flow
- Register with email + password.
- Email verification required before first login.
- JWT access token (15-min expiry) + refresh token (30-day expiry, stored in secure storage).
- Refresh token rotation on every use.
- On logout: invalidate refresh token server-side.

### 16.2 Roles & Permissions

| Role | Permissions |
|---|---|
| `farmer` (owner) | Full CRUD on own farms/ponds/cycles/logs |
| `viewer` | Read-only access to shared farm data |
| `admin` | System-wide access (for Anthropic/app admin use) |

### 16.3 Farm Sharing (Future Feature)
- Farm owner can invite viewers by email.
- Viewer can see all data but cannot create/edit/delete logs.
- `farm_members` table:

```sql
CREATE TABLE farm_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id     UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(20) DEFAULT 'viewer',
  invited_at  TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(farm_id, user_id)
);
```

---

## 17. API Endpoint Reference

### 17.1 Auth
```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
POST   /auth/forgot-password
POST   /auth/reset-password
```

### 17.2 Farms & Ponds
```
GET    /farms                      -- list user's farms
POST   /farms                      -- create farm
GET    /farms/:id                  -- get farm detail
PUT    /farms/:id
DELETE /farms/:id

GET    /farms/:farmId/ponds
POST   /farms/:farmId/ponds
GET    /ponds/:id
PUT    /ponds/:id
DELETE /ponds/:id
```

### 17.3 Cycles
```
GET    /ponds/:pondId/cycles
POST   /ponds/:pondId/cycles
GET    /cycles/:id
PUT    /cycles/:id
POST   /cycles/:id/complete        -- end cycle
POST   /cycles/:id/abort
```

### 17.4 Logs (all scoped under /cycles/:cycleId/)
```
-- Water Quality
GET    /cycles/:id/water-quality
POST   /cycles/:id/water-quality
GET    /water-quality/:logId
PUT    /water-quality/:logId
DELETE /water-quality/:logId

-- Feed
GET    /cycles/:id/feed-logs
POST   /cycles/:id/feed-logs
GET    /feed-logs/:logId
PUT    /feed-logs/:logId

-- Feeding Trays
POST   /feed-logs/:logId/tray-logs
GET    /feed-logs/:logId/tray-logs

-- Sampling
GET    /cycles/:id/sampling
POST   /cycles/:id/sampling
PUT    /sampling/:logId
DELETE /sampling/:logId

-- Treatments
GET    /cycles/:id/treatments
POST   /cycles/:id/treatments
PUT    /treatments/:logId

-- Harvests
GET    /cycles/:id/harvests
POST   /cycles/:id/harvests
PUT    /harvests/:logId

-- Mortality
GET    /cycles/:id/mortality
POST   /cycles/:id/mortality
PUT    /mortality/:logId

-- Chemical
GET    /cycles/:id/chemical
POST   /cycles/:id/chemical

-- Plankton
GET    /cycles/:id/plankton
POST   /cycles/:id/plankton

-- Microbiology
GET    /cycles/:id/microbiology
POST   /cycles/:id/microbiology

-- Disease Logs
GET    /cycles/:id/disease-logs
POST   /cycles/:id/disease-logs
```

### 17.5 Disease Encyclopedia
```
GET    /diseases                   -- list all, supports ?search= query param
GET    /diseases/:id
```

### 17.6 Calculators (stateless POST endpoints)
```
POST   /calculators/cultivation-performance
POST   /calculators/daily-feed
POST   /calculators/product-amount
POST   /calculators/free-ammonia
```

### 17.7 Simulations
```
GET    /simulations
POST   /simulations
GET    /simulations/:id
PUT    /simulations/:id
DELETE /simulations/:id
POST   /simulations/:id/run       -- generate result rows
GET    /simulations/:id/results
```

### 17.8 Media
```
POST   /media/presigned-url        -- get presigned S3 URL for direct upload
DELETE /media                      -- delete a file by URL
```

---

## 18. Business Logic Rules Summary

| Rule | Where Enforced |
|---|---|
| One active cycle per pond | `POST /cycles` — check for existing active cycle |
| Pond area auto-calculated on create/update | Backend (and mirrored in client) |
| DOC always computed, never stored (except for reporting) | Computed field in queries |
| Fasting day sets all feed amounts to 0 | Frontend + backend validation |
| Final harvest triggers cycle completion | `POST /harvests` when type = final |
| Mortality multiplier computes estimated_total | Backend compute on create |
| FCR requires at least one sampling and feed log | Calculator endpoint returns error if insufficient data |
| Free ammonia uses temperature-adjusted pKa | Calculator endpoint |
| Simulation percentage sum ≤ 100% | Validated on simulation save |
| pH, DO, TAN critical values trigger notification | Background job after log write |

---

## 19. Testing Requirements

### 19.1 Unit Tests
- All calculator formulas (area, FCR, SR, biomass, feed amount, product dosage, free ammonia, simulation projections).
- Validation range checks for all water quality parameters.
- Cycle DOC computation.
- Mortality multiplier math.
- Harvest revenue computation.

### 19.2 Integration Tests
- Full cycle lifecycle: create pond → create cycle → log data → harvest (partial + final) → cycle completed.
- Out-of-range water quality log creates notification record.
- Attempting second active cycle on occupied pond returns 409.
- Disease log with linked encyclopedia entry correctly populates disease name.

### 19.3 E2E Tests (Mobile)
- Pond creation with shape toggle (square vs. circle), verify area calculation.
- Water quality form submission with warning validation.
- Photo upload from camera and gallery in sampling log.
- Run simulation with partial harvest and verify output tables are generated.

### 19.4 Performance Tests
- Simulation result generation for 200 DOC cycle should return in < 500ms.
- Water quality log list with 365 records should render in < 1s (paginate at 30 per page).

---

## 20. Implementation Milestones

### Phase 1 — Core Foundation (Weeks 1–4)
- [ ] Database schema creation and migrations
- [ ] Auth system (register, login, JWT, refresh)
- [ ] Farm + Pond CRUD with area calculation
- [ ] Cycle create/complete/abort with DOC computation
- [ ] Basic pond dashboard (DOC, status display)

### Phase 2 — Daily Logging (Weeks 5–8)
- [ ] Water quality log with validation warnings
- [ ] Feed log with fasting day support
- [ ] Feeding tray status tracking
- [ ] Sampling log with photo upload
- [ ] Treatment log
- [ ] Mortality log with multiplier

### Phase 3 — Advanced Logging (Weeks 9–11)
- [ ] Chemical parameter log with thresholds
- [ ] Plankton log with composition chart
- [ ] Microbiology log with Vibrio alerts
- [ ] Disease log linked to encyclopedia
- [ ] Harvest log (partial + final with cycle completion)

### Phase 4 — Calculators (Weeks 12–13)
- [ ] Cultivation Performance Calculator
- [ ] Daily Feed Calculator with FR reference table
- [ ] Product Amount Calculator
- [ ] Free Ammonia Calculator

### Phase 5 — Simulation & Encyclopedia (Weeks 14–16)
- [ ] Disease encyclopedia seeded data + search UI
- [ ] Simulation engine with partial harvest rules
- [ ] Feed, Biomass, and Harvest projection tables
- [ ] Simulation save/load/duplicate

### Phase 6 — Notifications & Polish (Weeks 17–18)
- [ ] In-app notification system
- [ ] Push notification integration (FCM)
- [ ] Offline queue for pending uploads
- [ ] CSV/PDF export for water quality and feed logs
- [ ] Performance optimization and testing

### Phase 7 — QA & Launch (Weeks 19–20)
- [ ] Full test suite execution
- [ ] Beta testing with 3–5 real farmers
- [ ] Bug fixes and UX refinement
- [ ] App Store / Play Store submission

---

*End of Specification Document*
*Version 1.0 — Generated for Shrimp Aquaculture Management App*