# Upcheck — Feature Wiring Matrix (code-derived, current)

> **What this is:** A feature inventory built by tracing the **live code** end-to-end through every layer — `nav route → screen → store → API client → backend route (+guard) → service → entity/migration`. It is the verification checklist for "is everything in the right place?"
> **Authoritative as of 2026-06-16.** **Supersedes `FEATURES.md` (stale/aspirational) and the pre-remediation matrix in `AUDIT.md` (2026-06-01).** Where this disagrees with those, trust this.
> **Method:** 6 parallel code-tracing passes (auth, farms/ponds/cycles, operational logs, calculators/engines, finance/inventory/reports/content, cross-cutting). Verdicts: **WIRED** (full chain connects) · **PARTIAL** (a layer thin/missing UI) · **MISMATCH** (FE↔BE contract drift) · **DEAD** (backend exists, no UI — or vice-versa).

> ⚠️ A handful of rows are marked **(verify)** — they look correct in code but should be confirmed on a running build/device before launch. They are called out again in §8.

---

## Headline: the app is in better shape than the old docs imply

Most items `AUDIT.md` (2026-06-01) flagged as broken were **fixed in the remediation passes** and now trace clean: Transactions (screen + ownership-scoped), alerts (`me`-scoped, no IDOR), inventory (FE↔BE fields aligned, `adjust` route wired), disease library (real picker, not a hardcoded UUID), and the News/Shop/Expenses/Reference/Harvest-plans screens are built and reachable. The dominant remaining work is **last-mile wiring and production hardening**, not missing features.

---

## 1. Auth / Profile / Onboarding / Settings

| Feature | Verdict | Notes / Evidence |
|---|---|---|
| Email/password signup, signin | WIRED | `RegisterScreen`/`LoginScreen` → `authStore` → `auth.ts` → `supabase-auth.controller.ts` → `BaselineSchema`. |
| Email verification + resend | WIRED | `supabase-auth.controller.ts`. |
| Forgot password | PARTIAL | Sends Supabase reset email, **but no in-app deep-link landing for the reset link** — reset completes only in Supabase's web UI. *Gap A1.* |
| Google OAuth | WIRED | Android uses **Android client ID** via expo-auth-session. |
| Truecaller (One-Tap + PKCE exchange) | WIRED | `TruecallerLoginScreen` → `/auth/supabase/oauth/truecaller/exchange`. |
| Email OTP (passwordless) | WIRED | `OtpLoginScreen` → `/auth/supabase/login-otp/{request,verify}`. |
| 2FA TOTP (setup/enable/disable/login challenge) | WIRED | `TwoFactorScreen` + `TwoFactorChallengeScreen`; cols in `Add2faAndPushColumns`. |
| JWT refresh / signout / me | WIRED | `client.ts` 401-refresh queue; `authStore`. |
| Profile read/update, username check | WIRED | `ProfileScreen` → `profiles.controller.ts`. |
| Delete account (cascade) | WIRED (verify) | `profiles.service.ts` `deleteAccount()` deletes `public.users` (cascades farm data) + `credit_ledgers` + `profiles` + Supabase `auth.users`. *Confirm cascade on a real account — SEC-3.* |
| Onboarding role split (owner→CreateFarm, worker→dashboard) | WIRED | `RootNavigator` `pendingFarmSetup` gate. Backend doesn't *enforce* owner-only on `POST /farms` (ownership is row-level FK, acceptable). |
| Language / theme / notification prefs | PARTIAL | Stored **locally** (AsyncStorage/i18n) only; **not synced to backend** `profiles`. Fine for launch; note it. *Gap A2.* |
| Help / About screens | WIRED | Static content. |

## 2. Farms / Ponds / Members / Cycles / Harvests

