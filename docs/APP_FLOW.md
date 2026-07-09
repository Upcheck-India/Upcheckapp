# UpCheck — App Flow (screen-by-screen)

Derived from `RootNavigator.tsx`, `MainNavigator.tsx`, the screen components, and the backend Create-DTOs (the actual data contract). Use the **Verify** checklist at the end before the next build.

Legend: **→** = navigates to · *italic* = data collected/sent · `param` = passed in from previous screen.

---

## 0. Navigation model

- **Auth gate** (`RootNavigator`): if not authenticated → auth stack. If authenticated → main app.
- **Owner first-run gate**: a freshly-registered **owner** has `pendingFarmSetup = true` → app opens on **CreateFarm** (mandatory) instead of Home. Workers skip this.
- **Memberships** load on auth so `usePermissions()` resolves per-screen (owner vs worker capabilities).
- **Bottom tab bar** (`MainNavigator`): **Dashboard (Home) · Farms · ＋ QuickLog (center) · Reports · More**.

---

## 1. Auth flow

| Screen | Purpose | Data collected |
|---|---|---|
| **Login** | Email/password sign-in; entry to other methods | *email, password* |
| **Register** | Sign-up with role selector | *accountType (owner \| worker), firstName, lastName, email, password* |
| **OtpLogin** | Passwordless phone/email OTP | *identifier, otp code* |
| **TruecallerLogin** | One-tap phone auth (native only) | *Truecaller token (SDK)* |
| **TwoFactorChallenge** | 2FA step after login | `tempToken`, *6-digit TOTP* |
| **ForgotPassword** | Request reset email | *email* |
| **ResetPassword** | Set new password from email link | *new password* (deep link `upcheckapp://`) |
| **PrivacyPolicy / Terms** | Legal, reachable from Register consent | — |

**Flow:** Login ↔ Register · Login → OtpLogin / TruecallerLogin / ForgotPassword · login → (2FA?) → **owner:** CreateFarm · **worker:** Home.

---

## 2. First-run onboarding (owner)

| Screen | Purpose | Data collected |
|---|---|---|
| **Welcome** (modal) | Zero-farm intro for new users | — (CTA → CreateFarm) |
| **CreateFarm** | Create the farm | *name, numPonds (plannedPondCount), address, totalArea, waterSource, GPS coords (auto-located)* |
| **PondSetup** | Guided per-pond setup, repeats `totalPonds` times | per pond: *name, geometry, length/width/diameter/depth (m), aeratorCount, hpPerAerator, speciesId, strainId, hatcheryId, stockingDate, stockingDensity* |

`CreateFarm` → `PondSetup { farmId, totalPonds }` → (loop) → Home. After this, `pendingFarmSetup` clears.

---

## 3. Home & main tabs

### Dashboard / Home
- **Greeting** + settings shortcut.
- **Farm glance cards** (`FarmGlanceCards`): *active ponds, total ponds, low-stock alerts, today's feed, lunar cycle*.
- **Your Ponds** list → PondDashboard · **View all** → Farms.
- **Quick actions**: Farms · Calculators · Simulate · Settings · **Log now** → QuickLog.
- Zero-farm state → "Create farm" CTA → Welcome/CreateFarm.

### Farms tab → `FarmsListScreen`
List of farms → **FarmDetail** → ponds, members, tasks, transactions.

### ＋ QuickLog (center tab, modal)
Picker → routes to any log screen for a chosen pond/crop (Water Quality, Feed, Sampling, etc.).

### Reports tab → `ReportsScreen`
Dashboard summaries → CycleAnalysis, Transactions (owner), Crop P&L.

### More tab → `MoreScreen`
Grid → Inventory, Disease Encyclopedia, Tasks, News, Shop, Reference, Calculators, Simulations, Engines, Settings, Profile, Help/About, Legal.

---

## 4. Pond & cycle lifecycle

| Screen | Purpose | Data collected |
|---|---|---|
| **CreatePond** `{farmId}` | Add a pond | *namePrefix, geometryType, constructionType, length/width/diameter/depth (m), installedAeratorHp* (area auto-computed) |
| **PondDashboard** `{pondId}` | Pond hub: status, actions grid (core + More), links to logs/engines | — |
| **CreateCycle** `{pondId}` | Start a crop cycle | *name, stockingDate, stockingCount, speciesType, seedType, totalSeed, feedPrice, intensity, targetDays, targetSize, targetSr* |
| **CycleDetail** `{cycleId}` | Active cycle overview | — |
| **CycleAnalysis** `{cycleId}` | Post-cycle analytics | — |
| **PondDimensionHistory** `{pondId}` | Audit of pond dimension changes | — |

---

## 5. Logging screens (data per log type)

All take `{pondId, pondName?, cropId?}` unless noted. Fields from backend Create-DTOs:

| Log | Data collected |
|---|---|
| **WaterQualityLog** | pH, temperature, dissolvedOxygen, salinity, ammonia, nitrite, nitrate, alkalinity, hardness, transparency, notes |
| **FeedLog** | feedType, feedBrand, quantityKg, feedingTime, feedingMethod, waterTemperature, inventoryItemId, isFasting, notes |
| **FeedingTrayChecks** `{cropId}` | feedRecordId?, checkDate, checkTime, trayNumber, remainingFeedStatus |
| **SamplingLog** | samplingDate, mbwG (mean body weight), totalSamples, stdDeviation, biomassEstimationKg, srEstimationPercent, photoUrls, notes |
| **TreatmentLog** `{cropId}` | treatmentDate, basedOn, description, productId, dosageKg, notes |
| **MortalityLog** `{cropId}` | recordDate, quantity, estimatedWeightKg, note, images |
| **ChemicalLog** (Weekly Chemistry) `{cropId}` | measurementDate/time, alkalinityPpm, hardnessPpm, calciumCaPpm, magnesiumMgPpm, tomPpm, totalAmmoniaPpm, potassiumPpm |
| **PlanktonLog** `{cropId}` | measurementDate/time, 13 plankton-type counts (green/blue-green algae, dinoflagellata, diatom, protozoa, floc, euglenophyta, zoo, …) cell/mL |
| **MicrobiologyLog** `{cropId}` | measurementDate, totalBacillus, total/yellow/green Vibrio, luminescent bacteria (CFU/mL), note |
| **DiseaseLog** | disease record (see Disease Encyclopedia) |
| **HarvestLog** `{pondId, pondName, cropId?}` | harvestDate, weightKg, count, averageSize, salePriceTotal, buyerName, notes |

Each has a matching **History** screen (read-only timeline) under the same params.

---

## 6. Measurements pipeline (keystone)

**Measurements** `{pondId, cropId?}` — unified data-capture used across the app:
*param, valueNum/valueText, unit, measuredAt, timeOfDay, source, instrument, enteredByRole, deviceId, confidence, isMissingReason*. Supports batch entry (`continueOnError`).

---

## 7. Decision engines (`EnginesHub`)

All take optional `{pondId, cropId}`:

| Engine | Output |
|---|---|
| **MorningBriefing** | Daily roll-up across ponds |
| **DailyRoutine** | Today's recommended actions/tasks |
| **FeedAdvisor** | Recommended feed amount/schedule |
| **HarvestTiming** | Optimal harvest window |
| **DiseaseRisk** | Early-warning risk score |
| **Aeration** | Adequacy, night DO, power cost |
| **Lunar** | Molt-risk phase + action playbook (pre/peak/post/inter) |
| **CropPnl** | Live crop P&L |

---

## 8. Calculators & simulations

- **CalculatorHub** → CultivationPerformance · DailyFeedCalculator · ProductAmount · FreeAmmonia · GrowthAndHarvest. *(stateless inputs → result)*
- **SimulationList → SimulationCreate → SimulationResults** *(scenario inputs → projection)*.

---

## 9. Management

| Screen | Purpose | Data collected |
|---|---|---|
| **FarmDetail / FarmMembers** | Roster & roles (owner-managed) | — |
| **AddWorker** `{farmId}` | Add worker to farm | *worker identifier, role* |
| **TaskList** `{farmId}` | Task workflow (type, time window, recurrence, verify) | *task fields* |
| **Inventory / InventoryDetail** | Stock items & adjustments | *item, quantity adjust* |
| **FeedProducts** | Feed product catalog | — |
| **Expenses** `{cropId}` | Cycle expenses | *expense entries* |
| **Transactions** `{farmId}` (owner) | Financial ledger | *transaction entries* |
| **HarvestPlans** | Plan harvests | *plan fields* |

---

## 10. Content & settings

- **DiseaseList → DiseaseDetail**, **Diagnose** (symptom → likely disease).
- **NewsList → NewsDetail**, **Shop**, **Reference** (species/hatchery/broodstock).
- **Settings · Profile · TwoFactor · Notifications · Help · About · Privacy · Terms**.

---

## ✅ Verify before build

1. **Auth roles** — Register → owner lands on CreateFarm; worker lands on Home.
2. **Onboarding loop** — CreateFarm `numPonds` actually drives `PondSetup` repeat count; finishing clears `pendingFarmSetup`.
3. **Home glance cards** — active/total ponds, low-stock, today-feed, lunar all populate (not blank) with a real farm.
4. **QuickLog** — center ＋ reaches every log screen with the right `pondId/cropId`.
5. **Each log form** — fields above render and save (toast confirm); History shows the saved row.
6. **Measurements** — batch entry + `confidence`/`source` persist.
7. **Owner-only gating** — Transactions/Expenses/Members/AddWorker hidden for workers.
8. **Web caveat** — auth/maps/camera/secure-store no-op on web; verify those flows on the device build only.

> Note: ~90 screens total; this maps the primary journeys. Secondary screens (history, detail, legal) follow the same param contracts shown above.
