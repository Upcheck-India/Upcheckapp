# Upcheck — Feature-by-Feature Completeness Audit

> ## ✅ Remediation status (2026-06-01)
> A fix pass was completed after this audit. **Tree is green: backend 266/266 tests, frontend 108/108 tests, frontend `tsc` clean, and the full migration chain applies to a fresh Postgres (33 tables + disease seed).**
>
> **Fixed:**
> - **All 8 CRITICAL.** Production DB now provisioned by a generated baseline `CREATE TABLE` migration (`1700000000000-BaselineSchema.ts`) for all 32 tables; `migrationsRun` enabled in prod + chain verified idempotent; the `broodstock`→`broodstocks` typo, the `common_names` entity-mapping bug, and the empty-`ARRAY[]` seed cast fixed. Render health-check path corrected to `/api/health`. Alerts IDOR routes removed/scoped. Inventory FE↔BE field names aligned + `adjust` route added. Feeding-tray, disease, and water-quality table-creation resolved by the baseline.
> - **High-severity:** transactions + reports/cycle-analysis ownership scoping (IDOR); delete-account now cascades (users row + profiles + Supabase auth user); Truecaller replay store now Redis-backed for multi-instance; feed `cropId` filter; disease `severityLevel` field + library picker (no more hardcoded UUID); harvest `cropId` navigation; harvest-plans payload aligned; News, Shop/eShop, Expenses, Transactions, Reference, and Harvest-plans **screens built and wired** (reachable from More menu / Farm / Cycle); dashboard `farmId` fixed (no longer permanently zero); simulation delete; cycle-analysis FCR computed.
> - **Tests:** stale `crops.service.spec` and the two flaky `TruecallerLoginScreen` suites fixed.
>
> **Second pass — done:** **TOTP 2FA** (users columns + migration, `TwoFactorService` with otplib/qrcode, `/auth/supabase/2fa/{setup,enable,disable,status,login}`, sign-in 2FA challenge, Settings management screen + login challenge screen); **passwordless email OTP login** (Supabase-native `signInWithOtp`/`verifyOtp`, `/auth/supabase/login-otp/{request,verify}`, OtpLoginScreen); **push notifications end-to-end** (`users.push_token` + migration, `PushModule`/`PushService` → Expo, `/push/register`, `createAutoAlert` now sends + records `isPushSent`, client registers token after auth). Re-verified green: backend 266/266, frontend 108/108, `tsc` clean, 7 migrations / 33 tables.
>
> **Third pass — remaining medium/low items closed:**
> - **Backend:** `GET /disease/library/seed` → `POST`; reference `@Put` → `@Patch`; disease-record `PATCH`/`DELETE`; mortality dead `@CurrentUser` param removed; farm `boundary` persisted on create; `PondsService.findOne` enforces farm ownership; financial report aggregates **all** cycles (not just active); unused `UseGuards`/`Req` imports removed; broken `otp-cleanup` cron removed from both `render.yaml`.
> - **Frontend:** edit/delete for chemical/plankton/microbiology + sampling/mortality logs; water-quality nitrate/hardness inputs + delete; Growth/Harvest/Biomass/Feeding-rate calculator screen (4 orphan endpoints) + hub tile; Feed-products screen; Reference create UI; charts in Reports; FreeAmmonia shows backend toxicity band; simulation delete; **offline sync** (NetInfo → syncStore → OfflineIndicator; also fixed a missing-polyfill startup crash); **i18n** activated (init + AsyncStorage persistence + language toggle); notificationStore wired; typed `refreshToken`; resend-verification banner. Jest mocks added for NetInfo + AsyncStorage.
> - Re-verified green: backend 266/266, frontend 108/108, `tsc` clean, 7 migrations / 33 tables.
>
> **Accepted by design (not changed):** lazy profile upsert on `GET /profiles/me` (provisioning safety-net), global `JwtAuthGuard` per-request Supabase validation, feed-products as a shared (non-user-scoped) catalogue, and the `calculatorStore` sticky-input helper. Full per-string translation of all screens is a content task — the i18n framework is now active. The matrix below reflects the **original pre-fix** state.

