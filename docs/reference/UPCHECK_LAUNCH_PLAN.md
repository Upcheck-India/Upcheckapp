# Upcheck — Launch Readiness & Completion Plan

> **Status:** Working plan to take Upcheck from "broad but shallow" to **public launch**.
> **Authoring basis:** `Upcheck_Architecture_UX_Document.docx` (blueprint v1.0, June 2026) reconciled against the *live code* in this repo, plus `AUDIT.md` (2026-06-01 remediation) and the build state verified on **2026-06-16**.
> **Golden rule for this phase:** *Finish and harden what already exists; cut or hide what is half-built. Do not start new feature domains. Provision a clean Supabase project as the last step before launch.*

---

## 0. How to read this document

The blueprint describes the **intended** product (offline-first, 4 roles, MSG91 OTP, WatermelonDB). The code describes the **actual** product. They diverge in important ways. Section 1 **locks the canonical decisions** so engineering stops oscillating between the two. Everything after Section 1 is execution against those locked decisions.

Sequencing is in Section 8. The **fresh Supabase cutover (Section 6) is deliberately last** — per the directive, we finish the full frontend + backend first, then provision a clean database and flip over once.

---

## 1. Canonical decisions (LOCKED for V1 launch)

These resolve every blueprint-vs-code conflict. Where we deviate from the blueprint, the reason is given. **Treat this table as the contract.**

| # | Topic | Blueprint says | We ship at launch | Why |
|---|-------|----------------|-------------------|-----|
| D1 | **Local DB / offline** | WatermelonDB, full offline-first | **No WatermelonDB.** Online-first with a **write-through queue** for poor connectivity (see D2). | Per your directive. WatermelonDB was never integrated; retrofitting it now is a multi-week rewrite and a launch risk. |
| D2 | **Offline behaviour** | All reads/writes hit local SQLite, background sync | **"Resilient online":** reads need network; **writes** that fail offline are queued (`syncStore`) and drained on reconnect. Clear offline banner. | Achievable now. Honours the *spirit* of "don't lose a worker's 6 AM entry" without a local DB. Full offline-first is a post-launch epic. |
| D3 | **Roles** | Owner / Manager / Worker / Viewer (4) | **Build all 4 roles.** Extend `farm_members.role` enum + `FarmAccessService` capabilities + guards + role-adaptive UI. | Scope decision 2026-06-16: complete every in-app feature. Manager (ops oversight) and Viewer (read-only for banks/consultants/insurers) are in scope. |
| D4 | **Auth** | OTP via MSG91 + Supabase Auth | **Keep what exists:** email+password, **email OTP** (Supabase-native), **Google OAuth**, **Truecaller** (phone, India), **TOTP 2FA**. No MSG91. | Already implemented and more robust for India than raw SMS OTP. MSG91 adds DLT cost/complexity with no launch benefit. |
| D5 | **ORM** | Prisma | **TypeORM** (already in use; 20-migration chain). | Prisma was never adopted. TypeORM chain applies cleanly to a fresh DB. |
| D6 | **RLS** | RLS as defense-in-depth on every table | **Build RLS** on all farm-scoped tables, in addition to app-layer guards (`OwnershipGuard` + `FarmAccessService`). Anon key still locked down (D7). | In scope per the completion decision. RLS is the blueprint's defense-in-depth and is in-app buildable. Sequence carefully (after app-layer stable, with per-table tests) to avoid churn. |
| D7 | **Client ↔ Supabase** | n/a | **Client uses Supabase for AUTH ONLY.** All farm data flows through NestJS. The anon key must have **no table read/write grants**. | Independent of D6; verified as a launch gate (Section 5, SEC-1). |
| D8 | **Schema source of truth** | — | **The TypeORM migration chain** in `backend/src/migrations/` is the *only* source of truth. `supabase_setup.sql` is the auth trigger (applied separately). The 3 `frontend/supabase/*.sql` files are **archived/deleted**. | Eliminates the multi-source drift that has been breaking your Supabase connection. |
| D9 | **Launch scope** | Full product | **Complete EVERY in-app feature.** Finish every existing screen to professional quality AND build the remaining in-app blueprint features (4 roles, member invitations, ownership transfer, rule-based disease diagnosis, RLS). **Defer ONLY the 4 external-dependency features** (see below). Nothing is hidden or stubbed for in-app features. | Scope decision 2026-06-16: "build all features, omit none." |
| D10 | **Professional UI** | — | **No emojis anywhere.** Icons only from MaterialCommunityIcons. Every screen passes the Anti-"vibe-coded" checklist in `UPCHECK_DESIGN_SYSTEM.md`. | Directive 2026-06-16: the app must look bank/exporter-grade, not vibe-coded. |

