# Upcheck — Launch Remediation Plan

> **Purpose:** A verified, task-by-task checklist to make the Upcheck app (backend NestJS + Expo/React Native frontend) safe for real farmers in the field. Every item below was found by reading the actual code in `Upcheck-India/Upcheckapp`, not the docs. Feed this file to Claude Code and work top-to-bottom.
>
> **How to use this file:** Each task has a **stable ID** (e.g. `SYNC-1`), a **severity**, an **owner model** (which Claude model should do it), the **exact files**, the **root cause**, the **fix**, and **acceptance criteria**. Do the 🔴 blockers first. Do not start a P1/P2 task until all 🔴 in its area are green.

---

## ✅ Completion status — 2026-07-08

All 19 items implemented, tested, and green: **backend 73 suites / 465 tests** (was 58/414), **frontend 17 suites / 120 tests**, `tsc --noEmit` clean, backend lint clean. New user-facing strings translated across all 6 locales.

| ID | Status | Notes |
|---|---|---|
| AUTH-1 | ✅ | `initialize()` keeps an offline session on transient failure, only `clearSession()` on 401/403; `recoverSession()` re-refreshes on reconnect; client interceptor falls back to persisted refresh token. |
| SYNC-1 | ✅ | Drain outcome is now `done`/`retry`/`failed`; 401/403 → retry (never dropped), 400/422 → parked visibly via `SyncAttentionBanner`. |
| SYNC-2 | ✅ | `id` + insert-or-return-existing guard on all 6 create DTOs/services (mortality collision-guard pattern; disease POST got a missing `OwnershipGuard`). |
| IDOR-1 | ✅ | Access assertion added before the idempotent-return path in water-quality + measurement. |
| SYNC-4 | ✅ | Queued ops stamped with `userId`; drain only replays the active user's ops. |
| PWDVAL-1 | ✅ | Client `passwordPolicy.ts` mirrors the server regex exactly; translated per-rule errors + accurate hint (6 locales). |
| AUTH-2 | ✅ | `POST /auth/supabase/reset-2fa-check` gates reset behind TOTP for 2FA accounts; client signs out the recovery session and routes to the challenge. |
| VALID-1 | ✅ | Physical-range `@Min`/`@Max` on numeric DTOs; ranges documented. |
| DATE-1 | ✅ | Backend `toIstDateString()` for report bucketing; frontend `formatDate` uses `toLocalISODate`. |
| SYNC-3 | ✅ | `MAX_SYNC_RETRIES` cap; poison ops park in `failedOperations`, no infinite ping-pong. |
| AUTH-3 | ✅ | Email removed from hot-path logs; per-request `[AUTH OK]` spam dropped. |
| BANNED-1 | ✅* | Server-updatable `GET /banned-substances` + offline-cached client hydration. *Server-evaluated write-time warning flag deferred (needs a schema column/migration on the just-refactored record services) — fast-follow. |
| AUTH-4 | ✅ | bcrypt-hashed single-use backup codes (+migration), regenerate endpoint, shown once at setup, accepted at challenge. |
| DEEPLINK-1 | ✅* | `ResetPassword`/`TwoFactorChallenge` registered in both nav stacks. *Supabase redirect-allowlist + physical-device handoff = ops verification, not code. |
| OWN-1 | ✅ | OwnershipGuard fails closed (loud error) when `@OwnsResource` is missing. |
| A11Y-1 | ✅* | Labels on core daily-loop icon controls (QuickLog close, avatar, tab +, ErrorBoundary). *`allowFontScaling` large-font QA remains a manual pass. |
| INFRA-1 | ✅ | Prod startup warning when Redis falls back to in-memory (per-instance 2FA/nonce state). |
| CORS-1 | ✅ | Startup throws if `NODE_ENV=production` and `CORS_ORIGIN=*`. |
| OBS-1 | ✅ | `reportError()` seam wired into ErrorBoundary — single wire-point for Sentry/Crashlytics. |
| TEST-1 | ✅ | `offlineLifecycle.test.ts` exercises queue→token-expiry→reconnect→drain→dedupe end-to-end. |