**Date:** 2026-06-01
**Scope:** Every product feature, audited across all layers — **Database** (entity ↔ migration/SQL), **Backend** (controller + service + module wiring), **API** (frontend client URL/verb/field match), **Screen** (a UI actually consumes it), **Store** (Zustand wiring).
**Method:** 16 feature groups audited in parallel by independent agents reading the live code, then every **critical/high** finding was re-checked by an adversarial verifier instructed to refute it. **0 of 34 critical/high findings were refuted** — all hold up against the source.

> This audit is read-only. No code was changed. It supersedes `FEATURES.md` where the two disagree — `FEATURES.md` describes the intended product; this describes what the code actually does.

---

## 1. Executive summary

The app is **broad but shallow**: nearly every backend module exists and compiles, but a large fraction of features are not wired end-to-end. The dominant failure mode is **layers that exist in isolation** — a backend endpoint with no screen, or a frontend client whose URL/field names don't match the backend.

### Headline counts

| | Count |
|---|---|
| Features audited | **96** across 16 groups |
| ✅ Fully functional (incl. 2 that work but whose docs are wrong) | **30** |
| ⚠️ Incomplete (a layer missing/stubbed) | **44** |
| ❌ Broken (layers exist but mismatched / will fail at runtime) | **22** |
| Gaps found | **99** (8 critical · 26 high · 35 medium · 30 low) |

### Build & test baseline (run directly, not via agents)