**Deferred — ONLY because they are blocked on external dependencies, not engineering effort:**
1. **IoT sensor integration** — needs sensor hardware + MQTT/gateway infrastructure.
2. **E-commerce marketplace** — needs vendor partnerships + a payment gateway (Razorpay/UPI).
3. **Traceability public web/QR** — needs public hosting infra + batch-certificate pipeline.
4. **Expert consultation network** — needs a recruited expert panel + payment + SLA.

Everything else in the blueprint is **in scope and will be built**.

> **These decisions are locked (2026-06-16).** Everything below assumes them.

---

## 2. Current state — verified snapshot (2026-06-16)

What is actually true today (measured, not assumed):

**Build health** ✅
- Backend `tsc -p tsconfig.build.json --noEmit` → **clean (exit 0)**.
- Frontend `tsc --noEmit` → **clean (exit 0)**.
- `backend/compile_errors.txt` is a **stale artifact from 2026-05-10** — *ignore/delete it.* It does **not** reflect the current tree.
- Per `AUDIT.md`: backend 266/266 + frontend 108/108 tests green; full 20-migration chain applies to a fresh Postgres (33 tables + disease seed).

**What's solid**
- NestJS: ~54 modules, global `JwtAuthGuard`, `OwnershipGuard`/`FarmAccessService` RBAC (owner/worker), Throttler.
- Auth: email/pwd, email OTP, Google, Truecaller (PKCE exchange), TOTP 2FA, refresh, delete-account cascade.
- Data domains with full DB+API+screen: farms, ponds, crops/cycles, water quality, sampling, mortality, chemical/plankton/microbiology, treatments, tasks, calculators (FCR/ADG/SR/daily-feed/cultivation/free-ammonia/product-dosage), reports (financial), simulations, disease library search.
- Frontend: Expo SDK 54, RN 0.81, Zustand (8 stores), i18next (6 languages: en/hi/ta/te/bn/or), ~95 screens, axios client with 401-refresh queue.

**What's fragile or unfinished** (detail + fixes in Sections 3–5)
- 🔴 **Production migrations don't auto-run** (`app.module.ts:120 migrationsRun:false`; `render.yaml` start cmd doesn't run them). A fresh DB = empty schema = every feature fails. **This is the #1 launch risk.**
- 🔴 **5 schema sources** drifting (D8).
- 🟠 **Offline sync is scaffolding** — `syncStore` exists but isn't wired to mutations; `OfflineIndicator` monitors NetInfo but nothing drains the queue.
- 🟠 **Push notifications** — tokens register, but **no server-side delivery** is confirmed wired end-to-end (verify, see PUSH-1).
- 🟠 **Half-wired domains** — News, Products/eShop, Expenses, Transactions UI, Reference UI, Harvest-plans UI, pond dimension-history, inventory field mismatches. Per `AUDIT.md` many were fixed in the remediation passes; **each needs a re-verify or a cut decision** (Section 4).
- 🟠 **Invitations & ownership transfer** — `email.service.sendInviteEmail()` exists but isn't reachable; no ownership-transfer endpoint. (Blueprint features; decide build-vs-defer.)

> The remediation notes in `AUDIT.md` claim many of these were fixed after the audit was written. **Trust but verify** — Section 5 is a verification gate, not a fresh build list.

---