| Feature | Verdict | Notes / Evidence |
|---|---|---|
| Farm CRUD | WIRED | `farms.controller.ts`; `boundary jsonb` persists. |
| Farm boundary (map polygon) | PARTIAL | API + entity persist it, but **no map UI** to draw/edit. *Defer or hide.* |
| Farm members: list, add worker (by lookup), remove | WIRED | `farm-members.controller.ts`. |
| Member **role change** | DEAD | `AddMemberDto` only accepts `worker`; no PATCH-role endpoint. *Deferred (D3).* |
| Member **email invitation** (invite a non-user) | PARTIAL | `email.service.sendInviteEmail` exists but **not wired to the farm-member flow**; today the worker must sign up first, then owner adds by lookup. *Gap F1 — acceptable launch limitation.* |
| **Ownership transfer** | DEAD | No endpoint at any layer. *Deferred (post-launch).* |
| Pond CRUD + batch create, archive, delete, `/mine`, aerator fields | WIRED | `ponds.controller.ts`; aerator cols in `AddPondAeratorHp`/`AddPondAeratorCount`. |
| Pond dimension-history | PARTIAL | API + entity + audit table exist; **no screen.** *Hide or defer.* |
| activeFarmStore selected context | WIRED | `activeFarmStore.ts`. |
| Crops/cycle CRUD, close cycle, computed DOC | WIRED | `crops.controller.ts`; `enrichWithDOC`. |
| `pond.activeCycleId` linkage on cycle create | WIRED | `crops.service.ts:68-71`. |
| Crop **harvest action** `PATCH /crops/:id/harvest` | MISMATCH | Backend endpoint exists but FE never calls it — FE uses `POST /harvests` (separate `harvest_records`) instead. Both "work" but intent diverges. *Gap H1 — decide canonical harvest path.* |
| Harvest records CRUD, Harvest plans CRUD + complete | WIRED | `harvests`/`harvest-plans` controllers + screens. |

## 3. Operational logs (the V1 record book — core)

| Feature | Verdict | Notes |
|---|---|---|
| Water quality: log, history, latest, edit/delete, **critical-threshold auto-alert on save** | WIRED | `water-quality.service.ts:28-39` raises alerts. |
| Feed records: log, total | WIRED | `feed-records.controller.ts`. |
| Feed **history** screen | PARTIAL | API+BE support `pondId`/`cropId` filter, but **no dedicated FeedHistory screen found** by the trace. *Gap L1 — verify it exists / build it.* |
| Feeding tray checks | DEAD | Full backend CRUD + entity, **no screen/nav.** *Hide.* |
| Feed products catalogue | WIRED | Read-only `FeedProductsScreen`. |
| Sampling (ABW): log, history, edit/delete | WIRED | |
| Mortality: log, history, edit/delete | WIRED | |
| Chemical / Plankton / Microbiology: log, history, edit/delete | WIRED | `logResources.ts` ↔ per-domain controllers. |
| Treatments: log, history, edit/delete | WIRED | FE has a banned-substance guard; **no matching BE validation** (FE-only guardrail). |
| Disease records (per-crop) + **real library picker** | WIRED | `DiseaseLogScreen` fetches library, renders chip picker — **no hardcoded UUID** (old audit issue fixed). |
| Disease **severity** on log | PARTIAL | FE hardcodes `'Mild'` instead of using the library's `severityLevel`. *Minor — Gap L2.* |
| **Photo upload** (mortality/disease) | PARTIAL | Entities + API accept `images[]`/`photoUrls[]`, but **no image-picker UI** and **no compression**. Blueprint wants ≤800px compression. *Gap L3.* |
| Tasks: create, list, status, delete | WIRED | `TaskListScreen` ↔ `tasks.controller.ts`. |
| Tasks: **assign-to / priority** UI | PARTIAL | Fields exist in API+BE; **no FE form** to set them. *Minor.* |

## 4. Calculators / Simulations / Decision Engines

| Feature | Verdict | Notes |
|---|---|---|
| Calculators with screens: Daily Feed, Cultivation Performance, Free Ammonia (shows BE toxicity band), Product Dosage, Growth&Harvest (composite) | WIRED | `shrimp-calculations.controller.ts`. |
| FCR / ADG / Survival / Expected Harvest / Growth Projection / Biomass / Recommended Feeding Rate | PARTIAL | Backend+API exist; **no dedicated screens** — invoked as helpers inside the composite screens. Acceptable (not orphaned in practice). |
| Calculator Hub, Engines Hub | WIRED | Hub tiles route correctly; `EnginesHub` hides Crop P&L from workers. |
| Simulations: run, list, results, delete | WIRED | `simulations.controller.ts`. |
| Engines: Daily Routine, Feed Advisor, Harvest Timing, Disease Risk, Aeration, Lunar, Crop P&L, Morning Briefing, Measurements | WIRED | Each screen → real backend endpoint. Daily Routine aggregates logs/context (no dedicated engine BE). |
| `capture`, `crop-outcome`, `sim-engine` backend modules | DEAD | Backend exists, **no UI** (internal/pipeline only). *Ignore for launch.* |