**Deferred (3, all noted above):** BANNED-1 write-time record flag, A11Y-1 large-font QA, DEEPLINK-1 ops verification. Nothing on the launch-critical path.

---

## Model routing — read this first

Two models are referenced. Route each task to the one named in its **Owner** field. Do not swap them.

**Opus 4.8** — use for tasks requiring cross-cutting reasoning, security judgment, auth/session state machines, data-integrity/idempotency invariants, or anything where a wrong fix silently corrupts data or opens a hole. These are the tasks where "looks fixed" and "is fixed" diverge.

**Sonnet 5** — use for mechanical, well-scoped, pattern-copying tasks: adding a validation decorator, mirroring an existing correct implementation into a sibling file, translating strings, widening a regex, adding a `@Min`/`@Max`. The pattern already exists elsewhere in the repo; the job is faithful replication plus tests.

**Rule of thumb:** if the task says "mirror the existing correct pattern from file X into files Y/Z" → **Sonnet 5**. If the task says "decide," "design," "ensure the invariant holds," or touches auth/session/tenancy → **Opus 4.8**.

For every task, regardless of model: **write or update a test before marking it done.** The repo already has 58 backend specs and 14 frontend tests — match that discipline.

---

## Severity legend

| | Meaning |
|---|---|
| 🔴 **BLOCKER** | Will corrupt data or lock users out in normal field use. Do not launch. |
| 🟠 **P1** | High-impact bug or security weakness; ship in launch or the very first patch. |
| 🟡 **P2** | Real issue, contained blast radius; first patch is acceptable. |
| ⚪ **P3** | Hardening / polish; backlog. |

---

## 🔴 BLOCKERS — must be green before launch

### AUTH-1 — Offline cold-start logs the farmer out
- **Severity:** 🔴 BLOCKER
- **Owner:** **Opus 4.8** (session state machine; wrong fix either locks users out or leaves stale sessions live)
- **Files:** `frontend/src/store/authStore.ts` (`initialize()`, ~L165–L185), `frontend/src/api/client.ts` (refresh interceptor)
- **Root cause:** `initialize()` calls `authApi.refresh(refreshToken)` on launch. The `catch` block runs `clearSession()` for *any* failure — including a pure network failure (no `err.response`). A farmer opening the app at a pondside with no signal is exchanged-refresh-fails → dumped to Login → cannot log in offline either.
- **Fix:**
  1. In `initialize()`, distinguish transient network failure (`!err?.response` or timeout) from a real auth rejection (`err.response?.status === 401`). On network failure: **keep** the persisted session/user and enter an "authenticated-but-unverified-session" state so the app is usable offline; retry refresh on next reconnect (hook into the existing `NetInfo` listener in `components/ui/OfflineIndicator.tsx`). Only `clearSession()` on an actual 401.
  2. Audit `api/client.ts` refresh interceptor for the same conflation — it already early-returns on `!error.response`, so confirm the two paths agree.
- **Acceptance:**
  - Launching in airplane mode with a valid stored session keeps the user authenticated and lands on the dashboard (cached), not Login.
  - A genuinely revoked/expired refresh token (server returns 401) still logs the user out.
  - New unit test covering both branches of `initialize()`.