## 3. The Supabase / schema problem (root cause + the fix)

You reported the database connection "facing issues due to multiple migrations." Here is the actual mechanism and the permanent fix.

### 3.1 Why it breaks
There are **five** places that define or mutate schema:

1. `backend/src/migrations/*.ts` — **the real source of truth** (20 files). Applies cleanly to a fresh DB.
2. `supabase_setup.sql` (repo root) — the `handle_new_user()` trigger that mirrors `auth.users → public.users`. **Applied manually in the Supabase SQL editor.** If you forget it on a new project, **signup/login appears to work but no `public.users` row is created**, and every farm query fails its FK. This is almost certainly what "broke the Supabase connection" on relink.
3–5. `frontend/supabase/schema.sql`, `schema-full.sql`, `schema-additions-only.sql` — **legacy, dead** (0 `CREATE TABLE`, 0 `CREATE POLICY`). They confuse contributors and drift from #1.

On top of that, **production never runs migrations** (`migrationsRun:false`, comment literally says *"the database already has the schema"*). That assumption holds for the *current* DB only because it was migrated once by hand. **A new Supabase project violates that assumption.**

### 3.2 The permanent fix (do this regardless of when you cut over)
- **D8:** delete `frontend/supabase/*.sql` (or move to `docs/archive/`). One source of truth = the TypeORM chain.
- Fold `supabase_setup.sql` into the provisioning runbook (Section 6) as a **mandatory, scripted step**, not tribal knowledge. Better: convert the trigger into a checked-in `.sql` under `backend/supabase/` with a one-command apply.
- Make migrations **deterministic on deploy**. Two options:
  - **(Recommended)** Add a release step: `npm run migration:run` (the script already exists, `backend/package.json:24`) as a Render **pre-deploy / release command** against `DATABASE_URL`. Keep `migrationsRun:false` in app boot so app instances don't race.
  - Or flip `migrationsRun:true` and accept boot-time migration (simpler, but multiple instances can race — only safe with a single release worker).
- Add a **startup schema self-check**: on boot, assert a sentinel table (e.g. `farm_members`) exists; if not, **fail fast with a loud log** instead of limping into per-query failures. (New: `backend/src/health/schema-guard.ts`.)

> Migration **naming note:** the baseline is `1700000000000-BaselineSchema.ts` (earliest timestamp, creates all tables) and `1771597711215-InitialSchema.ts` runs *after* it as ALTER-only. The names are misleading but the **order is correct and applies clean** — leave it; just don't rename (renaming re-breaks the chain).

---

## 4. Completion plan for all domains (nothing cut)

**Superseded by the D9 completion decision (2026-06-16): every in-app domain below is BUILT to professional quality, not hidden or cut.** The table now reads as **completion scope + sequencing priority**, not build-vs-cut. A `src/config/features.ts` flag map is still added — but used only to keep a feature dark *while it is being finished*, then flipped on once it passes the design checklist and a device smoke-test. No in-app feature ships hidden at launch. The four external-dependency features (D9 list) are the only exceptions; gate them behind config until their partnerships/hardware exist.