## 5. Finance / Inventory / eShop / Reports / Content

| Feature | Verdict | Notes |
|---|---|---|
| Expenses (per-cycle), Cycle P&L | WIRED | `ExpensesScreen` → `finances` module. |
| Transactions (ledger + summary) | WIRED + GUARDED | **Ownership-scoped now** (old IDOR fixed). |
| Financial report (Reports tab) | WIRED | `reports.controller.ts`. |
| Inventory: CRUD, low-stock, **adjust-stock** | WIRED | **FE↔BE fields aligned (`quantity`/`reorderLevel`)**, `/adjust` route wired (old mismatch fixed). |
| Products / eShop | WIRED | `ShopScreen` (browse). |
| Reports: dashboard summary | WIRED (verify) | `HomeScreen` passes a real `farmId` now (old "permanently zero" fixed) — *confirm on device.* |
| Reports: cycle analysis | PARTIAL | API exists + **ownership-scoped**, but **no screen renders it.** *Hide or build.* |
| Reports: charts | PARTIAL (verify) | Chart components exist; confirm they actually render in `ReportsScreen`. |
| News feed | WIRED | `NewsListScreen`. |
| Reference (species/hatchery/broodstock) | PARTIAL | `ReferenceScreen` + API exist; **confirm entities have real DB tables** in the migration chain (trace was unsure). *Gap R1 (verify).* |
| Alerts: list, unread count, mark-read, mark-all, delete | WIRED + GUARDED | All `me`/`userId`-scoped — **no IDOR.** |
| Disease library: browse, search, detail, seed | WIRED | Seed is a backend endpoint + baseline seed migration. |

## 6. Push notifications

| Feature | Verdict | Notes |
|---|---|---|
| Token register (`POST /push/register`) | WIRED | `App.tsx` registers after auth. |
| **Server-side delivery** (Expo) | PARTIAL (verify) | `push.service.ts:37-62` implements **real Expo push delivery**. **Unconfirmed:** does `AlertsService.create*` actually call `push.sendToUser` and flip `is_push_sent`? *Gap E1 — verify end-to-end on a device.* |

## 7. Cross-cutting infrastructure