| Check | Result |
|---|---|
| Backend `nest build` | ✅ Passes (exit 0) |
| Backend `npm test` | ⚠️ **1 failed** / 266 — `crops.service.spec.ts:135` (`computedDOC` field is now returned but the test's expected object omits it — stale test, not a product bug) |
| Frontend `npx jest` | ⚠️ **2 suites failed** / 108 tests — both `TruecallerLoginScreen.*` suites time out at 20 s because the OTP countdown runs on real timers across many property-test runs (test-harness issue, not a screen bug) |

### Three systemic issues that affect many features at once

1. **🔴 Production has no database. (CRITICAL, repo-wide)** No migration and no `supabase_setup.sql` statement issues `CREATE TABLE` for any core entity — they only `ALTER`/`CREATE INDEX` against tables they *assume* already exist. The only `CREATE TABLE` in the whole repo is `tasks`. Tables currently materialise **only** via TypeORM `synchronize`, which is hardwired off in production (`app.module.ts:55`, `synchronize: !isProduction`). On top of that, the app **never runs migrations** (no `migrations`/`migrationsRun` in the TypeORM config, and `render.yaml` never calls `migration:run`). A clean production deploy comes up with an empty schema and every data feature fails at first query. This is why ~28 features carry a ⚠️ in the **DB** column.
2. **🔴 Missing-ownership / IDOR on several read+write endpoints. (CRITICAL/HIGH)** `alerts`, `transactions`, and `reports/cycle/:id/analysis` take a `userId`/`id` straight from the URL and never check it against the authenticated caller. Any logged-in user can read or mutate another user's notifications and financial records.
3. **🟠 Many features are "half-wired".** Whole domains have a complete backend + API client but **no screen** (News, Products/eShop, Expenses, Transactions, Reference, Harvest-plans, Pond dimension-history, Cycle-analysis), or a screen + backend but a **mismatched API client** (Inventory field names, Feed/Sampling/Mortality filter params, Disease `severityLevel`). Offline sync, i18n, and push notifications are dependencies that are installed but effectively dead.

### Documentation drift
`FEATURES.md` advertises several things that **do not exist in code**: 2FA TOTP, passwordless OTP login, an in-app eShop UI, "full CRUD" reference clients, and server-side Google verification with `google-auth-library`. It also omits the entire **Tasks** module (which *is* implemented). Treat `FEATURES.md` as aspirational until reconciled.

---

## 2. Per-feature matrix

Legend — per layer: ✅ present & consistent · ⚠️ present but partial/mismatched · ❌ missing · – not applicable.
Status: ✅ Functional · 📝 Works but docs wrong · ⚠️ Incomplete · ❌ Broken.

### Authentication & Profiles

| Feature | DB | Backend | API | Screen | Store | Status |
|---|:--:|:--:|:--:|:--:|:--:|---|
| Email/password signup | ⚠️ | ✅ | ✅ | ✅ | ✅ | ⚠️ Incomplete |
| Email/password signin | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ Functional |
| Email verification / resend | – | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ Incomplete |
| Forgot password | – | ✅ | ✅ | ✅ | ✅ | ✅ Functional |
| Reset password (from email link) | – | ⚠️ | ⚠️ | ❌ | – | ⚠️ Incomplete |
| Google OAuth | ⚠️ | ⚠️ | ✅ | ❌ | ✅ | ⚠️ Incomplete |
| Truecaller One-Tap (Flow A) | ⚠️ | ✅ | ⚠️ | ✅ | ⚠️ | ✅ Functional |
| Truecaller OTP / missed-call (Flow B) | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ Functional |
| 2FA TOTP (enrol/verify/disable) | ❌ | ❌ | ❌ | ❌ | – | ❌ Broken |
| OTP login (passwordless SMS) | ❌ | ❌ | ❌ | ❌ | – | ❌ Broken |
| JWT refresh | – | ✅ | ✅ | – | ⚠️ | ⚠️ Incomplete |
| Account linking (phone->existing email) | ⚠️ | ✅ | – | – | – | ✅ Functional |
| Signout | – | ✅ | ✅ | – | ✅ | ✅ Functional |
| Current user (me) | – | ✅ | ✅ | – | ✅ | ✅ Functional |
| Update user (email/password/data) | – | ⚠️ | ❌ | ❌ | – | ⚠️ Incomplete |
| Profile read (me / by id) | ⚠️ | ⚠️ | ✅ | – | – | ⚠️ Incomplete |
| Profile update | ⚠️ | ✅ | ✅ | – | – | ✅ Functional |
| Username availability check | ⚠️ | ✅ | ✅ | – | – | ✅ Functional |
| Invite friend | – | ⚠️ | ✅ | – | – | ⚠️ Incomplete |
| Delete account (delete-me) | ⚠️ | ⚠️ | ✅ | – | – | ⚠️ Incomplete |
| Public profile by username | ⚠️ | ✅ | ✅ | – | – | ✅ Functional |

### Farms & Ponds

| Feature | DB | Backend | API | Screen | Store | Status |
|---|:--:|:--:|:--:|:--:|:--:|---|
| Farms CRUD | ⚠️ | ✅ | ✅ | ✅ | – | ⚠️ Incomplete |
| Farm boundary (map polygon) | ⚠️ | ❌ | ✅ | ❌ | – | ❌ Broken |
| Ponds CRUD + batch create | ⚠️ | ✅ | ✅ | ✅ | – | ⚠️ Incomplete |
| Pond /mine listing | ⚠️ | ✅ | ✅ | ❌ | – | ⚠️ Incomplete |
| Pond archive / delete | ⚠️ | ✅ | ✅ | ❌ | – | ⚠️ Incomplete |
| Pond dimension history | ⚠️ | ✅ | ✅ | ❌ | – | ⚠️ Incomplete |
| activeFarmStore (selected farm context) | – | – | – | ❌ | ⚠️ | ⚠️ Incomplete |

### Crops, Harvests & Plans

| Feature | DB | Backend | API | Screen | Store | Status |
|---|:--:|:--:|:--:|:--:|:--:|---|
| Crops / cycles (create, list, get, update, delete) | ⚠️ | ✅ | ✅ | ✅ | – | ⚠️ Incomplete |
| Close cycle (PATCH /crops/:id/close) | – | ✅ | ✅ | ✅ | – | 📝 Works (docs wrong) |
| Crop harvest action (PATCH /crops/:id/harvest) | – | ✅ | ❌ | ❌ | – | ⚠️ Incomplete |
| computed DOC (Day of Culture) | – | ✅ | ⚠️ | ⚠️ | – | ✅ Functional |
| Harvest records (CRUD /harvests) | ⚠️ | ⚠️ | ✅ | ⚠️ | – | ❌ Broken |
| Harvest plans (CRUD + complete + summary) | ⚠️ | ⚠️ | ⚠️ | ❌ | – | ❌ Broken |

### Feed (records / tray / products)

| Feature | DB | Backend | API | Screen | Store | Status |
|---|:--:|:--:|:--:|:--:|:--:|---|
| Feed records (log + history + total) | ⚠️ | ✅ | ⚠️ | ✅ | – | ❌ Broken |
| Feeding tray checks | ⚠️ | ⚠️ | ⚠️ | ❌ | – | ❌ Broken |
| Feed products (SKU catalogue) | ⚠️ | ⚠️ | ✅ | ❌ | – | ⚠️ Incomplete |

### Water Quality

| Feature | DB | Backend | API | Screen | Store | Status |
|---|:--:|:--:|:--:|:--:|:--:|---|
| Water quality log create (POST /water-quality) | ⚠️ | ✅ | ✅ | ✅ | – | ⚠️ Incomplete |
| Water quality history / list (GET /water-quality?pondId=) | ⚠️ | ✅ | ✅ | ✅ | – | ✅ Functional |
| Latest water quality reading (GET /water-quality/pond/:pondId/latest) | ⚠️ | ✅ | ✅ | ✅ | – | ✅ Functional |
| Water quality update/delete (PATCH/DELETE /water-quality/:id) | ⚠️ | ✅ | ❌ | ❌ | – | ⚠️ Incomplete |
| Critical-threshold auto-alerts on save | – | ✅ | – | – | – | ✅ Functional |

### Sampling & Mortality

| Feature | DB | Backend | API | Screen | Store | Status |
|---|:--:|:--:|:--:|:--:|:--:|---|
| Sampling (ABW) logging | ⚠️ | ✅ | ✅ | ✅ | – | ❌ Broken |
| Sampling history view | ⚠️ | ✅ | ✅ | ✅ | – | ✅ Functional |
| Mortality logging | ⚠️ | ✅ | ✅ | ✅ | – | ❌ Broken |
| Mortality history view | ⚠️ | ✅ | ✅ | ✅ | – | ✅ Functional |

### Chemical / Plankton / Microbiology

| Feature | DB | Backend | API | Screen | Store | Status |
|---|:--:|:--:|:--:|:--:|:--:|---|
| Chemical Data Log | ⚠️ | ✅ | ✅ | ✅ | – | ⚠️ Incomplete |
| Plankton Data Log | ⚠️ | ✅ | ✅ | ✅ | – | ⚠️ Incomplete |
| Microbiology Data Log | ⚠️ | ✅ | ✅ | ✅ | – | ⚠️ Incomplete |

### Disease & Treatments

| Feature | DB | Backend | API | Screen | Store | Status |
|---|:--:|:--:|:--:|:--:|:--:|---|
| Disease library (encyclopedia) | ⚠️ | ⚠️ | ✅ | ⚠️ | – | ❌ Broken |
| Disease library search | ⚠️ | ✅ | ✅ | ✅ | – | ✅ Functional |
| Disease library seed | ⚠️ | ⚠️ | – | – | – | ❌ Broken |
| Disease records (per-crop incidents) | ⚠️ | ⚠️ | ✅ | ⚠️ | – | ❌ Broken |
| Treatments log | ⚠️ | ✅ | ✅ | ✅ | – | ⚠️ Incomplete |

### Calculators

| Feature | DB | Backend | API | Screen | Store | Status |
|---|:--:|:--:|:--:|:--:|:--:|---|
| FCR (Feed Conversion Ratio) | – | ✅ | ✅ | ✅ | – | ✅ Functional |
| ADG (Average Daily Growth) | – | ✅ | ✅ | ✅ | – | ✅ Functional |
| Survival Rate | – | ✅ | ✅ | ✅ | – | ✅ Functional |
| Daily Feed | – | ✅ | ✅ | ✅ | – | ✅ Functional |
| Cultivation Performance | – | ✅ | ✅ | ✅ | ⚠️ | ✅ Functional |
| Free Ammonia (NH3) | – | ✅ | ✅ | ⚠️ | ⚠️ | ✅ Functional |
| Product Dosage | – | ✅ | ✅ | ✅ | ⚠️ | ✅ Functional |
| Expected Harvest | – | ✅ | ❌ | ❌ | – | ⚠️ Incomplete |
| Growth Projection | – | ✅ | ❌ | ❌ | – | ⚠️ Incomplete |
| Biomass (GET) | – | ⚠️ | ❌ | ❌ | – | ⚠️ Incomplete |
| Recommended Feeding Rate (GET) | – | ⚠️ | ❌ | ❌ | – | ⚠️ Incomplete |

### Simulations

| Feature | DB | Backend | API | Screen | Store | Status |
|---|:--:|:--:|:--:|:--:|:--:|---|
| Run simulation (what-if scenario) | ⚠️ | ✅ | ✅ | ✅ | – | ❌ Broken |
| List simulations | ⚠️ | ✅ | ✅ | ✅ | – | ❌ Broken |
| View simulation details / results | ⚠️ | ✅ | ⚠️ | ✅ | – | ⚠️ Incomplete |
| Delete simulation | – | ✅ | ❌ | ❌ | – | ⚠️ Incomplete |
| Edit/update simulation | – | – | – | – | – | ✅ Functional |

### Finance

| Feature | DB | Backend | API | Screen | Store | Status |
|---|:--:|:--:|:--:|:--:|:--:|---|
| Transactions (income/expense ledger + farm summary) | ⚠️ | ⚠️ | ❌ | ❌ | – | ⚠️ Incomplete |
| Expenses (per-cycle expense logging) | ⚠️ | ✅ | ✅ | ❌ | – | ⚠️ Incomplete |
| Cycle financials (P&L per crop) | – | ✅ | ⚠️ | ❌ | – | ⚠️ Incomplete |
| Financial report (farm-level, in Reports screen) | – | ✅ | ✅ | ✅ | – | ✅ Functional |

### Inventory & Products (eShop)

| Feature | DB | Backend | API | Screen | Store | Status |
|---|:--:|:--:|:--:|:--:|:--:|---|
| Inventory (stock per farm, CRUD, low-stock) | ⚠️ | ⚠️ | ⚠️ | ⚠️ | – | ❌ Broken |
| Inventory adjust-stock endpoint | – | ❌ | ⚠️ | – | – | ❌ Broken |
| Products / eShop catalogue | ⚠️ | ✅ | ✅ | ❌ | – | ⚠️ Incomplete |

### News, Alerts & Push

| Feature | DB | Backend | API | Screen | Store | Status |
|---|:--:|:--:|:--:|:--:|:--:|---|
| Alerts (per-user notifications: list, unread count, mark-read, mark-all-read, delete) | ⚠️ | ⚠️ | ✅ | ⚠️ | – | ❌ Broken |
| News (articles feed, filterable by category) | ⚠️ | ✅ | ⚠️ | ❌ | – | ⚠️ Incomplete |
| Expo push notifications (token registration + delivery) | ❌ | ❌ | ❌ | – | – | ❌ Broken |
| notificationStore (zustand alert state) | – | – | – | ❌ | ⚠️ | ⚠️ Incomplete |

### Reports

| Feature | DB | Backend | API | Screen | Store | Status |
|---|:--:|:--:|:--:|:--:|:--:|---|
| Dashboard summary (GET /reports/dashboard) | – | ✅ | ✅ | ⚠️ | – | ❌ Broken |
| Financial report (GET /reports/financials) | – | ⚠️ | ✅ | ✅ | – | ✅ Functional |
| Cycle analysis (GET /reports/cycle/:id/analysis) | – | ⚠️ | ✅ | ❌ | – | ⚠️ Incomplete |
| Reports charts (react-native-chart-kit) | – | – | – | ❌ | – | ⚠️ Incomplete |

### Reference & Tasks

| Feature | DB | Backend | API | Screen | Store | Status |
|---|:--:|:--:|:--:|:--:|:--:|---|
| Tasks (Task Board) | ✅ | ✅ | ✅ | ✅ | – | 📝 Works (docs wrong) |
| Reference - Species (CRUD) | ⚠️ | ✅ | ⚠️ | ❌ | – | ⚠️ Incomplete |
| Reference - Hatchery (CRUD) | ⚠️ | ✅ | ⚠️ | ❌ | – | ⚠️ Incomplete |
| Reference - Broodstock (CRUD) | ⚠️ | ✅ | ⚠️ | ❌ | – | ⚠️ Incomplete |

### Cross-cutting

| Feature | DB | Backend | API | Screen | Store | Status |
|---|:--:|:--:|:--:|:--:|:--:|---|
| DB schema provisioning (production) | ❌ | ⚠️ | – | – | – | ❌ Broken |
| Render deploy health check | – | ⚠️ | – | – | – | ❌ Broken |
| Global auth guard + Throttler | – | ✅ | – | – | – | ✅ Functional |
| Offline sync (syncStore + queue) | – | – | ❌ | ⚠️ | ⚠️ | ❌ Broken |
| i18n (i18next) | – | – | – | ❌ | – | ⚠️ Incomplete |
| Truecaller replay store & key cache | – | ⚠️ | – | – | – | ⚠️ Incomplete |
| Reference data seed | – | ✅ | – | – | – | ⚠️ Incomplete |

---

## 3. Prioritized fix list

### 🔴 Critical — blocks production / data-integrity / security (8)

1. **No production table-creation path (whole DB).** Add real `CREATE TABLE` migrations for every entity (generate a fresh baseline migration against an empty DB), wire `migrations`/`migrationsRun: true` (or add `migration:run` to the Render `startCommand`), and stop relying on `synchronize`. *Evidence: `migrations/1771597711215-InitialSchema.ts` (ALTER-only), `1740487200000-DatabaseQualityFixes.ts` (index/column-only), `app.module.ts:55,62-70`, `render.yaml:8-9`, `supabase_setup.sql` (trigger only).* — verified.
2. **Migrations never execute, and `SeedDiseaseLibrary` would fail.** Same root as #1; once migrations run, audit the seed migration's `ARRAY[]` inserts. *`app.module.ts:62-70`, `render.yaml`, `migrations/1746000000000-SeedDiseaseLibrary.ts:10-20`.* — verified.
3. **Alerts `user/:userId` routes leak other users' data (IDOR).** `GET /alerts/user/:userId`, `…/count`, and `PATCH …/read-all` trust the URL `userId`. Drop these in favour of the `me`-scoped routes, or enforce `userId === currentUser.id`. *`alerts.controller.ts:30-38,50-53`; `alerts.service.ts:44-51,73-76`.* — verified.
4. **Inventory FE↔BE field names don't match — feature can't render.** FE reads `currentStock`, `minStockThreshold`, `lastPurchaseDate`, `notes`; entity has `quantity`, `reorderLevel`, `unitPrice`, `supplier`, `expiryDate`. Pick one contract and align entity ↔ DTO ↔ client ↔ both screens. *`api/inventory.ts:9-11`; `inventory-item.entity.ts:29-45`; `InventoryListScreen.tsx:105-109,174-178`; `InventoryDetailScreen.tsx:33-34,104-118`.* — verified.
5. **Feeding-tray-checks is completely unreachable.** No screen calls `feedingTrayChecksApi`; `FeedLogScreen` stuffs tray inputs into the feed-record payload instead. Either build the tray-check screen or remove the dead module. *`api/feedingTrayChecks.ts:17-26`; `FeedLogScreen.tsx:40-52`; `feeding-tray-checks` DTO.* — verified.
6. **`water_quality_records` has no production table** (specific instance of #1, called out because it's a core daily-use feature). *`migrations/1740487200000-DatabaseQualityFixes.ts:20,133`.* — verified.
7. **`disease_library` / `disease_records` / `treatments` have no production table** (instance of #1; also blocks the seeded encyclopedia). *`disease-*.entity.ts`, `treatment.entity.ts`.* — verified.
8. **Render health check points at a route that doesn't exist.** `healthCheckPath: /api/auth/health` — the real route is `/api/health`. Render will mark every deploy unhealthy and may refuse to route traffic. Change to `/api/health`. *`render.yaml:10`; `app.controller.ts:15-16`; `main.ts:25`.* — verified.

### 🟠 High — feature broken or major gap (26)

**Security / correctness**
- **Transactions endpoints lack ownership scoping (IDOR)** — any user can read/edit/delete any farm's finances. *`transactions.service.ts:20-64`; `transactions.controller.ts:16-37`.*
- **`reports/cycle/:id/analysis` lacks ownership scoping** — leaks any cycle's production data. *`reports.controller.ts:13-16`; `reports.service.ts:65-106`.*
- **Delete-account orphans data** — `deleteAccount` only deletes the `profiles` row; the Supabase `auth.users` record, `public.users` mirror, and all owned farm data survive. *`profiles.service.ts:79-83`; `supabase-auth.service.ts:156-164`.*
- **Truecaller replay/key stores are in-memory only** — replay protection breaks across multiple instances (the code's own docstring says use Redis; `RedisModule` is imported but never wired in). *`truecaller.service.ts:311-366,645-662`.*

**FE↔BE contract mismatches (feature silently broken)**
- **Inventory `adjustStock` calls a non-existent route** `PATCH /inventory/:id/adjust`; the implemented service method is unreachable. *`api/inventory.ts:50-51`; `inventory.controller.ts:12-47`.*
- **Inventory `findAll` returns a paged `PageDto`** while the FE expects a flat array → list renders empty.
- **Feed history `getByCrop` sends `?cropId=`** which the backend ignores (it only reads `pondId`) → wrong/empty results. *`api/feedRecords.ts:33`; `feed-records.controller.ts:21-27`; `service.ts:55,61`.*
- **Disease library `severity` vs `severityLevel`** — backend returns `severityLevel`, FE reads `severity` → badge never renders. *`disease-library.entity.ts:29-30`; `api/diseases.ts:19`.*
- **`DiseaseLogScreen` sends a hardcoded fake `diseaseId`** (`1111…`) with only a free-text UUID box → every save violates the FK. Needs a library picker. *`DiseaseLogScreen.tsx:17,40,107`.*
- **Harvest log/history navigation passes `cycleId`, not `cropId`** → history shows all harvests and the log can't attribute correctly. *`CycleDetailScreen.tsx:131`; `HarvestHistoryScreen.tsx:12,23-25`.*
- **`harvestPlansApi` create payload field names don't match the DTO** → silently saves empty plans.

**Backend exists, no screen (dead feature)**
- **News** — `newsApi` imported nowhere, no News screen. *`api/news.ts:14`.*
- **Products / eShop** — complete backend + client, zero UI; contradicts the advertised eShop. *`api/products.ts:32-50`; `RootNavigator.tsx:234-235`.*
- **Expenses** — full CRUD + client, no create/list screen. *`api/expenses.ts:40-49`.*
- **Reference (species/hatchery/broodstock)** — `referenceApi` has zero importers. *`api/reference.ts:41-62`.*
- **Pond dimension-history** — full backend + client, no UI. *`api/ponds.ts:65-66`; `ponds.service.ts:233-246,324-339`.*

**Advertised-but-unimplemented / dead end**
- **2FA TOTP** — DTOs + libs present, but no controller route, no service, no entity columns, no UI. Pure vaporware. *`auth/dto/*`; `supabase-auth.controller.ts:62-313`; `user.entity.ts` (columns removed).*
- **Passwordless OTP login** — DTOs only; no route/service/client/screen.
- **Password-reset link has no landing screen** — Supabase redirects to `/reset-password`, which doesn't exist in the app → reset is a dead end. *`supabase-auth.service.ts:169-171`.*
- **Push notifications dead end-to-end** — token acquired in `App.tsx` state, never sent to a backend (no route, no `pushToken` column); `isPushSent` is always false. *`App.tsx:56-58`; `notifications.ts:48-52`; `alerts.service.ts:39`.*
- **Offline sync is non-functional scaffolding** — `useSyncStore` imported by nothing; `OfflineIndicator` is hardcoded connected. *`syncStore.ts:36-83`; `OfflineIndicator.tsx:8-32`.*
- **Reports dashboard is permanently zero** — `HomeScreen` calls `/reports/dashboard` with no `farmId`. *`reports`/`HomeScreen`.*
- **Farm boundary (map polygon) silently dropped** on create — FE sends it, backend has no column/handling.

**DB (instances of #1, called out per domain):** no table for `crops`/`harvests`/`harvest_plans`, `feed_*`, `chemical_data`/`plankton_data`/`microbiology_data`, `transactions`/`expenses`, `inventory`/`products`, `alerts`/`news_articles`, `species`/`hatcheries`/`broodstocks`, and `public.users`/`profiles`.

### 🟡 Medium — partial/inconsistent, not blocking (35 — grouped)

- **Dead/mismatched stores:** `activeFarmStore`, `calculatorStore` (field names ≠ API), `notificationStore` (screen uses local state instead) are all dead code.
- **Orphaned backend capability (no client/screen):** 4 of 11 calculator endpoints (Expected Harvest, Growth Projection, Biomass, Recommended Feeding Rate); simulation **delete**; crop **harvest** action; harvest-plans UI; feed-products UI; cycle-analysis consumer; transactions client+screen.
- **No update/delete UI** despite backend support: water-quality, chemical/plankton/microbiology, sampling/mortality.
- **REST/side-effect smells:** `GET /profiles/me` and `/profiles/:id` **mutate** (upsert); `GET /disease/library/seed` mutates; global `JwtAuthGuard` makes a Supabase network call on **every** request.
- **Type/shape mismatches:** `CycleFinancials` FE type ≠ backend response; `feedApi.getLatest` typed as `FeedRecord` but `/total` returns a number; Truecaller One-Tap (Flow A) can't be carried by `authApi.truecallerOAuth`/`authStore` (only works because the screen bypasses them).
- **Missing inputs/visuals:** water-quality log omits nitrate & hardness; no charts rendered in Reports despite chart components existing; FreeAmmonia re-derives bands client-side, ignoring backend `toxicityLevel`.
- **Data wiring:** app-created cycle never linked to `pond.activeCycleId`; reference seed never runs on deploy; financial report excludes ponds without an active cycle.
- **Scoping (lower-risk):** harvests/harvest-plans GET and disease library/record endpoints lack ownership checks; inventory has no farm scoping and FE sends empty `farmId`.

### ⚪ Low — docs drift, dead imports, cosmetics (30 — grouped)

- **`FEATURES.md` corrections:** wrong route shapes for chemical/plankton/microbiology (`-data`, `crop/:cropId`), mortality, alerts; overstated Google verification; nonexistent endpoints listed; "calculators need no backend round-trip" (every screen calls the API); "full CRUD" reference clients (read-only); eShop/2FA/OTP claims; **Tasks module undocumented**; `/crops/:id/close` omitted.
- **Dead code / unused:** `i18next` installed but completely unused (no translated strings); unused `UseGuards` imports (calculators, finance); dead `findByPond`/`getById` methods; plankton `totalPlanktonCellMl` column unreachable via API; simulation pond selection is raw UUID free-text.
- **Test hygiene:** stale `crops.service.spec` expectation (the 1 failing backend test); Truecaller screen suites time out on real timers (the 2 failing FE suites) — switch to fake timers.
- **Minor semantics:** reference update uses `@Put` (full replace) with partial DTOs; `authStore.initialize` relies on untyped `(state as any).refreshToken`; mortality POST resolves `CurrentUser` but never passes it to `create`.

---

## 4. Suggested sequencing

1. **Unblock production first:** generate baseline `CREATE TABLE` migrations + run them on deploy (#1, #2, #6, #7 and all DB-column instances), and fix the health-check path (#8). Without these, nothing runs in prod.
2. **Close the security holes:** ownership scoping on alerts, transactions, cycle-analysis (and the lower-risk ones); fix delete-account cascade; move Truecaller replay/key stores to Redis.
3. **Repair the broken contracts:** inventory fields + adjust route, feed `cropId` filter, disease `severityLevel` + library picker, harvest `cropId` navigation, harvest-plan payload.
4. **Decide build-vs-cut for the half-wired domains:** News, Products/eShop, Expenses, Transactions UI, Reference UI, Harvest-plans UI, dimension-history, push, offline sync, 2FA/OTP. Each is either "build the missing layer" or "remove the dead code and update docs."
5. **Reconcile `FEATURES.md`** with reality and fix the two flaky test suites + the stale spec.

---

## 5. Verification confidence

All **8 critical** and **26 high** findings were independently re-checked by a second agent that read the cited files and tried to refute each one. None were refuted; two were *downgraded in scope* (e.g. the `public.users` claim: the table genuinely has no `CREATE`, but one supporting sub-detail was corrected) and are reflected at their corrected severity above. Every gap cites `file:line` evidence read from the live code. Medium/low findings were collected but not individually re-verified — treat them as high-confidence leads rather than confirmed defects.