### SYNC-1 — Offline replay silently deletes the farmer's queued records
- **Severity:** 🔴 BLOCKER
- **Owner:** **Opus 4.8** (data-loss invariant; must reason about which failures are safe to drop)
- **Files:** `frontend/src/sync/recordSync.ts` (`replayQueuedOp`), `frontend/src/store/syncStore.ts`
- **Root cause:** `replayQueuedOp` treats **every** 4xx as "permanent → drop." Two failure modes: (a) if the access token expired while offline, the drain gets 401 and **the entire queued backlog is silently discarded** after the UI already said "Saved"; (b) validation/permission rejections vanish with no user notification. `failedOperations` exists but dropped 4xx never lands there.
- **Fix:**
  1. Never drop on **401/403** — these are recoverable (refresh the token, then retry; the client interceptor should refresh, but the drain must not treat auth failure as permanent). On 401, pause the drain, trigger a refresh, resume.
  2. Route true permanent rejections (400/409/422 that aren't the idempotent-duplicate case) into a **visible** `failedOperations` list surfaced in the UI (e.g. a badge on the offline indicator + a "records that need attention" screen), never a silent drop.
  3. Add a **retry cap** (see SYNC-3) so nothing loops forever.
- **Acceptance:**
  - Simulated 401 during drain → queue preserved, token refreshed, records eventually sync.
  - Simulated 422 → op moves to `failedOperations` and is visible to the user; not silently lost.
  - Test covering 401, 403, 422, 500, and network-error during replay.

### SYNC-2 — Duplicate records for 6 of 11 log types on offline replay
- **Severity:** 🔴 BLOCKER
- **Owner:** **Sonnet 5** (mirror the existing correct idempotency pattern; pattern already lives in `feed-records`)
- **Files (backend, add id + dedupe to each):**
  - `backend/src/chemical/chemical.service.ts` + `dto/create-chemical-data.dto.ts`
  - `backend/src/treatments/treatments.service.ts` + `dto/create-treatment.dto.ts`
  - `backend/src/disease/disease.service.ts` (occurrence-record create) + its create DTO
  - `backend/src/plankton/plankton.service.ts` + `dto/create-plankton-data.dto.ts`
  - `backend/src/microbiology/microbiology.service.ts` + `dto/create-microbiology-data.dto.ts`
  - `backend/src/feeding-tray-checks/feeding-tray-checks.service.ts` + its create DTO
- **Reference implementation to copy:** `backend/src/feed-records/*` and `backend/src/sampling/*` — they accept a client-minted `@IsUUID() @IsOptional() id`, and on create do `if (dto.id) { const existing = await repo.findOne({ where: { id: dto.id } }); if (existing) { await assertCanAccessPond(...); return existing; } }`.
- **Root cause:** These 6 create DTOs have **no `id` field**. The frontend `saveRecord()` mints a client UUID for idempotency, but the global `ValidationPipe({ whitelist: true })` in `backend/src/main.ts` **silently strips** the unknown `id`. With no dedupe check, a delivered-but-response-lost request that gets replayed inserts a duplicate. Duplicate treatments/chemical apps corrupt cost reports and the banned-substance audit trail.
- **Fix:** Add optional `@IsUUID() id` to each create DTO, and the insert-or-return-existing guard to each service `create()`, exactly mirroring feed-records. **Include the access check on the existing record** (see IDOR-1 — do it right the first time here).
- **Acceptance:**
  - POSTing the same payload twice with the same `id` returns the same record and does **not** create a second row, for all 6 types.
  - The access check runs on the existing-record return path.
  - One test per service.

### IDOR-1 — Idempotency check leaks cross-tenant records (water-quality, measurements)
- **Severity:** 🔴 BLOCKER (cross-tenant read on the two highest-volume tables)
- **Owner:** **Opus 4.8** (security; must confirm the check is correct, not just present)
- **Files:** `backend/src/water-quality/water-quality.service.ts` (~L30–L34), `backend/src/measurement/measurement.service.ts` (~L43–L46)
- **Root cause:** Both do `if (dto.id) { const existing = findOne(id); if (existing) return existing; }` **before any authorization check**. Any authenticated user who obtains another tenant's record UUID (from logs, exports, screenshots) can POST a create with that id and receive the record back. Exploitability is low (UUIDs) but it is a real cross-tenant read.
- **Reference:** `feed-records`, `sampling`, `mortality` already do this correctly — they call `assertCanAccessPond(userId, existing.pondId, 'WRITE_OPERATIONAL')` (or equivalent) **before** returning the existing record.
- **Fix:** Add the access assertion on the existing-record return path in both services, matching the sibling pattern.
- **Acceptance:**
  - User B POSTing a create with User A's water-quality/measurement record id gets **403**, not the record.
  - User A's own replay still returns their record.
  - Test for both the allowed and denied paths in each service.

### SYNC-4 — Queue survives logout and is not user-scoped (shared-device data leak)
- **Severity:** 🔴 BLOCKER (shared phones are the norm for farm workers in India)
- **Owner:** **Opus 4.8** (identity/attribution correctness across account switches)
- **Files:** `frontend/src/store/authStore.ts` (`logout()`), `frontend/src/store/syncStore.ts`, `frontend/src/sync/recordSync.ts`
- **Root cause:** `logout()` clears the session and Truecaller cache but never clears the sync queue, and queued ops carry no owning-user identity. If user B logs in on user A's device and connectivity returns, A's queued records replay under B's token — mis-attributed (server sets `createdById` from B's token) or 403-dropped (worsened by SYNC-1).
- **Fix (pick one, document the choice):**
  - **Option A (simple, safe):** clear the queue in `logout()` — but only after confirming pending writes have drained, or explicitly warn the user "you have N unsynced records, sync before signing out?"
  - **Option B (better UX):** stamp each queued op with the owning `userId` at enqueue time; `drainRecordQueue` only replays ops whose `userId` matches the currently authenticated user.