| Domain | Completion action | Notes |
|--------|---------------------------|-----------|
| Water quality, feed, sampling, mortality, chemical/plankton/microbiology, treatments | **Ship** (verify per Section 5) | Core record book — the V1 reason to exist. |
| Crops/cycles, ponds, farms, tasks, calculators, financial report, simulations, disease library | **Ship** (verify) | Working, wired, demoed in `AUDIT.md` remediation. |
| Alerts + threshold auto-alerts | **Ship** | Core safety value; verify IDOR fix + push delivery. |
| Inventory | **Complete** | Verify FE↔BE fields + `/adjust` (INV-1); already reported aligned. |
| Expenses / Transactions / Reports charts | **Complete** | Confirm screens reachable + populated; finish charts. |
| News, Products catalogue, Reference UI, Harvest-plans, Pond dimension-history | **Complete** (build the missing UI / give each a home in the IA) | Each gets a proper screen and nav entry per `UPCHECK_APP_FLOW_AND_SCREENS.md`. |
| Member **invitations** (build full) | **Complete** | Wire `sendInviteEmail` + an SMS/deep-link invite for non-users; keep the existing add-by-lookup too. |
| **Ownership transfer** | **Complete** | Build endpoint + two-step confirm with OTP re-verify (blueprint §13.4) + audit log. |
| **Manager & Viewer roles** | **Complete** | Extend role enum, capabilities, guards, role-adaptive UI (D3). Viewer = read-only for banks/insurers/consultants. |
| **Rule-based disease diagnosis** (symptom matcher) | **Complete** | In-app weighted symptom matcher → ranked diseases (blueprint §16.4). Bundled offline content. |
| **Cost management** | **Complete** | Per-cycle cost + break-even (blueprint §22), building on Expenses/Transactions. |
| **RLS** (defense-in-depth) | **Complete** | Per-table policies + `is_active_member()` helper (blueprint §30); sequence after app-layer is stable, with tests. |
| Offline (resilient online + write-queue, D2) | **Complete** | Wire the write-queue/drain; full local-DB offline-first stays the one item bounded by the no-WatermelonDB decision (D1) — revisit post-launch. |
| Expert consultation, marketplace, IoT sensors, traceability public web | **Defer (external blockers only)** | Gated behind config until expert panel / vendor+payment / hardware+MQTT / public infra exist. The in-app shells may be built but stay dark. |

---

## 5. Workstreams to launch-ready

Organized by area. Each item: what to do + where. **Most are verify-or-fix, not build-from-scratch.** File:line references are starting points — confirm against the live tree.

### A. Production database & deploy (🔴 highest priority)
- **DB-1** Make migrations run on deploy (Section 3.2). *Add release command + startup schema guard.*
- **DB-2** Delete/archive `frontend/supabase/*.sql`; document the auth trigger as a scripted step.
- **DB-3** Verify the **full chain applies to a truly empty Postgres** in CI (spin up a throwaway PG, run `migration:run`, assert table count + disease seed). Make this a CI gate so the chain can never silently break again.
- **DB-4** Confirm `render.yaml` health check path (`/api/liveness`) resolves and is `@Public`. (It is today.) Align the `PLAY_STORE_LAUNCH.md` mention of `/api/health` — both exist; pick one and document it.

### B. Security gates (🔴 must pass before launch)
- **SEC-1 (gates D6/D7)** Prove the **anon key cannot read/write any table**. Test: with only the anon key (no JWT), attempt `select * from farms`, `feed_records`, `users`. All must be denied. If the client ever needs direct table access, you must enable RLS *before* launch — otherwise this is a data breach. **This is the single most important security check.**
- **SEC-2** Re-verify the IDOR fixes from `AUDIT.md` (alerts `me`-scoped, transactions ownership, `reports/cycle/:id/analysis` ownership). Write one e2e test per endpoint proving user B cannot read user A's data.
- **SEC-3** Confirm `deleteAccount` cascade removes Supabase `auth.users` + `public.users` + owned farm data (Play Store requires working deletion; `PLAY_STORE_LAUNCH.md §7`).
- **SEC-4** Confirm no secrets in client bundle (only `EXPO_PUBLIC_*` anon key + URLs). Service-role key must be **backend-only**.
- **SEC-5** Truecaller replay/key store is Redis-backed for multi-instance (per `AUDIT.md` — verify Redis is actually provisioned on Render, else it falls back to in-memory and replay protection breaks).

### C. Auth & onboarding
- **AUTH-1** End-to-end test each path on a **device build** (not just Expo Go): email signup→verify→login, email OTP, Google, Truecaller One-Tap, 2FA challenge, forgot/reset password.
- **AUTH-2** **Reset-password landing**: blueprint/audit flagged Supabase redirects to `/reset-password` which had no screen. Verify a deep-link handler + screen exists, or set the redirect to an in-app route.
- **AUTH-3** Onboarding role split: owner → CreateFarm; worker → dashboard. Verify the `pendingFarmSetup` gate and that a worker with no farm sees a sensible empty state (not a crash).