| Area | Verdict | Notes |
|---|---|---|
| Navigation | WIRED | 4 tabs + center FAB; ~80 stack routes. **No feature-flag system exists** → §8 Gap X1 (add `src/config/features.ts` to hide PARTIAL/DEAD screens). |
| Role gating | PARTIAL-BY-DESIGN | `membershipStore.isWorker/roleForFarm` + backend `FarmAccessService` (capabilities READ / WRITE_OPERATIONAL / OWNER_ONLY). Checks are **ad-hoc per screen**, not a central `usePermissions` hook. Owner/worker only (D3). |
| i18n | WIRED | i18next + AsyncStorage persist; 6 langs. EN ~1391 keys; other langs ~1308 (≈83 keys short, in `feedStats`/`pondSetup`). **Hardcoded English** in local push reminders (`utils/notifications.ts`) + `OfflineIndicator` banner. *Gap X2.* |
| **Offline sync** | ❌ NOT WIRED | `syncStore` queue defined but **`enqueue`/`drainQueue` are never called** by screens, and **nothing drains on reconnect**. `OfflineIndicator` *does* read real NetInfo. Note: **Measurements already have a working idempotent queue** (`measurementSync.ts`, client-minted UUIDs, batch flush) — **generalize this pattern.** *Gap X3 — this is launch-plan D2/OFF-1.* |
| Notifications store | PARTIAL | `notificationStore` is display/badge-only, fed by on-demand `alertsApi.findMine()`. |
| API client | WIRED | Axios, Bearer injection, 401-refresh queue, 15s timeout. **No retry/backoff** beyond refresh. |
| App boot | WIRED | i18n-first, ErrorBoundary, font gate, crypto polyfill for PKCE, auth-init splash. |
| Backend global wiring | WIRED + ⚠️ | Global `JwtAuthGuard` + `ThrottlerGuard` (60/min). **`migrationsRun:false`; `render.yaml` does not run migrations** → §8 Gap X4 (the #1 production risk). Health check `/api/liveness`. |

---

## 8. Consolidated remaining gaps for launch (the real to-do)

Mapped to the workstreams in `UPCHECK_LAUNCH_PLAN.md`. **Verify-or-fix, not build-from-scratch.**

> **Scope (2026-06-16):** every item below is **built to completion** — nothing in-app is hidden or cut. The four external-dependency features (IoT, marketplace checkout, traceability public web, expert consultation) are the only deferrals. See `UPCHECK_LAUNCH_PLAN.md` D9. All UI built to `UPCHECK_DESIGN_SYSTEM.md` (no emojis).

### [P0] Production / must-fix
- **X4 — Migrations don't auto-run** on a fresh DB (`app.module.ts` `migrationsRun`, `render.yaml`). → Plan **DB-1**. *This is the #1 launch risk and the root of the Supabase relink pain.*
- **SEC-1 — anon key lockdown** (not a feature, a gate): prove the client's anon key cannot read/write tables (data flows via NestJS only). → Plan **SEC-1**.

### [P1] Should-fix before launch
- **X3 — Offline writes not queued/drained** (`syncStore` orphaned). Wire core record writes (feed/WQ/sampling/mortality) to enqueue-on-failure + drain-on-reconnect; generalize the working `measurementSync` pattern; add client-UUID idempotency. → Plan **OFF-1…4 / D2**.
- **E1 — Push delivery (verify)**: confirm alert creation actually sends an Expo push + flips `is_push_sent` on a real device. → Plan **PUSH-1**.
- **A1 — Reset-password landing**: add an in-app deep-link screen or change the Supabase redirect. → Plan **AUTH-2**.
- **L3 — Photo capture + compression**: add image pickers for mortality/disease + ≤800px compression before upload. → Plan **PERF-2**.
- **X1 — Feature-flag system**: add `src/config/features.ts` and hide the PARTIAL/DEAD screens below so nothing broken ships.

### [P2] Build to completion (in-app features previously listed as cut)
- **Build the missing UI** for: Farm boundary map, Pond dimension-history, Cycle-analysis report, Feeding-tray-checks. Give each a home in the IA (`UPCHECK_APP_FLOW_AND_SCREENS.md` §6).
- **Build the new in-app features:** Manager & Viewer roles, member invitations (incl. non-users), ownership transfer (OTP-confirmed), rule-based disease diagnosis (symptom matcher), full task module (recurrence/verification), cost-management suite, RLS.
- **`capture` / `crop-outcome` / `sim-engine`** backend modules: either surface a UI or keep as internal pipeline services (no user-facing gap) — decide per module, don't leave a dead route reachable.
- **Defer only (external blockers):** expert consultation, marketplace checkout, IoT dashboard, traceability public web.

### [P3] Minor / polish
- **H1** — pick one canonical harvest path (`PATCH /crops/:id/harvest` vs `POST /harvests`).
- **L1** — confirm/build Feed history screen.
- **L2** — disease-log uses library `severityLevel` instead of hardcoded `'Mild'`.
- Tasks assign-to/priority UI; treatments banned-substance check mirrored server-side.
- **X2 / I18N** — fill the ~83 missing non-EN keys (at least **Telugu 100%** for shipped screens) and replace the hardcoded English in `utils/notifications.ts` + `OfflineIndicator` with `t()`.
- **A2** — (optional) sync language/notification prefs to backend.

### [Verify] On-device (don't assume from code)
- Delete-account cascade (SEC-3) · Dashboard `farmId` non-zero · Reports charts render · Push delivery (E1) · Reference entities have real DB tables (R1).

---

### How to use this file
1. Treat the **Verdict** column as the contract: every WIRED feature gets a quick device smoke-test; every PARTIAL/DEAD feature is **fixed or flag-hidden** (no broken screens ship).
2. Work the §8 gaps in the launch-plan order (`UPCHECK_LAUNCH_PLAN.md` §8).
3. Re-run a trace pass after the fixes and before the fresh-Supabase cutover.