- **Acceptance:**
  - After logout, another user's login cannot replay the first user's queued records.
  - If Option A: user is warned about unsynced records before logout completes.
  - Test simulating user-switch with a non-empty queue.

### PWDVAL-1 — Password policy mismatch rejects farmers in untranslated English
- **Severity:** 🔴 BLOCKER (blocks signup for real users, in a language they may not read)
- **Owner:** **Sonnet 5** (mirror the server DTO rule into the client validator + add translations)
- **Files:** `frontend/src/screens/auth/RegisterScreen.tsx` (validate, ~L36–L38; hint text), `frontend/src/i18n/locales/*/auth.ts` (all 6), and cross-check `backend/src/auth/dto/signup.dto.ts`
- **Root cause:** The client validates only `length >= 8` and the hint says "Min 8 characters." The server `SignupDto` requires upper + lower + digit + a special char **from the restricted set `@$!%*?&`**. So `ramukumar123` passes the form then fails server-side with a raw, English, untranslated class-validator message. Also `MyPass#123` fails because `#` is not in the allowed set.
- **Fix:**
  1. Replicate the exact server rule in the client `validate()` with **inline, translated** field errors and an accurate hint, for all 6 locales.
  2. **Coordinate with PWDVAL-2:** widening the special-char set is an Opus decision (see below). Until that lands, the client must match the *current* server set exactly so there are no surprise rejections.
- **Acceptance:**
  - Any password the client accepts is accepted by the server, and vice-versa (parity test against the shared rule).
  - Rejection messages appear translated in all 6 languages.