### D. Offline resilience (D2 — scoped, not full offline-first)
- **OFF-1** Wire `syncStore` to **write mutations** for the core record types (feed, water quality, sampling, mortality): on network failure, enqueue; on reconnect (NetInfo), drain. Show queued-count in the offline banner.
- **OFF-2** Make `OfflineIndicator` reflect real connectivity (audit said it was hardcoded connected — verify it now reads `syncStore.isConnected`).
- **OFF-3** Reads while offline: show cached-last-value where cheap, otherwise a clear "you're offline" empty state. **No silent spinners.**
- **OFF-4** Idempotency: queued writes must carry a client-generated UUID so a double-drain can't create duplicates. (Backend: accept client `id` on insert for these tables, upsert-on-conflict.)

### E. Notifications
- **PUSH-1** Verify Expo push **delivery** end-to-end: token registers (`/push/register`), an alert triggers a real push to a device, `is_push_sent` flips true. `AUDIT.md` says this was built in pass 2 — confirm on a real device with a prod token.
- **PUSH-2** Notification preferences (quiet hours, per-channel) — blueprint §19.2. **Defer** beyond a basic on/off if not already present.

### F. Data-contract & feature verification (from `AUDIT.md` remediation — re-verify)
- **INV-1** Inventory FE↔BE fields aligned + `/adjust` route works (was 🔴).
- **FEED-1** Feed history filter uses the param the backend reads (`pondId`/`cropId` mismatch was 🟠).
- **DIS-1** Disease log uses a **library picker**, not a hardcoded UUID; `severityLevel` field renders.
- **HARV-1** Harvest log/history pass `cropId` (not `cycleId`); harvest-plan payload matches DTO.
- **REP-1** Dashboard summary passes a real `farmId` (was permanently zero).
- For each: a quick manual pass on a device + a render of real data. If broken → fix or hide (Section 4).

### G. Localization
- **I18N-1** Framework is active (en/hi/ta/te/bn/or). **Per-string coverage is a content task.** For launch (blueprint §10.1 = en + te), ensure **English and Telugu** are 100% covered for all *shipped* screens; other languages fall back to English (acceptable). Run a key-coverage diff per language and log gaps.
- **I18N-2** No hardcoded user-facing string literals on shipped screens (spot-check the core flow).

### H. Low-end device & UX polish (blueprint §11.4)
- **PERF-1** Cold start < 3s on a 2GB device; skeletons not spinners on the home/record screens.
- **PERF-2** Image compression on upload (≤800px) before Supabase Storage — verify it exists for mortality/disease photos.
- **PERF-3** No heavy charts on the primary worker flow.

### I. Test & CI hardening
- **TEST-1** Fix the two flaky `TruecallerLoginScreen` suites (fake timers) and the stale `crops.service.spec` if still failing.
- **TEST-2** Add the CI gates: backend+frontend `tsc`, unit tests, and the **fresh-DB migration apply** (DB-3). Block merge on red.
- **TEST-3** One happy-path e2e per role on the core record-book flow.

---

## 6. Fresh Supabase project — cutover runbook (DO LAST)

Execute **only after Sections A–I are green** and the app is feature-complete on the current/staging DB. The goal: a pristine project with zero migration cruft, cut over once, with rollback.

**Pre-flight**
1. Section 5 gates A, B, F green on staging.
2. `frontend/supabase/*.sql` archived (DB-2). One source of truth confirmed.
3. The trigger SQL (`supabase_setup.sql`) is scripted and idempotent.

