# Shrimp Aquaculture App — Frontend Development Specification

> **Scope:** Complete frontend specification for the Shrimp Aquaculture Management mobile app. Covers tech stack, navigation architecture, every screen and component, UI states, form field specs, validation UX, chart requirements, and design system.

---

## Table of Contents

1. [Tech Stack & Project Setup](#1-tech-stack--project-setup)
2. [Design System](#2-design-system)
3. [Navigation Architecture](#3-navigation-architecture)
4. [Authentication Screens](#4-authentication-screens)
5. [Farm & Pond Management Screens](#5-farm--pond-management-screens)
6. [Cycle Management Screens](#6-cycle-management-screens)
7. [Pond Dashboard](#7-pond-dashboard)
8. [Water Quality Screens](#8-water-quality-screens)
9. [Feed & Feeding Tray Screens](#9-feed--feeding-tray-screens)
10. [Sampling Screens](#10-sampling-screens)
11. [Treatment Screens](#11-treatment-screens)
12. [Harvest & Mortality Screens](#12-harvest--mortality-screens)
13. [Chemical, Plankton & Microbiology Screens](#13-chemical-plankton--microbiology-screens)
14. [Disease Log Screens](#14-disease-log-screens)
15. [Disease Encyclopedia Screens](#15-disease-encyclopedia-screens)
16. [Farm Calculators Screens](#16-farm-calculators-screens)
17. [Simulation Tool Screens](#17-simulation-tool-screens)
18. [Notifications Screen](#18-notifications-screen)
19. [Settings & Profile Screens](#19-settings--profile-screens)
20. [Shared / Reusable Components](#20-shared--reusable-components)
21. [Form Validation UX Patterns](#21-form-validation-ux-patterns)
22. [Offline & Sync UX](#22-offline--sync-ux)
23. [Charts & Data Visualization](#23-charts--data-visualization)
24. [Media Handling UX](#24-media-handling-ux)
25. [Accessibility Requirements](#25-accessibility-requirements)
26. [Performance Requirements](#26-performance-requirements)
27. [Localization & Internationalization](#27-localization--internationalization)

---

## 1. Tech Stack & Project Setup

### 1.1 Recommended Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | **React Native** (Expo SDK 50+) | Cross-platform iOS + Android |
| Language | **TypeScript** | Strict mode enabled |
| Navigation | **React Navigation v6** | Stack + Tab + Drawer |
| State Management | **Zustand** | Lightweight, no boilerplate |
| Server State | **TanStack Query v5** | Caching, refetch, offline |
| Forms | **React Hook Form** | With Zod schema validation |
| Schema Validation | **Zod** | Used for forms AND API response typing |
| UI Components | **React Native Paper** or custom | Themed, accessible base |
| Charts | **Victory Native XL** or **Gifted Charts** | Native SVG charts |
| Camera/Gallery | **expo-image-picker** | Camera + gallery |
| Local DB (offline) | **expo-sqlite** with **Drizzle ORM** | Offline-first data |
| Push Notifications | **expo-notifications** + FCM | Firebase Cloud Messaging |
| Storage | **expo-secure-store** | JWT token storage |
| Animations | **React Native Reanimated 3** | 60fps animations |
| Icons | **@expo/vector-icons** (MaterialCommunityIcons) | Comprehensive icon set |
| Date Handling | **date-fns** | Lightweight, tree-shakeable |
| HTTP Client | **axios** with interceptors | Auth token injection, error handling |

### 1.2 Folder Structure

```
src/
├── api/                    # Axios instances, endpoint functions
│   ├── auth.ts
│   ├── ponds.ts
│   ├── cycles.ts
│   ├── logs/
│   │   ├── waterQuality.ts
│   │   ├── feed.ts
│   │   ├── sampling.ts
│   │   └── ...
│   └── calculators.ts
├── components/             # Shared reusable components
│   ├── ui/                 # Low-level: Button, Input, Card, Badge
│   ├── forms/              # Form field wrappers
│   ├── charts/             # Chart wrappers
│   └── layout/             # Screen wrappers, headers
├── screens/                # One folder per feature
│   ├── auth/
│   ├── farms/
│   ├── ponds/
│   ├── cycles/
│   ├── logs/
│   │   ├── waterQuality/
│   │   ├── feed/
│   │   └── ...
│   ├── calculators/
│   ├── simulation/
│   ├── encyclopedia/
│   └── settings/
├── store/                  # Zustand stores
│   ├── authStore.ts
│   ├── activeCycleStore.ts
│   └── notificationStore.ts
├── hooks/                  # Custom React hooks
│   ├── useDoc.ts           # Day-of-culture calculator
│   ├── useRangeValidation.ts
│   └── ...
├── utils/
│   ├── calculators.ts      # Pure formula functions
│   ├── validators.ts       # Range check utilities
│   └── formatters.ts       # Number, date, unit formatters
├── constants/
│   ├── ranges.ts           # All parameter normal/critical ranges
│   ├── species.ts          # Shrimp species list + growth tables
│   └── diseases.ts         # Local encyclopedia fallback data
├── types/                  # Global TypeScript types
│   └── models.ts
└── navigation/
    ├── RootNavigator.tsx
    ├── AuthNavigator.tsx
    ├── MainTabNavigator.tsx
    └── PondStackNavigator.tsx
```

### 1.3 Environment Configuration

```
.env.development
  API_BASE_URL=http://localhost:3000/api
  STORAGE_BASE_URL=...

.env.production
  API_BASE_URL=https://api.yourapp.com/api
  STORAGE_BASE_URL=https://cdn.yourapp.com
```

Use `expo-constants` to access env vars at runtime.

---

## 2. Design System

### 2.1 Color Palette

```ts
// theme/colors.ts
export const colors = {
  // Brand
  primary:        '#00897B',   // Teal — evokes water/nature
  primaryLight:   '#4DB6AC',
  primaryDark:    '#00695C',

  // Semantic
  success:        '#43A047',
  warning:        '#FB8C00',
  error:          '#E53935',
  info:           '#1E88E5',

  // Surface
  background:     '#F4F6F8',
  surface:        '#FFFFFF',
  surfaceVariant: '#ECEFF1',
  border:         '#CFD8DC',
  divider:        '#ECEFF1',

  // Text
  textPrimary:    '#1A2327',
  textSecondary:  '#607D8B',
  textDisabled:   '#B0BEC5',
  textInverse:    '#FFFFFF',

  // Status chips
  chipActive:     '#E8F5E9',
  chipActiveText: '#2E7D32',
  chipIdle:       '#ECEFF1',
  chipIdleText:   '#455A64',
  chipWarning:    '#FFF3E0',
  chipWarningText:'#E65100',
  chipCritical:   '#FFEBEE',
  chipCriticalText:'#B71C1C',
};
```

### 2.2 Typography

```ts
// theme/typography.ts
export const typography = {
  // Display
  h1: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '600' },
  h4: { fontSize: 16, fontWeight: '600' },

  // Body
  bodyLarge:  { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyMedium: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  bodySmall:  { fontSize: 12, fontWeight: '400', lineHeight: 16 },

  // Labels
  labelLarge:  { fontSize: 14, fontWeight: '600' },
  labelMedium: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  labelSmall:  { fontSize: 11, fontWeight: '500', letterSpacing: 0.5 },

  // Special
  numericLarge: { fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'] },
  numericMedium:{ fontSize: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
  caption:      { fontSize: 11, fontWeight: '400', color: '#607D8B' },
};
```

Recommended font: **Nunito** (body) + **Nunito Sans** (data/numbers). Load via `expo-font`.

### 2.3 Spacing Scale

```ts
export const spacing = {
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
};
```

### 2.4 Border Radius

```ts
export const radius = {
  sm:   6,
  md:   12,
  lg:   16,
  xl:   24,
  full: 999,
};
```

### 2.5 Elevation / Shadows

```ts
// Use react-native-shadow-2 or platform shadow props
export const shadows = {
  sm: { elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4 },
  md: { elevation: 4, shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8 },
  lg: { elevation: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16 },
};
```

### 2.6 Status Color Map

Used across parameter badges, cards, and alerts:

| Status | Background | Text | Border |
|---|---|---|---|
| Safe / Normal | `#E8F5E9` | `#2E7D32` | `#A5D6A7` |
| Warning | `#FFF3E0` | `#E65100` | `#FFCC80` |
| Critical | `#FFEBEE` | `#B71C1C` | `#EF9A9A` |
| Neutral / Info | `#E3F2FD` | `#1565C0` | `#90CAF9` |

---

## 3. Navigation Architecture

```
RootNavigator
├── AuthNavigator (Stack)          — shown when not logged in
│   ├── LoginScreen
│   ├── RegisterScreen
│   └── ForgotPasswordScreen
│
└── MainNavigator (Drawer + Tab)   — shown when logged in
    ├── HomeTab (Bottom Tab)
    │   ├── FarmsListScreen
    │   └── FarmDetailScreen
    │       └── PondListScreen
    │           └── PondStackNavigator (Stack)
    │               ├── PondDetailScreen (Dashboard)
    │               ├── CycleCreateScreen
    │               ├── CycleDetailScreen
    │               ├── LogEntrySelectionScreen    ← "Log Today's Data" hub
    │               ├── WaterQualityLogScreen
    │               ├── FeedLogScreen
    │               ├── SamplingLogScreen
    │               ├── TreatmentLogScreen
    │               ├── HarvestLogScreen
    │               ├── MortalityLogScreen
    │               ├── ChemicalLogScreen
    │               ├── PlanktonLogScreen
    │               ├── MicrobiologyLogScreen
    │               └── DiseaseLogScreen
    │
    ├── EncyclopediaTab (Bottom Tab)
    │   ├── DiseaseListScreen
    │   └── DiseaseDetailScreen
    │
    ├── CalculatorsTab (Bottom Tab)
    │   ├── CalculatorHubScreen
    │   ├── CultivationPerformanceScreen
    │   ├── DailyFeedCalculatorScreen
    │   ├── ProductAmountCalculatorScreen
    │   └── FreeAmmoniaCalculatorScreen
    │
    ├── SimulationTab (Bottom Tab)
    │   ├── SimulationListScreen
    │   ├── SimulationCreateScreen
    │   └── SimulationResultsScreen
    │
    └── Drawer Items
        ├── Profile/Settings
        ├── Notifications
        └── About / Help
```

### 3.1 Bottom Tab Bar Config

| Tab | Icon | Label |
|---|---|---|
| Home (Farms) | `home-outline` | Farms |
| Encyclopedia | `book-open-outline` | Diseases |
| Calculators | `calculator-variant-outline` | Calculators |
| Simulation | `chart-timeline-variant` | Simulate |

Tab bar shows a red badge dot on "Farms" tab when unread critical notifications exist.

---

## 4. Authentication Screens

### 4.1 Login Screen

**Layout:** Centered card on teal gradient background.

**Fields:**
- Email — keyboard type `email-address`, auto-capitalize `none`
- Password — secure text entry, show/hide toggle

**Buttons:**
- `Sign In` (primary, full width)
- `Forgot Password?` (text link, below button)
- `Create Account` (outlined, below)

**Validation:**
- Email: required, valid format
- Password: required, min 6 chars
- Error shown inline below each field on submit

**States:**
- Loading: button shows spinner, all fields disabled
- Error: API error shown in a red banner at top of form

---

### 4.2 Register Screen

**Fields:**
- Full Name — auto-capitalize `words`
- Email — keyboard type `email-address`
- Phone Number — keyboard type `phone-pad`, optional
- Password — secure, min 8 chars, show/hide
- Confirm Password — must match password

**Post-Register:** Navigate to email verification prompt screen (static info screen, no action needed from user).

---

### 4.3 Forgot Password Screen

- Email field
- `Send Reset Link` button
- On success: show success banner "Check your email"
- Back to Login link

---

## 5. Farm & Pond Management Screens

### 5.1 Farms List Screen

**Header:** "My Farms" + `+` icon button (top right) → Create Farm sheet

**Content:**
- FlatList of `FarmCard` components
- Each card shows: Farm name, location, number of ponds, number of active cycles
- Tap card → Farm Detail Screen
- Empty state: illustration + "No farms yet. Add your first farm."

---

### 5.2 Farm Detail Screen (Pond List)

**Header:** Farm name + edit icon

**Content:**
- Farm info summary row (location, total area)
- Section: Ponds
  - FlatList of `PondCard` components
  - Each card shows: pond name, shape badge, area (m²), status chip (Active/Idle), current DOC if active
  - `+ Add Pond` card at the end of the list
- FAB (Floating Action Button) → Add Pond bottom sheet

**PondCard Status Chips:**
- `Active` — green chip, shows DOC
- `Idle` — gray chip
- `Harvested` — blue chip

---

### 5.3 Create / Edit Pond Screen

**Form Layout (Scrollable):**

```
Section: Basic Info
  - Pond Name (TextInput)
  - Notes (multiline, optional)

Section: Dimensions
  - Shape (SegmentedControl: Square | Circle)
    IF Square:
      - Length (m) [numeric keypad]
      - Width (m) [numeric keypad]
    IF Circle:
      - Diameter (m) [numeric keypad]
  - Depth (m) [numeric keypad]

Section: Calculated (read-only display)
  - Area: [live preview, e.g. "120.00 m²"]
```

**Behavior:**
- Shape toggle immediately shows/hides the appropriate dimension fields.
- Area preview updates live as user types any dimension.
- Area field has a subtle gray background to indicate it's computed.

**Validation:**
- All dimension fields: required, > 0, max reasonable value (e.g., length ≤ 1000m)
- Name: required, unique within farm (checked on submit)

**Submit Button:** `Save Pond` — disabled until all required fields valid.

---

## 6. Cycle Management Screens

### 6.1 Create Cycle Screen

**Header:** "Start New Cycle — [Pond Name]"

**Form Sections:**

```
Section: Stocking Details (required)
  - Stocking Date (DatePicker)
  - Total Seed (count) [numeric]
  - Initial Age (PL age in days) [numeric, default 0]
  - Species (Picker, default "Penaeus Vannamei")
    Options: Penaeus Vannamei, Penaeus Monodon, Other (free text)

Section: Origin
  - Hatchery Name [text]
  - Broodstock Source [text]

Section: Economics
  - Feed Price per kg [decimal, currency input]
  - Seed Price per unit [decimal, optional]

Section: Targets
  - Carrying Capacity (kg) [decimal]
  - Target Size (g) [decimal]
  - Target Survival Rate (%) [decimal, 0–100]
  - Target FCR [decimal]
  - Target Duration (days) [integer]

Section: Water Volume
  - Initial Water Volume (m³) [decimal, auto-suggested = pond area × initial water height]
```

**Warning Banner:** If a completed cycle exists for this pond, show info: "Previous cycle ended on [date]. Starting fresh cycle."

**If active cycle exists:** Show error and block form with a message: "This pond has an active cycle. Complete or abort it first."

---

### 6.2 Cycle Detail / History Screen

Shows summary of a completed cycle:
- Date range (stocking → end)
- Final SR %, FCR, total feed used, total revenue
- Timeline of key events (sampling milestones, harvests, treatments, disease logs)
- Button to view individual log sections

---

## 7. Pond Dashboard

This is the primary daily-use screen. Accessed by tapping an active pond.

### 7.1 Layout Structure

```
[Header Bar]
  Pond Name  |  Status Chip (Active)  |  ⋮ menu

[Hero Card]
  DOC: Day 42          SR: 82%
  MBW: 8.4g            Biomass: ~124 kg
  Running FCR: 1.42    Population: ~14,760

[Quick Action Row] — horizontal scroll
  [+ Water Quality]  [+ Feed]  [+ Sample]  [+ Treatment]  [+ More]

[Alert Banner] — conditional, shows if any critical readings exist
  ⚠ 2 out-of-range readings today — Tap to review

[Section: Today's Overview]
  Water Quality Summary card (latest values, color-coded)
  Feed Summary card (total today, last feeding time, tray statuses)

[Section: Recent Activity] — last 5 events across all log types, timeline style

[Section: Cycle Progress]
  Progress bar: Day 42 of 120 (target)
  MBW Growth Sparkline (last 10 samples)
  Cumulative Feed chart (last 14 days, bar)

[Section: Quick Stats]
  Total Harvested | Total Mortality | Treatments Count | Disease Events
```

### 7.2 Hero Card Details

Each metric in the hero card has:
- Label (small, secondary color)
- Value (large, bold, tabular nums font)
- Trend indicator: ▲ / ▼ / — (compared to same metric yesterday)
- Color coding if applicable (e.g., SR in red if < target)

### 7.3 Quick Action Row

Icons with labels, horizontally scrollable:
- Water Quality → WaterQualityLogScreen (pre-filled with today's date)
- Feed → FeedLogScreen
- Sampling → SamplingLogScreen
- Treatment → TreatmentLogScreen
- Harvest → HarvestLogScreen
- Mortality → MortalityLogScreen
- Chemical → ChemicalLogScreen
- Plankton → PlanktonLogScreen
- Microbiology → MicrobiologyLogScreen
- Disease → DiseaseLogScreen

### 7.4 ⋮ Menu Options

- Edit Cycle Details
- View All Logs (by category)
- Complete Cycle
- Abort Cycle
- Export Cycle Report (CSV/PDF)

---

## 8. Water Quality Screens

### 8.1 Water Quality Log Screen (Entry Form)

**Header:** "Water Quality — [date]"

**Session Selector:** Morning / Afternoon / Evening (SegmentedControl at top)

**Form Sections:**

```
Section: Core Parameters
  - pH                [decimal, keyboard: numeric, range hint: 7.5–8.5]
  - Salinity (ppt)    [decimal]
  - Temperature (°C)  [decimal]
  - DO (mg/L)         [decimal]
  - Transparency (cm) [decimal]

Section: Extended Parameters
  - ORP (mV)          [decimal]
  - Water Height (cm) [decimal]
  - Turbidity (NTU)   [decimal]
  - Conductivity (mS/cm) [decimal]

Section: Observational
  - Water Color       [ColorPicker component — predefined swatches + labels]
  - Weather           [IconSelector: Sunny ☀️ / Cloudy ⛅ / Rainy 🌧️ / Overcast 🌥️]

Section: Notes
  - Notes             [multiline TextInput]
```

**Inline Validation:**
- Each field shows a colored status dot on the right: green (normal), yellow (warning), red (critical)
- Warning/critical triggers an inline banner below the field with message and optimal range
- Validation fires on blur (not while typing)

**Submit Button:** `Save Water Quality` — always enabled but shows a confirmation modal if any critical values are present.

---

### 8.2 Water Quality History Screen

**Filter Bar:**
- Date range picker
- Time of day filter (All / Morning / Afternoon / Evening)

**Content:**
- Toggle: **List View** | **Chart View**

**List View:**
- Each entry shows date, session, and a mini-grid of key values (pH, DO, Temp, Salinity) with color dots
- Tap → full detail view

**Chart View:**
- Parameter selector (tabs or dropdown)
- Line chart of selected parameter over time
- Reference band overlay showing normal range (light green fill between min/max)
- Data points colored by status (green/yellow/red)

---

### 8.3 Water Quality Detail View

Full display of all logged parameters for a single session, with:
- Status badge per parameter (Normal / Warning / Critical)
- Edit button (top right)
- Delete option (with confirmation)

---

## 9. Feed & Feeding Tray Screens

### 9.1 Feed Log Screen

**Header:** "Feed Log — [date]"

**Top Section: Fasting Toggle**
- Large toggle: "Fasting Day" — when ON, all meal inputs are hidden and a "🚫 Fasting Day" banner is shown. Form only saves fasting = true.

**Meal Entry (when not fasting):**

Repeatable meal cards (up to 4). Each meal card:
```
Meal [1 / 2 / 3 / 4]
  Amount (kg)    [decimal numeric input]
  Time           [TimePicker]
  [Remove meal]  [text button, hidden for meal 1]
```

`+ Add Meal` button (hidden when 4 meals exist).

**Feed Product Section:**
```
  Feed Product / Brand    [Searchable dropdown]
  Protein %               [auto-filled, editable]
```

**Total Feed (read-only computed):**
```
  Total Today: 12.40 kg   [auto-summed]
  Cumulative This Cycle: 845.20 kg
```

**Notes:** Multiline optional.

**Submit:** `Save Feed Log`

---

### 9.2 Feeding Tray Status Section

Shown below the meal entry form (or as a separate card on the dashboard).

**4 tray slots displayed as a 2×2 grid of cards:**

Each tray card:
- Tray number label
- 3-option selector (radio-style): 
  - 🟥 Empty
  - 🟨 Few Left
  - 🟩 A Lot Left
- Last updated timestamp

Visual style: the card background changes color based on selection (red tint / yellow tint / green tint).

**Tray History:** Small "View History" link that opens a modal showing tray status over the last 7 days as a heatmap-style table.

---

### 9.3 Feed History Screen

**Summary Bar (top):**
- Total feed this week | Total feed this cycle | Average daily feed

**Bar Chart:** Daily feed amounts for the last 14 days. Fasting days shown as empty bars with a dashed line.

**List:** FeedLogCard per day, showing total feed (or "Fasting Day"), feed product, number of meals. Tap → detail.

---

## 10. Sampling Screens

### 10.1 Sampling Log Screen

**Header:** "Body Weight Sample — [date]"

**Form:**
```
  Sample Date          [DatePicker, default today]
  DOC (auto-computed)  [read-only display: "Day 42 of Culture"]

  Mean Body Weight (g) [decimal, required]
  Sample Count         [integer, min 1, recommended ≥ 30]
                       [info tooltip: "Weigh at least 30 shrimp for accuracy"]

  Photos               [Photo grid component, max 5]

  Notes                [multiline]
```

**Below Form — Live Calculation Preview:**
```
  Based on this MBW:
  ┌─────────────────────────────────────────┐
  │ Est. Biomass:    128.4 kg               │
  │ ADG since last:  0.23 g/day             │
  │ vs Target:       8.4g / 12.0g target    │
  │ Progress bar:    ████░░░░ 70%           │
  └─────────────────────────────────────────┘
```

---

### 10.2 Sampling History Screen

**Growth Chart:**
- X-axis: DOC
- Y-axis: MBW (g)
- Line: actual sampled MBW (with data points)
- Dashed line: standard Vannamei growth reference curve
- Shaded band: target range (e.g., ±10% of target)

**List View:**
- Each entry: DOC, MBW, ADG, sample count, photo thumbnail if exists

---

## 11. Treatment Screens

### 11.1 Treatment Log Screen

**Form:**
```
  Treatment Date       [DatePicker]
  Treatment Type       [Picker: Chemical / Biological / Physical / Other]
  Product Name         [Searchable text + user catalog dropdown]
  Dosage               [numeric text input]
  Dosage Unit          [Picker: ppm / g/m³ / L/ha / kg / mL / other]
  Target Issue         [TextInput — what this treats]
  Written Notes        [multiline]
  Photos               [Photo grid, up to 5]
```

**Product Catalog Quick-Add:**
- `+ Save to My Products` checkbox below product name — if checked, saves to user's product catalog for reuse.

**Submit:** `Log Treatment`

---

### 11.2 Treatment History Screen

**Timeline Layout:**
- Grouped by week
- Each entry shows date, type badge, product name, and dosage
- Tap → detail view
- Color-coded by type: Chemical (orange), Biological (green), Physical (blue), Other (gray)

---

## 12. Harvest & Mortality Screens

### 12.1 Harvest Log Screen

**Form:**
```
  Harvest Date         [DatePicker]
  Harvest Type         [SegmentedControl: Partial | Final]

  Weight (kg)          [decimal, required]
  Count (shrimp)       [integer, optional]

  Price per kg         [decimal, currency]
  Buyer Name           [text]
  Buyer Contact        [phone/text]

  Notes                [multiline]
```

**Computed Preview (below form):**
```
  Estimated Revenue: RM 1,248.00
  Estimated Size: 16.8g avg
```

**Final Harvest Warning:**
When `Harvest Type = Final` is selected, show a yellow warning card:
```
  ⚠ Final Harvest
  This will end the current cycle for [Pond Name].
  All future logging will be disabled for this cycle.
  [Confirm Final Harvest] checkbox (required)
```

---

### 12.2 Harvest History Screen

**Summary Cards:**
- Total harvested this cycle: X kg
- Total revenue: $X
- Number of harvest events

**List:** HarvestCard per event, showing date, type badge (Partial/Final), weight, revenue. Color-coded by type.

---

### 12.3 Mortality Log Screen

**Form:**
```
  Mortality Date       [DatePicker]
  Estimated Count      [integer]

  Multiplier           [decimal, default 1.0]
  [info icon]: "Use multiplier to extrapolate from a section of the pond.
                Example: counted 50 dead in 1/10th of the pond → multiplier = 10"

  Estimated Total      [computed, read-only: count × multiplier]

  Cause                [text, optional]
  Photos               [photo grid, up to 5]
  Notes                [multiline]
```

**Cumulative Tracker Card (below form):**
```
  Total Mortality This Cycle: 2,350
  As % of Initial Stock:      4.7%   [progress bar — turns red if > 20%]
```

---

## 13. Chemical, Plankton & Microbiology Screens

### 13.1 Chemical Log Screen

**Form Layout:** Two-column grid of numeric input fields with unit labels.

**Fields (with units and range hints):**
```
  Ammonia / TAN (mg/L)     [0 – 0.5 normal]
  Nitrite (mg/L)           [0 – 0.5 normal]
  Nitrate (mg/L)           [0 – 50 normal]
  Alkalinity (mg/L CaCO₃)  [100 – 200 normal]
  Calcium (mg/L)           [200 – 500 normal]
  Magnesium (mg/L)         [1200 – 1800 normal]
  Phosphate (mg/L)         [0 – 1.0 normal]
  H₂S (mg/L)               [0 – 0.01 normal]
  CO₂ (mg/L)               [optional]
  Chlorine (mg/L)          [optional]
  Iron (mg/L)              [optional]
  Copper (µg/L)            [optional]
```

All fields optional. Range indicators (colored dots) shown per field.

**Quick Reference:** Collapsible section "Reference Ranges" showing all optimal ranges in a table.

---

### 13.2 Plankton Log Screen

**Form Fields:**
```
  Green Algae (cells/mL)
  Diatom (cells/mL)
  Cyanobacteria (cells/mL)
  Dinoflagellate (cells/mL)
  Protozoa (cells/mL)
  Euglenophyte (cells/mL)
  Other Phytoplankton (cells/mL)
  Zooplankton (cells/mL)
  Counting Method  [Picker: Haemocytometer / Plankton Net / Sedgwick Rafter]
  Notes
```

**Live Composition Preview:**
Below the form, a donut chart updates in real-time showing the composition of the plankton community as values are entered.

**Alerts rendered inline:**
- If Cyanobacteria > 30%: yellow warning banner
- If Protozoa > 20%: yellow warning banner

---

### 13.3 Microbiology Log Screen

**Form Fields:**
```
  Total Vibrio (CFU/mL)
  V. parahaemolyticus (CFU/mL)
  V. harveyi (CFU/mL)
  V. alginolyticus (CFU/mL)
  V. vulnificus (CFU/mL)
  Total Bacteria (CFU/mL)

  Lab Name        [text, optional]
  Sample Source   [Picker: Water / Sediment / Hepatopancreas]
  Notes
```

**Computed:**
```
  Vibrio Ratio: [computed %] — shown in colored badge
```

**Risk Card:**
```
  Vibrio Risk Assessment
  ├── Total Vibrio: 850 CFU/mL  ⚠ WARNING
  ├── V. para:       45 CFU/mL  ✓ Normal
  └── Vibrio Ratio:  12%         ⚠ WARNING
```

---

## 14. Disease Log Screens

### 14.1 Disease Log Screen

**Form:**
```
  Observed Date        [DatePicker]

  Link to Disease      [Searchable picker → Disease Encyclopedia]
                       OR enter custom disease name [text]

  Symptoms             [multiline text]
  Severity             [SegmentedControl: Mild | Moderate | Severe]
  Affected Count       [integer, optional]
  Photos               [photo grid, up to 5]
  Notes                [multiline]
```

**Disease Autocomplete:**
- Searching the disease picker filters the encyclopedia.
- Selecting a disease auto-populates an info card below the picker with a brief description and reference photo thumbnail.

---

### 14.2 Disease Log History Screen

- Timeline view of disease events
- Each entry shows date, disease name (linked), severity badge, photo thumbnail
- Tap → view full log
- No diseases logged: "No disease events recorded. Stay vigilant!"

---

## 15. Disease Encyclopedia Screens

### 15.1 Disease List Screen

**Search Bar:** Full-text search across name, description, symptoms (debounced 300ms).

**Filter Chips (horizontal scroll):**
- All | Bacterial | Viral | Parasitic | Environmental

**Disease Cards (FlatList):**
Each card shows:
- Disease code badge (e.g., "WSSV")
- Common name (bold)
- One-line summary
- Reference image thumbnail (right side)

**Offline Note:** Data is bundled locally. "Last updated: [date]" shown at bottom.

---

### 15.2 Disease Detail Screen

**Layout:**

```
[Hero Image Carousel]
  Swipeable reference images — pinch to zoom

[Disease Header]
  Code Badge | Common Name
  Full scientific name (italic, smaller)

[Tab Navigation]
  Overview | Symptoms | Prevention | Treatment

Tab: Overview
  - Causative Agent (card)
  - Affected Organs (body diagram or icon list)
  - Transmission routes (bulleted list)

Tab: Symptoms
  - Signs & Symptoms (detailed)
  - Photo references with captions

Tab: Prevention
  - Management guidelines

Tab: Treatment
  - Treatment/management notes
  - Disclaimer: "Always consult a licensed aquaculture specialist"

[Footer]
  External Links (open in-app browser)
  "Log Disease for [Current Pond]" button (if a cycle is active)
```

---

## 16. Farm Calculators Screens

### 16.1 Calculator Hub Screen

**Grid of 4 calculator cards:**
- 📊 Cultivation Performance
- 🍽️ Daily Feed
- 🧪 Product Amount
- 💧 Free Ammonia

Each card: icon, title, one-line description.

---

### 16.2 Cultivation Performance Calculator Screen

**Source Toggle:** `Use Active Cycle Data` | `Enter Manually`

When `Use Active Cycle Data`:
- Dropdown to select active cycle/pond
- Fields auto-filled from DB (total seed, cumulative feed, latest MBW, total mortality, total harvested)
- User can override any field

**Input Fields:**
```
  Total Seed (count)
  Total Feed Used (kg)
  Current MBW (g)
  Total Mortality (count)
  Total Harvested Weight (kg)
  Total Harvested Count
```

**Results Card (shows on Calculate tap):**
```
  ┌──────────────────────────────────────────┐
  │  Estimated Population  14,760 shrimp     │
  │  Survival Rate         82.0%    ✓        │
  │  Biomass               124.0 kg          │
  │  FCR                   1.42     ✓        │
  └──────────────────────────────────────────┘
  Target SR: 85%  |  Target FCR: 1.5
```

Each result value shows a ✓ (on target), ⚠ (warning), or ✗ (off target) badge compared to cycle targets.

---

### 16.3 Daily Feed Calculator Screen

**Input Fields:**
```
  Initial Stocking (count)
  Current ABW (g)
  Feeding Rate (%)   [with reference table button]
  Survival Rate (%)
```

**Feeding Rate Reference Table Button:**
Opens a bottom sheet modal showing the FR reference table by ABW range. User can tap a row to auto-fill the FR field.

**Result:**
```
  Estimated Biomass:    124.0 kg
  Daily Feed Required:  4.96 kg/day
  Per Meal (4 meals):   1.24 kg/meal
```

---

### 16.4 Product Amount Calculator Screen

**Input Fields:**
```
  Pond Area (m²)        [auto-filled from pond selector]
  Water Height (m)
  Target Concentration (ppm)
  Product Form          [Picker: Granular | Liquid]
  Product Density (g/mL) [shown only for Liquid, default 1.0]
```

**Pond Selector:** Quick picker to auto-fill pond area from the user's pond list.

**Result:**
```
  Water Volume:   480 m³  (480,000 L)
  Product Needed: 480 g   (0.48 kg)
```

---

### 16.5 Free Ammonia Calculator Screen

**Input Fields:**
```
  Temperature (°C)
  pH
  TAN (mg/L)
```

**Result:**
```
  NH₃ (Unionized Ammonia):  0.24 mg/L

  Risk Level: ⚠ CAUTION
  ┌────────────────────────────────────────┐
  │ < 0.1    Safe      ████████░░░░░░░░░  │
  │ 0.1–0.3  Caution   ← You are here     │
  │ 0.3–0.5  Warning                      │
  │ > 0.5    Critical                     │
  └────────────────────────────────────────┘
  Recommendation: Monitor closely. Consider
  water exchange or aeration to reduce TAN.
```

Risk meter shown as a horizontal gradient bar with a pointer indicating current value.

---

## 17. Simulation Tool Screens

### 17.1 Simulation List Screen

**Header:** "Simulations" + `+ New Simulation` button

**Simulation Cards:**
- Name, date created, key inputs summary (stocking, target SR, market price)
- Last-run result preview (projected revenue, ROI)
- Options: Run, Edit, Duplicate, Delete

**Empty State:** "No simulations yet. Create one to forecast your harvest."

---

### 17.2 Simulation Create / Edit Screen

**Sections:**

```
Section: Basic Info
  Simulation Name  [text, optional — auto-generates if blank]

Section: Farm Setup
  Farm Area (m²)             [decimal]
  Stocking Density (PL/m²)   [decimal — auto-computes Total Stocking]
  Total Stocking (count)     [integer — or enter directly]

Section: Performance Targets
  Target Survival Rate (%)   [decimal]
  Target Size (g)            [decimal]
  Initial FCR                [decimal]
  Feed Price per kg          [decimal, currency]
  Market Price per kg        [decimal, currency]

Section: Partial Harvest Rules
  [List of harvest rules]
  Each rule:
    Day of Culture (DOC)     [integer]
    Harvest Percentage (%)   [decimal]
    [Remove]
  [+ Add Partial Harvest Rule]
  Validation: total % ≤ 100, DOCs must be ascending

Section: Growth Model
  [Use Standard Vannamei Curve] (default, toggle)
  [Advanced: Custom parameters] — collapsible, for power users
```

**Run Simulation button** → navigates to Results Screen

---

### 17.3 Simulation Results Screen

**Header:** Simulation name + `Re-run` / `Edit` buttons

**Tab Navigation:** Feed | Biomass | Harvest

**Tab: Feed Table**
Horizontal scrollable table:
| DOC | ABW (g) | Daily Feed (kg) | Weekly Feed (kg) | Cum. Feed (kg) | FCR | Feed Cost |
|---|---|---|---|---|---|---|

Rows every 7 days. Partial harvest rows highlighted in yellow.

**Tab: Biomass Table**
| DOC | ABW (g) | Population | Biomass (kg) | SR (%) |
|---|---|---|---|---|

Plus a line chart of Biomass over time with carrying capacity limit dashed line.

**Tab: Harvest Table**
| # | Type | DOC | Count | Weight (kg) | Price/kg | Revenue |
|---|---|---|---|---|---|---|

**Summary Footer Card (always visible):**
```
  ┌────────────────────────────────────────────┐
  │  Total Feed Cost      RM 14,200            │
  │  Total Revenue        RM 31,500            │
  │  Gross Profit         RM 17,300            │
  │  ROI                  121.8%               │
  │  Break-even Price     RM 5.20/kg           │
  └────────────────────────────────────────────┘
```

**Export Button:** Share simulation results as PDF or CSV.

---

## 18. Notifications Screen

**Header:** "Notifications" + "Mark All Read" button

**Filter Chips:** All | Critical | Warnings | Info

**Notification List:**

Each NotificationCard:
- Left border color-coded: red (critical), orange (warning), blue (info)
- Icon (parameter-specific: 🌡️ for temp, 🧬 for disease, etc.)
- Title (bold)
- Body text (2 lines, truncated)
- Timestamp (relative: "2 hours ago")
- Unread: light background tint
- Tap → navigate to the related log/screen

**Empty State:** "You're all caught up! No new notifications."

**Badge Management:**
- Notification count badge shown on drawer menu item and bottom tab
- Clears when notifications screen is visited

---

## 19. Settings & Profile Screens

### 19.1 Profile Screen

```
  [Avatar / initials circle]
  Name  [editable]
  Email [read-only]
  Phone [editable]
  [Save Profile]

  [Change Password]
  [Logout]
  [Delete Account] — destructive, requires confirmation + password
```

---

### 19.2 Settings Screen

**Sections:**

```
Notification Settings
  [ ] Critical water quality alerts
  [ ] Disease log alerts
  [ ] High mortality alerts
  [ ] Feeding tray reminders

Units & Preferences
  Temperature Unit:  °C | °F
  Weight Unit:       kg | lb
  Currency:          text input (e.g., USD, MYR, IDR)
  Language:          [Picker]

Data & Sync
  Offline Mode:      [ ] Enable offline logging
  Sync Status:       Last synced: 5 minutes ago
  [Force Sync Now]

About
  App Version
  Privacy Policy
  Terms of Service
  [Send Feedback]
```

---

## 20. Shared / Reusable Components

### 20.1 Component Inventory

| Component | Description |
|---|---|
| `ParameterInput` | Numeric input with unit label, inline range validation dot |
| `StatusBadge` | Colored chip for Safe/Warning/Critical/Custom |
| `MetricCard` | Key metric display: label + large value + trend arrow |
| `SectionCard` | Card container with title and optional subtitle |
| `DatePicker` | Native date picker abstraction (iOS/Android) |
| `TimePicker` | Native time picker |
| `PhotoGrid` | Grid of photo thumbnails with add/remove; opens picker |
| `SearchableDropdown` | Autocomplete dropdown with custom item render |
| `ConfirmModal` | Reusable confirmation dialog with title/body/confirm/cancel |
| `EmptyState` | Illustration + title + subtitle + optional CTA button |
| `SkeletonLoader` | Loading skeleton for cards/lists |
| `InfoTooltip` | Small `ℹ` icon that shows a popover with help text |
| `RangeBanner` | Yellow/red inline banner for out-of-range parameter |
| `TrendIndicator` | ▲ ▼ — icon + delta value, colored |
| `ProgressRing` | Circular progress for SR%, target completion |
| `ColorPicker` | Swatch grid with labels for water color selection |
| `IconSelector` | Grid of icon+label buttons (weather, type selectors) |
| `FeedingTrayCard` | Single tray with 3-option status selector |
| `ChartCard` | Wrapper card with title, legend, and a chart |
| `TimelineItem` | Single event row for timeline views |
| `AlertBanner` | Full-width top-of-screen alert banner (warning/critical) |
| `FAB` | Floating Action Button |
| `LoadingOverlay` | Full-screen translucent loading spinner |

---

### 20.2 ParameterInput Component Spec

```tsx
<ParameterInput
  label="pH"
  value={value}
  onChangeText={setValue}
  unit=""           // empty for dimensionless
  min={7.5}         // warning low
  max={8.5}         // warning high
  criticalMin={7.0}
  criticalMax={9.0}
  keyboardType="decimal-pad"
  hint="Normal: 7.5 – 8.5"
/>
```

Renders:
- Label above
- Text input with right-aligned unit label inside
- Status dot (green/yellow/red) on far right
- Inline `RangeBanner` below when out-of-range

---

### 20.3 MetricCard Component Spec

```tsx
<MetricCard
  label="Survival Rate"
  value="82.0"
  unit="%"
  trend="down"       // 'up' | 'down' | 'flat'
  trendValue="-1.2%"
  status="warning"   // 'normal' | 'warning' | 'critical'
  target={85}
  targetLabel="Target: 85%"
/>
```

---

## 21. Form Validation UX Patterns

### 21.1 Validation Timing

| Trigger | Action |
|---|---|
| Field blur (on first interaction) | Show inline validation error |
| Form submit | Validate all fields, scroll to first error |
| Real-time (numeric range) | Show parameter status dot only (not full error) |
| Out-of-range critical | Show `RangeBanner` inline; also show modal on submit attempt |

### 21.2 Error Display Hierarchy

1. **Field-level:** Red border + red error text below field
2. **Range warning:** Yellow `RangeBanner` below field (does NOT block save)
3. **Range critical:** Red `RangeBanner` below field + submit triggers confirmation modal
4. **Form-level errors:** Red banner at top of scrollable form (e.g., "Fix 2 errors before saving")

### 21.3 Required vs. Optional Fields

- Required fields: no special marker (all inputs assumed required unless labeled)
- Optional fields: `(optional)` label appended in gray to the field label
- Required fields that are empty on blur: show "This field is required"

### 21.4 Confirmation Modal for Critical Values

```
Title:    "Out-of-Range Values Detected"
Body:     "The following values are outside critical ranges:
            • pH: 9.3 (max: 9.0)
            • DO: 2.1 mg/L (min: 3.0 mg/L)
           Do you want to save this entry anyway?"
Buttons:  [Cancel]   [Save Anyway]
```

---

## 22. Offline & Sync UX

### 22.1 Offline Indicator

- Persistent yellow banner at top of screen when offline: "📶 Offline Mode — Data will sync when connected"
- Not shown when online

### 22.2 Pending Upload Indicator

For log entries with `photos[]` where uploads are pending:
- Show a small yellow clock icon badge over the photo thumbnail
- Log entry card in history shows "⏳ Sync pending" chip

### 22.3 Sync Status Screen (in Settings)

```
  Last Synced: Feb 20, 2026 — 10:42 AM
  Pending uploads: 3 photos
  Pending log sync: 0 records
  [Sync Now]
```

### 22.4 Conflict Handling

If a log was edited both offline and remotely:
- Show a "Data Conflict" banner on the record
- Present two versions with a "Keep Local" / "Keep Server" choice

---

## 23. Charts & Data Visualization

### 23.1 Chart Types Used

| Chart | Screen | Library Recommendation |
|---|---|---|
| Line chart | Water quality history, MBW growth | Victory Native XL |
| Bar chart | Daily feed amounts | Victory Native XL |
| Donut / Pie | Plankton composition | Victory Native XL |
| Area chart | Biomass over time (simulation) | Victory Native XL |
| Sparkline | Dashboard mini-trends | Custom SVG or Victory |
| Progress bar | DOC progress, SR vs target | Custom component |
| Horizontal gradient meter | Free ammonia risk level | Custom component |
| Heatmap table | Feeding tray 7-day history | Custom component |

### 23.2 Chart Design Standards

- All charts use the app color palette (primary teal for main data series)
- Normal range bands shown as light green fills on line charts
- Warning threshold lines shown as dashed yellow
- Critical threshold lines shown as dashed red
- All charts must have:
  - Title
  - Labeled axes with units
  - Legend when multiple series present
  - Touch interaction: tap data point → tooltip with exact value + date
- Empty chart state: "Not enough data yet. Log more readings to see trends."

### 23.3 Simulation Charts

Biomass Chart:
- X: DOC, Y: Biomass (kg)
- Series: Projected Biomass (solid teal line)
- Overlay: Carrying Capacity (dashed gray line)
- Partial harvest events: vertical dashed lines with labels

Feed Cumulative Chart:
- X: DOC, Y: Cumulative Feed (kg) + Cost
- Dual Y-axis: feed kg (left), cost (right)

---

## 24. Media Handling UX

### 24.1 Photo Picker UX

`PhotoGrid` component behavior:
- Shows up to 5 photo slots as a grid
- Unfilled slots show a `+` placeholder with dashed border
- Tapping a `+` slot opens an action sheet:
  - "📷 Take Photo"
  - "🖼️ Choose from Gallery"
  - "Cancel"
- Tapping an existing photo opens a full-screen viewer with zoom
- Long-press on existing photo opens: "View" | "Remove" options
- Upload progress shown as an overlay progress ring on the photo thumbnail

### 24.2 Image Compression

Before upload:
- Resize to max 1920px on longest side
- JPEG quality: 80%
- Use `expo-image-manipulator` for client-side compression
- Show compressed size in dev/debug mode

### 24.3 Full-Screen Photo Viewer

- Swipe left/right to browse multiple photos in a log entry
- Pinch-to-zoom
- Share icon (top right)
- Close button (top left)
- Photo counter: "2 of 4"

---

## 25. Accessibility Requirements

### 25.1 Core Requirements

- All interactive elements have `accessibilityLabel` and `accessibilityHint`
- Minimum touch target size: 44×44pt (Apple/Google standard)
- Color is never the only indicator of meaning (always paired with icon or text)
- Status dots on parameter inputs also show text label on long-press
- All images have `accessibilityLabel`
- Modals announce themselves to screen readers (`accessibilityViewIsModal={true}`)

### 25.2 Font Scaling

- All text uses `allowFontScaling={true}` (default)
- Layouts tested at 150% font scale — no text truncation in critical areas
- Numeric data (metrics) may disable font scaling to preserve layout: `allowFontScaling={false}` (acceptable exception)

### 25.3 Contrast

- All text meets WCAG AA minimum contrast ratios:
  - Normal text: 4.5:1
  - Large text: 3:1
- Status colors (green/yellow/red) tested against white and dark backgrounds

---

## 26. Performance Requirements

### 26.1 Screen Load Times

| Screen | Target Load Time |
|---|---|
| Pond Dashboard | < 1.5s (from cache) |
| Water Quality History (30 records) | < 1s |
| Simulation Results (120 DOC) | < 500ms |
| Disease Encyclopedia List | < 500ms (local data) |
| Photo upload (1 photo, 4G) | < 5s |

### 26.2 List Performance

- All FlatLists use `keyExtractor`, `getItemLayout` (where item height is fixed), and `windowSize={5}`
- Lists > 50 items must use `maxToRenderPerBatch={10}` and `initialNumToRender={15}`
- Paginate API calls: default page size 30, load more on scroll-to-end

### 26.3 Image Performance

- Use `expo-image` (or `FastImage`) instead of React Native `Image` for automatic caching
- Thumbnail versions (e.g., 200×200) served from CDN — never load full-resolution in lists
- Lazy load images outside viewport

### 26.4 Animation Performance

- All animations run on the UI thread using Reanimated 3 worklets
- No JS-thread animations for frequently-updating data
- Disable animations when `AccessibilityInfo.isReduceMotionEnabled()` is true

---

## 27. Localization & Internationalization

### 27.1 Required Locales at Launch

- English (en) — primary
- Bahasa Indonesia (id)
- Thai (th) — optional phase 2
- Vietnamese (vi) — optional phase 2

### 27.2 Implementation

- Use `i18next` + `react-i18next` with `expo-localization` for device locale detection
- All user-facing strings in translation files — no hardcoded UI strings
- Number formatting: use `Intl.NumberFormat` respecting locale (comma vs. period decimal separator)
- Date formatting: use `date-fns/locale` matching selected locale
- Currency: configurable in settings (symbol shown in UI, no auto-conversion)

### 27.3 RTL Support

- Not required for launch locales, but avoid hardcoded `left`/`right` styles — use `start`/`end` for future proofing where feasible.

---

## Appendix A: Screen Inventory (Complete List)

| # | Screen Name | Route Name |
|---|---|---|
| 1 | Login | `Auth/Login` |
| 2 | Register | `Auth/Register` |
| 3 | Forgot Password | `Auth/ForgotPassword` |
| 4 | Farms List | `Main/FarmsList` |
| 5 | Farm Detail (Pond List) | `Main/FarmDetail` |
| 6 | Create/Edit Pond | `Main/PondForm` |
| 7 | Create/Edit Cycle | `Main/CycleForm` |
| 8 | Pond Dashboard | `Main/PondDashboard` |
| 9 | Log Entry Selection Hub | `Main/LogHub` |
| 10 | Water Quality Log Form | `Main/WaterQualityForm` |
| 11 | Water Quality History | `Main/WaterQualityHistory` |
| 12 | Water Quality Detail | `Main/WaterQualityDetail` |
| 13 | Feed Log Form | `Main/FeedLogForm` |
| 14 | Feed Log History | `Main/FeedLogHistory` |
| 15 | Sampling Log Form | `Main/SamplingForm` |
| 16 | Sampling History | `Main/SamplingHistory` |
| 17 | Treatment Log Form | `Main/TreatmentForm` |
| 18 | Treatment History | `Main/TreatmentHistory` |
| 19 | Harvest Log Form | `Main/HarvestForm` |
| 20 | Harvest History | `Main/HarvestHistory` |
| 21 | Mortality Log Form | `Main/MortalityForm` |
| 22 | Chemical Log Form | `Main/ChemicalForm` |
| 23 | Plankton Log Form | `Main/PlanktonForm` |
| 24 | Microbiology Log Form | `Main/MicrobiologyForm` |
| 25 | Disease Log Form | `Main/DiseaseLogForm` |
| 26 | Disease Log History | `Main/DiseaseLogHistory` |
| 27 | Disease List (Encyclopedia) | `Main/DiseaseList` |
| 28 | Disease Detail (Encyclopedia) | `Main/DiseaseDetail` |
| 29 | Calculator Hub | `Main/CalculatorHub` |
| 30 | Cultivation Performance Calc | `Main/CalcCultivation` |
| 31 | Daily Feed Calculator | `Main/CalcDailyFeed` |
| 32 | Product Amount Calculator | `Main/CalcProductAmount` |
| 33 | Free Ammonia Calculator | `Main/CalcFreeAmmonia` |
| 34 | Simulation List | `Main/SimulationList` |
| 35 | Simulation Create/Edit | `Main/SimulationForm` |
| 36 | Simulation Results | `Main/SimulationResults` |
| 37 | Notifications | `Main/Notifications` |
| 38 | Profile | `Main/Profile` |
| 39 | Settings | `Main/Settings` |
| 40 | Cycle Detail / History | `Main/CycleDetail` |

---

## Appendix B: Zod Schema Examples

```ts
// schemas/waterQuality.ts
import { z } from 'zod';

export const WaterQualitySchema = z.object({
  logDate:         z.string().date(),
  timeOfDay:       z.enum(['morning', 'afternoon', 'evening']),
  ph:              z.number().min(0).max(14).optional(),
  salinityppt:     z.number().min(0).max(60).optional(),
  temperatureC:    z.number().min(0).max(45).optional(),
  doMgL:           z.number().min(0).max(20).optional(),
  transparencyCm:  z.number().min(0).max(200).optional(),
  orpMv:           z.number().min(-500).max(1000).optional(),
  waterColor:      z.string().optional(),
  weather:         z.enum(['sunny','cloudy','rainy','overcast']).optional(),
  conductivityMsCm:z.number().min(0).optional(),
  turbidityNtu:    z.number().min(0).optional(),
  waterHeightCm:   z.number().min(0).optional(),
  notes:           z.string().max(1000).optional(),
});

export type WaterQualityFormValues = z.infer<typeof WaterQualitySchema>;
```

```ts
// schemas/cycle.ts
export const CycleSchema = z.object({
  stockingDate:       z.string().date(),
  totalSeed:          z.number().int().min(1),
  initialAgeDays:     z.number().int().min(0),
  species:            z.string().min(1),
  hatchery:           z.string().optional(),
  broodstock:         z.string().optional(),
  feedPricePerKg:     z.number().positive().optional(),
  carryingCapacityKg: z.number().positive().optional(),
  targetSizeG:        z.number().positive().optional(),
  targetSurvivalRate: z.number().min(0).max(100).optional(),
  targetFcr:          z.number().positive().optional(),
  targetDays:         z.number().int().positive().optional(),
});
```

---

## Appendix C: TanStack Query Key Conventions

```ts
// queryKeys.ts
export const queryKeys = {
  farms:              () => ['farms'] as const,
  farm:               (id: string) => ['farms', id] as const,
  ponds:              (farmId: string) => ['farms', farmId, 'ponds'] as const,
  pond:               (id: string) => ['ponds', id] as const,
  cycles:             (pondId: string) => ['ponds', pondId, 'cycles'] as const,
  activeCycle:        (pondId: string) => ['ponds', pondId, 'cycles', 'active'] as const,
  waterQuality:       (cycleId: string) => ['cycles', cycleId, 'water-quality'] as const,
  feedLogs:           (cycleId: string) => ['cycles', cycleId, 'feed'] as const,
  sampling:           (cycleId: string) => ['cycles', cycleId, 'sampling'] as const,
  diseases:           () => ['diseases'] as const,
  disease:            (id: string) => ['diseases', id] as const,
  notifications:      () => ['notifications'] as const,
  simulations:        () => ['simulations'] as const,
  simulationResults:  (id: string) => ['simulations', id, 'results'] as const,
};
```

---

*End of Frontend Specification*
*Version 1.0 — Shrimp Aquaculture Management App*