### AUTH-2 — Password-reset flow bypasses 2FA
- **Severity:** 🔴 BLOCKER (makes 2FA weaker than advertised; ties into AUTH-1's session handling)
- **Owner:** **Opus 4.8** (security; recovery-session + 2FA interaction is subtle)
- **Files:** `frontend/src/screens/auth/ResetPasswordScreen.tsx`, `backend/src/auth/supabase-auth.service.ts` (reset path), `backend/src/auth/supabase-auth.controller.ts`
- **Root cause:** The good `issueSessionOrChallenge` gate covers all four *login* paths — but `ResetPasswordScreen` establishes a live session **directly from the Supabase recovery tokens in the deep-link fragment** (`supabase.auth.setSession`), never touching the backend 2FA gate. An attacker with email access resets the password and is in — no TOTP required.
- **Fix:** After a password update on a **2FA-enabled** account, do not treat the recovery session as fully authenticated. Require the TOTP challenge before issuing an app session (route to `TwoFactorChallenge` using the same temp-token machinery). For non-2FA accounts, behavior is unchanged.
- **Acceptance:**
  - Resetting the password on a 2FA-enabled account still requires a valid TOTP code before reaching the app.
  - Non-2FA accounts reset and enter normally.
  - Test both account types through the reset path.

---

## 🟠 P1 — launch or first patch

### VALID-1 — No numeric range validation on water-quality (and peer log) inputs
- **Severity:** 🟠 P1
- **Owner:** **Sonnet 5** (add `@Min`/`@Max` decorators per parameter; mechanical)
- **Files:** `backend/src/water-quality/dto/create-water-quality-record.dto.ts` and the update DTO; apply the same pass to chemical/plankton/microbiology/sampling/feed DTOs where a physical range exists.
- **Root cause:** Every numeric field is `@IsNumber() @IsOptional()` with **no `@Min`/`@Max`**. A fat-fingered pH of `999` or a negative DO saves cleanly and can trip false "critical" alerts (the alert engine reads these values), eroding trust in alerts.
- **Fix:** Add sane physical bounds per parameter (e.g. pH 0–14, temperature 0–50 °C, DO 0–30 mg/L, salinity 0–60 ppt, etc. — confirm ranges with the domain owner). Keep them permissive enough for legitimate edge readings; the goal is to catch typos, not to reject unusual-but-real values.
- **Acceptance:** Out-of-range values return a translated 400; in-range values save. Range table documented in the DTO.

### DATE-1 — UTC date bucketing shifts pre-5:30-AM-IST readings to the wrong day
- **Severity:** 🟠 P1 (morning DO readings are the classic case)
- **Owner:** **Opus 4.8** (timezone reasoning; must decide the canonical day-boundary policy app-wide)
- **Files:** `backend/src/reports/reports.service.ts` (~L106, `toISOString().split('T')[0]`), `frontend/src/screens/harvest/HarvestPlansScreen.tsx` (~L52). Reference the correct helper already in the repo: `frontend/src/utils/localDate.ts`.
- **Root cause:** These two spots derive the calendar day in **UTC**. Anything logged before 05:30 IST lands on the previous day in reports/plans. The rest of the app uses `localDate.ts`; these missed it.
- **Fix:** Decide and document the canonical policy (recommend: bucket by the farm's local day, IST for launch). Apply consistently server-side; do not mix UTC and local. Replace the two offending derivations.
- **Acceptance:** A reading logged at 02:00 IST appears under that same calendar date in reports and harvest plans. Test with a fixed clock around the boundary.

### SYNC-3 — No retry cap; a poison op ping-pongs between queues forever
- **Severity:** 🟠 P1
- **Owner:** **Sonnet 5** (bounded-retry is a well-scoped mechanical change)
- **Files:** `frontend/src/store/syncStore.ts` (`retryFailed`, `markFailed`, `drainQueue`), `frontend/src/sync/recordSync.ts`
- **Root cause:** `retryFailed()` moves everything from `failedOperations` back into `queue` with no cap. `retryCount` is incremented but never checked. A transiently-failing op cycles indefinitely and can wedge the drain.
- **Fix:** Enforce a max retry count (e.g. 5). On exceeding it, park the op in a terminal "needs attention" state surfaced to the user (coordinate with SYNC-1's visible failed-ops UI). Do not silently drop.
- **Acceptance:** An op that fails N+1 times stops being retried and becomes visible to the user. Test the cap.

### AUTH-3 — Email (PII) logged on every authenticated request
- **Severity:** 🟠 P1 (privacy / log-hygiene; India DPDP considerations)
- **Owner:** **Sonnet 5** (scoped log-level/redaction change)
- **Files:** `backend/src/auth/guards/jwt-auth.guard.ts` (~L57, L60 and the two other `logger.log` calls)
- **Root cause:** The guard logs the user's **email and id on every request** at `log` level in production. High-volume PII in logs.
- **Fix:** Drop email from the hot-path logs; keep at most a user id at `debug` level, or gate behind a verbose flag. Remove the per-request "[AUTH OK]" spam.
- **Acceptance:** No email addresses in production request logs. A test or lint check asserting the guard doesn't log email at `log`/`warn`.

### BANNED-1 — Banned-substance guardrail is client-only; "authoritative backend list" doesn't exist
- **Severity:** 🟠 P1 (regulatory/export-safety feature that can be bypassed and can't be updated without an app release)
- **Owner:** **Opus 4.8** (decide the trust model; this is a compliance feature)
- **Files:** `frontend/src/features/bannedSubstances.ts` (comment claims "the backend list is authoritative and server-updatable" — no such endpoint exists; confirmed no `banned` controller in `backend/src`), `backend/src/treatments/*`, `backend/src/disease/*`.
- **Root cause:** The CAA/MPEDA prohibited-substance matcher runs **only on the client**. There is no backend list, no server-side warning, and no server enforcement. The list can only change via an app update, and the check is trivially bypassable.
- **Fix (decide scope):** At minimum, add a server-updatable banned-substance list endpoint the client hydrates from, so the list can change without a store release. Consider a **server-side** warning flag stamped on treatment/chemical/disease records at write time so the audit trail is authoritative, not client-trusted. Keep it non-directive (never suggests alternatives) per the existing spec note.
- **Acceptance:** The banned list is fetched from the backend and cached offline; records carry a server-evaluated warning flag. Documented as decision-support, not legal advice.

---

## 🟡 P2 — first patch acceptable

### AUTH-4 — No 2FA backup/recovery codes
- **Severity:** 🟡 P2
- **Owner:** **Opus 4.8** (auth recovery flow)
- **Files:** `backend/src/auth/two-factor.service.ts` (entity already has a legacy `backupCodes` column), `backend/src/auth/user.entity.ts`, plus a frontend surface in `settings/TwoFactorScreen`.
- **Root cause:** A farmer who loses the phone with their authenticator is locked out — the only way back in is the password-reset bypass, which AUTH-2 is closing. Once AUTH-2 lands, lockout is total.
- **Fix:** Implement single-use backup codes: generate + display at 2FA setup, store hashed, allow one to substitute for a TOTP code at `2fa/login`, and mark used. **Sequencing:** land this alongside or before AUTH-2 so you don't create a lockout with no recovery path.
- **Acceptance:** Setup shows N one-time codes; each works exactly once at 2FA login; used codes are rejected. Tests included.

### DEEPLINK-1 — Password-reset deep link fragility and wrong-stack routing
- **Severity:** 🟡 P2
- **Owner:** **Opus 4.8** (navigation + external-handoff edge cases)
- **Files:** `frontend/App.tsx` (`linking` config), `frontend/src/navigation/RootNavigator.tsx` (`ResetPassword` is only in the **unauthenticated** stack), `frontend/app.config.ts` (`scheme: upcheckapp`), Supabase redirect allowlist (ops config, not code — `FRONTEND_URL=upcheckapp://`).
- **Root cause:** (a) `ResetPassword` exists only in the signed-out stack, so tapping the reset link **while logged in** does nothing. (b) The Supabase verify URL → custom-scheme handoff needs real-device verification across Gmail / WhatsApp-forwarded links, and `upcheckapp://reset-password` must be in the Supabase redirect allowlist.
- **Fix:** Register `ResetPassword` (or a redirect handler) reachable from both stacks. Verify the handoff on physical Android + iOS. Confirm the redirect allowlist entry.
- **Acceptance:** Reset link opens the reset screen whether or not a session exists; verified on a real device from at least Gmail and WhatsApp.

### OWN-1 — OwnershipGuard fails open when the decorator is missing
- **Severity:** 🟡 P2 (latent footgun, not currently exploited)
- **Owner:** **Opus 4.8** (security default-posture decision)
- **Files:** `backend/src/common/guards/ownership.guard.ts` (~L18–L24: "No decorator means no ownership check required → return true")
- **Root cause:** If a future route adds `@UseGuards(OwnershipGuard)` but forgets `@OwnsResource(...)`, the guard **allows the request**. All current routes are correctly paired (verified), but the default posture is fail-open.
- **Fix:** Consider failing closed (or logging a loud warning) when the guard is applied without the decorator, so a future omission is caught in dev/test rather than shipping an open route.
- **Acceptance:** A guarded route missing its decorator is denied or throws in tests. Existing routes unaffected.

### A11Y-1 — Sparse accessibility labels; no font-scaling respect
- **Severity:** 🟡 P2
- **Owner:** **Sonnet 5** (mechanical prop additions)
- **Files:** `frontend/src/components/ui/*.tsx` (only ~26 `accessibilityLabel`/`accessibilityRole` across the kit; icon-only buttons are silent to TalkBack), and no `allowFontScaling` handling anywhere.
- **Fix:** Add `accessibilityLabel` + `accessibilityRole` to icon-only touchables (QuickLog close, tab bar "+", avatar, back buttons). Verify layouts survive OS-level large-font settings (common on older farmers' phones).
- **Acceptance:** Core daily-loop screens are navigable with TalkBack; large font sizes don't clip critical controls.

---

## ⚪ P3 — hardening backlog

- **INFRA-1 (Sonnet 5):** Document that Redis has an in-memory fallback, so 2FA temp tokens and Truecaller nonce replay protection are **per-instance** — safe on one Render instance, silently broken if scaled horizontally. Add a startup warning when Redis is absent in production.
- **CORS-1 (Opus 4.8):** `backend/src/main.ts` defaults `CORS_ORIGIN` to `*`. Confirm production sets an explicit allowlist; fail loudly if `*` in production.
- **OBS-1 (Sonnet 5):** `ErrorBoundary` only `console.error`s. Wire it to a crash reporter (Sentry/Crashlytics) for field diagnostics.
- **TEST-1 (Opus 4.8):** Add an integration test that exercises the **full offline→online lifecycle** end-to-end (queue while offline, token expiry mid-offline, reconnect, drain, dedupe) — this is the area with the most blockers and the least coverage.

---

## Suggested execution order

1. **Data-loss & lockout first (all Opus except SYNC-2):** AUTH-1 → SYNC-1 → SYNC-4 → IDOR-1 → SYNC-2 (Sonnet) → SYNC-3 (Sonnet).
2. **Signup/auth correctness:** PWDVAL-1 (Sonnet) → PWDVAL-2 special-char widening (Opus, fold into signup DTO) → AUTH-4 backup codes (Opus) → AUTH-2 reset-2FA (Opus). *Do AUTH-4 before/with AUTH-2 to avoid a lockout with no recovery.*
3. **Data quality & privacy:** VALID-1 (Sonnet) → DATE-1 (Opus) → AUTH-3 (Sonnet).
4. **Compliance & edges:** BANNED-1 (Opus) → DEEPLINK-1 (Opus) → OWN-1 (Opus) → A11Y-1 (Sonnet).
5. **Backlog:** P3 items.

## Definition of done (every task)
- Code change matches the referenced correct pattern in-repo where one exists.
- A test is added or updated and passes.
- User-facing strings are translated across all 6 locales (en, hi, ta, te, bn, or).
- No new PII in production logs.
- For auth/tenancy tasks: an explicit allow-case **and** deny-case test.