**Provision (clean project)**
4. Create the **new Supabase project**. Record: project URL, anon key, service-role key, **direct + pooled `DATABASE_URL`**.
5. **Lock down the anon role** (gate D7/SEC-1): ensure anon/`authenticated` have **no grants** on application tables. Verify with a token-less query — must be denied.
6. Run the **full migration chain** against the new `DATABASE_URL`: `cd backend && DATABASE_URL=... npm run migration:run`. Assert: expected table count (≈33) + disease seed rows present.
7. Apply the **auth trigger** (`supabase_setup.sql`) in the new project. Test: create a throwaway auth user → confirm a `public.users` row appears. **If this step is skipped, login silently produces orphaned auth users — this was the original breakage.**
8. Configure Supabase Auth in the new project: email templates, **OAuth providers (Google)**, redirect URLs (incl. the reset-password route from AUTH-2), OTP settings, allowed redirect origins.
9. Storage: recreate buckets used (mortality/disease photos, avatars) with the same names + access policy.

**Wire the apps to the new project**
10. Backend (Render): set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `JWT_SECRET`, Redis URL. Add the `migration:run` release step (DB-1).
11. Frontend (EAS): set `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_BASE_URL`, Google client IDs, Truecaller client ID (production values).

**Smoke test on the new project (staging build)**
12. Full auth matrix (AUTH-1) against the new project.
13. Create farm → pond → cycle → log feed/water/sampling/mortality → see it in history → trigger a threshold alert → receive push (PUSH-1).
14. Delete-account cascade (SEC-3) against the new project.
15. Offline write → reconnect → drain → no duplicate (OFF-4).

**Cut over**
16. **No production users yet (CONFIRMED 2026-06-16) → start clean. Do NOT migrate any data.** Provision the new project, run the migration chain + auth trigger (steps 6–7), and the new DB *is* the production DB. The only seed data is the disease library (already in the chain) + any reference rows. This removes the entire pg_dump/restore/dependency-ordering risk.
17. Flip prod env vars → new project. Keep the old project **read-only, untouched, for 2 weeks** as rollback (it costs nothing and removes all pressure).
18. Tag the release. Monitor logs for the schema-guard assertion (DB-1) and FK errors.

> **Rollback:** revert env vars to the old project. Because we never destructively touched it, this is instant.

---

## 7. Post-launch roadmap (only what is genuinely blocked or out of scope)

Per D9, the bulk of the blueprint is now **in the launch build**. Only these remain after launch:

1. **IoT sensor integration** (§26) — blocked on hardware + MQTT/gateway infra.
2. **E-commerce marketplace** (§23) — blocked on vendor partnerships + payment gateway (Razorpay/UPI).
3. **Traceability public web/QR** (§25) — blocked on public hosting + certificate pipeline.
4. **Expert consultation network** (§16.5) — blocked on a recruited expert panel + payment + SLA.
5. **True offline-first** (full local-DB) — bounded by the no-WatermelonDB decision (D1); the D2 write-queue is the launch bridge. Revisit a local store later.
6. **Additional languages** beyond English + Telugu (ta → or → bn → gu → hi polish) — a translation-content task, shipped as coverage completes.

WhatsApp notifications (§19) are built to the opt-in level in scope; full WhatsApp Business automation can follow once the provider account is live.

---

## 8. Sequenced execution (the order to actually work in)

1. **Stabilize the truth.** Delete `compile_errors.txt`; archive stray SQL (DB-2); add CI gates (TEST-2, DB-3). *Now the tree can't silently rot.*
2. **Production DB path** (DB-1, DB-4) on staging. *Without this nothing survives a fresh DB.*
3. **Security gates** (SEC-1…SEC-5). *Non-negotiable; SEC-1 first.*
4. **Verify-or-cut the half-wired domains** (Section 4 + workstream F). Decide flags. *Shrinks surface to what's real.*
5. **Auth + onboarding on device builds** (AUTH-1…3).
6. **Offline writes + push** (OFF-1…4, PUSH-1).
7. **i18n en/te coverage + perf polish** (I18N, PERF).
8. **Full regression on staging** (TEST-3).
9. **Fresh Supabase cutover** (Section 6) — start clean if pre-launch.
10. **Play Store submission** (Section 9).

---

## 9. Play Store launch checklist (from `docs/PLAY_STORE_LAUNCH.md`)

App ID `com.upcheck.app` · v`1.0.0` · EAS `f3274022-ae8a-4be6-9085-23f935542a4c`. Blockers:

- [ ] **Restricted permissions** stay stripped (CALL_LOG/SMS) — *do not run `expo prebuild` without re-stripping* (Truecaller plugin re-injects them). Sanity-check `RECORD_AUDIO`/`SYSTEM_ALERT_WINDOW`.
- [ ] **Privacy Policy URL** + **Data Deletion URL** hosted publicly and entered in Play Console (`docs/legal/*.md`).
- [ ] **Data Safety form** completed to match `PRIVACY_POLICY.md` (table in the launch doc).
- [ ] **Account deletion** verified in-app (Profile → Delete Account) — see SEC-3.
- [ ] **Target SDK** meets Play's current minimum; build signed **AAB**: `eas build -p android --profile production`.
- [ ] **Play App Signing SHA-1 registered with Truecaller console** (else Truecaller One-Tap breaks in the released build). *Known blocker from prior sessions.*
- [ ] **Partner key / EAS release signing** finalized. *Known blocker from prior sessions.*
- [ ] All **production env vars** set for the build (API base URL, Supabase, Google, Truecaller) — pointing at the **new** Supabase project.
- [ ] Content rating questionnaire (expected Everyone/PEGI 3).
- [ ] Store listing copy + icon (512²) + feature graphic (1024×500) + 2–8 screenshots.
- [ ] Production backend reachable; health check green; **migrations applied on deploy** (DB-1).
- [ ] Internal-testing track smoke test + reviewer test credentials (app is login-gated).

---

## 10. Launch gate — Definition of Done

**Do not submit until all are true:**

- [ ] Backend + frontend `tsc` clean; unit tests green; **fresh-DB migration apply passes in CI** (DB-3).
- [ ] **SEC-1 passes** — anon key cannot touch any table (D7).
- [ ] IDOR e2e tests pass for alerts/transactions/cycle-analysis (SEC-2).
- [ ] Every nav entry leads to a **working** screen with real data, or is flag-hidden (Section 4). No broken/empty mystery screens.
- [ ] Full auth matrix works on a **signed device build** against the **new Supabase project** (AUTH-1).
- [ ] Core record-book flow works end-to-end for both owner and worker, **including an offline write that drains without duplicating** (OFF-4).
- [ ] Push delivered to a real device (PUSH-1).
- [ ] Account deletion cascade verified (SEC-3).
- [ ] English + Telugu cover all shipped screens (I18N-1).
- [ ] Play Store blockers (Section 9) cleared.
- [ ] Old Supabase project retained read-only for rollback.

---

### Appendix — key file references

- Migration runner config: `backend/src/app.module.ts:84,119-120`; `backend/typeorm.config.ts:10`; scripts `backend/package.json:23-24`; deploy `backend/render.yaml`.
- Auth trigger: `supabase_setup.sql` (root) — `handle_new_user()`.
- Stray SQL to archive: `frontend/supabase/{schema,schema-full,schema-additions-only}.sql`.
- RBAC: `backend/src/common/guards/ownership.guard.ts`, `backend/src/farm-access/farm-access.service.ts`, `farm-member.entity.ts`.
- Offline: `frontend/src/store/syncStore.ts`, `frontend/src/components/ui/OfflineIndicator.tsx`.
- Stale artifact to delete: `backend/compile_errors.txt` (dated 2026-05-10; not current).
- **Current feature inventory:** `UPCHECK_FEATURE_MATRIX.md` (code-derived, 2026-06-16) — **the authoritative verification checklist**; supersedes the two below.
- **Design & UX:** `UPCHECK_APP_FLOW_AND_SCREENS.md` (flow/IA/screens) and `UPCHECK_DESIGN_SYSTEM.md` (binding professional UI standard — no emojis, MaterialCommunityIcons, Anti-"vibe-coded" checklist).
- Prior audits: `AUDIT.md` (remediation log — partly outdated, most "broken" items now fixed), `FEATURES.md` (stale/aspirational), `docs/PLAY_STORE_LAUNCH.md`.
