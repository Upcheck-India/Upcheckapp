# Upcheck — Latest Task List (Implementation-Ready)

> **Last updated:** 2026-07-09
> **Built from:** `docs/USER_PERSPECTIVE_PRODUCT_ANALYSIS.md` (farmer-persona findings, Part 2 ranked table), cross-checked against `docs/APP_STATUS.md`, `REMEDIATION_STATUS.md`, `LAUNCH_REMEDIATION.md`, `docs/I18N_TELUGU_TODO.md`, `docs/PLAY_STORE_LAUNCH.md`, `docs/OPERATIONS.md`, and a direct check of OTA config (§0 below).
>
> **⚠️ Maintenance instruction:** This list is a snapshot for active implementation, not an archive. Whenever a task is started, blocked, or finished, update its **Status** cell and add a one-line note in §6 History. When `docs/APP_STATUS.md` or `REMEDIATION_STATUS.md` change, re-sync this file's open items against them the same day — don't let two trackers disagree about what's actually open. If you're an AI agent picking up a task: **do not start coding from this row alone** — every task below names the source doc(s) with the full context (root cause, file paths, acceptance criteria); open and read those first, this file is a router, not a spec.

---

## 0. OTA (EAS Update) configuration check — done, result: ✅ properly configured

Verified directly against the frontend config (not just docs):

| Check | Result |
|---|---|
| `expo-updates` package installed | ✅ `frontend/package.json` — `expo-updates: ~29.0.16` |
| `runtimeVersion` set | ✅ `frontend/app.config.ts` — `"1.0.0"` |
| `updates.url` set to this EAS project | ✅ `https://u.expo.dev/f3274022-ae8a-4be6-9085-23f935542a4c` (matches `eas.json` project + `docs/OPERATIONS.md`) |
| Native Android manifest has the update meta-data (bare workflow — `android/` is committed, so this must be present, not just implied by config) | ✅ `frontend/android/app/src/main/AndroidManifest.xml`: `expo.modules.updates.ENABLED=true`, `EXPO_UPDATE_URL` matches, `EXPO_UPDATES_CHECK_ON_LAUNCH=ALWAYS`, `EXPO_UPDATES_LAUNCH_WAIT_MS=0` |
| Runtime version string resource matches `app.config.ts` | ✅ `frontend/android/app/src/main/res/values/strings.xml` → `expo_runtime_version = 1.0.0` |
| EAS channels defined per profile | ✅ `frontend/eas.json` — `development`/`preview`/`production` channels present |

**Conclusion: OTA is live and correctly wired for Android.** No action needed here. Two things worth remembering, not fixing:
- `docs/PLAY_STORE_LAUNCH.md` warns: if anyone runs `expo prebuild` again, the Truecaller plugin re-injects stripped permissions — re-check the manifest (including these updates meta-data lines) after any prebuild regeneration.
- OTA only ships JS-only changes. Any native change (new native dep, SDK bump) requires bumping `runtimeVersion` and cutting a new store build — OTA cannot cross that boundary (`docs/OPERATIONS.md` §3).

---

## 1. How to use this list

- **Status values:** `Not started` / `In progress` / `Blocked` / `Done`.
- **Refer-to column:** always read these before touching code — they carry the actual root cause, file paths, and acceptance criteria. This file intentionally does not repeat that detail, to avoid the two docs drifting out of sync.
- **Ordering:** tasks are pre-sorted by the priority ranking from `docs/USER_PERSPECTIVE_PRODUCT_ANALYSIS.md` Part 2 (impact × recurrence-likelihood), with OTA/infra checks and Play Store blockers folded in where they compete for the same "next work" slot.
- **Do this before starting any task below:** confirm the task isn't already stale — check `docs/APP_STATUS.md` §5 (confidence caveats) and §6 (recent history) for whether independent verification already happened since this file was last updated.

---

## 2. 🔴 Do first — trust-critical, blocks everything else

| # | Task | Why it's #1 priority | Refer to (read first) | Status |
|---|---|---|---|---|
| 1 | **Independently verify offline-sync data-loss / shared-device fixes** (`SYNC-1`, `SYNC-4`). Write/extend an integration test that force-fails a token refresh mid-drain with a non-empty queue; assert zero data loss and correct per-user attribution when two users share one device. | Highest-consequence finding in the whole product — if this regresses, farmers silently lose logged data and don't know it. Currently only self-reported as fixed, never independently re-verified. | `docs/USER_PERSPECTIVE_PRODUCT_ANALYSIS.md` §Part 1.5 and Part 2 row #1; `docs/APP_STATUS.md` §5; root cause + acceptance criteria in `LAUNCH_REMEDIATION.md` (`SYNC-1`, `SYNC-4`); existing test `frontend/src/**/offlineLifecycle.test.ts` | **✅ Done — 2026-07-09** (see §7 for findings + verification log) |
| 2 | **Independently verify UTC-vs-IST day-boundary bucketing** (`DATE-1`). Add/confirm a fixed-clock test around the 00:00–05:30 IST window for reports and harvest plans. | Misattributes exactly the readings that matter most (pre-dawn DO crashes) — invisible to the farmer, corrodes report trust silently. | `docs/USER_PERSPECTIVE_PRODUCT_ANALYSIS.md` Part 1.4, Part 2 row #7; `LAUNCH_REMEDIATION.md` `DATE-1`; also cross-check Session 6's DOC 1-based convention change noted in `docs/APP_STATUS.md` §7 didn't regress this | **✅ Done — 2026-07-09** (see §7) |
| 3 | **Independently verify password/signup validation client↔server parity** (`PWDVAL-1`). Add a parity test: any password the client accepts, the server accepts, and vice versa, across all 6 locale error strings. | First-90-seconds failure in a language the farmer may not read; directly costs signups. Cheap insurance, high visibility if wrong. | `docs/USER_PERSPECTIVE_PRODUCT_ANALYSIS.md` Part 1.2, Part 2 row #6; `LAUNCH_REMEDIATION.md` `PWDVAL-1` | **✅ Done — 2026-07-09** (see §7) |
| 4 | **Regression-test the two historically "dead button" flows**: Inventory Add-Item (real create, not a stub `Alert.alert`) and Harvest mark-complete (state transition + appears correctly in Reports). Do this on every release going forward, not just once. | These were previously completely non-functional — the fastest way to make a farmer conclude "this app is fake." | `docs/APP_STATUS.md` §4 ("What's broken"); `docs/USER_PERSPECTIVE_PRODUCT_ANALYSIS.md` Part 1.8, Part 2 row #9; `REMEDIATION_STATUS.md` rows #28/#29/#86 | **✅ Done — 2026-07-09** (see §10) |

---

## 3. 🟠 Do next — real product/UX wins, no dependency on #2's verification work

| # | Task | Why it matters | Refer to | Status |
|---|---|---|---|---|
| 5 | **Add "quick mode" to daily logging forms** — 2–3 headline fields visible by default (e.g. pH/DO/temp for water quality), rest behind an "add more" expander; smart pre-fill of slow-changing fields (alkalinity, hardness) from last entry. | Root-cause fix for logging fatigue — the #2 systemic issue behind trustworthy decision-engine output (see #8 below). Directly determines whether farmers keep using the app past week 2. | `docs/USER_PERSPECTIVE_PRODUCT_ANALYSIS.md` Part 1.3, Part 2 row #2 and the "cross-cutting theme" section; field lists per log type in `docs/APP_FLOW.md` §5 | **✅ Done (right-sized) — 2026-07-09** — see §11 for what was changed vs. deliberately left alone, and why |
| 6 | **Surface a data-completeness indicator on decision-engine outputs** (Feed Advisor, Disease Risk, Harvest Timing, Lunar), e.g. "based on N of last 7 days logged." | A confident-looking recommendation built on gappy data is more dangerous than no recommendation — farmers act on confident UI. Compounds directly with task #5. | `docs/USER_PERSPECTIVE_PRODUCT_ANALYSIS.md` Part 1.6, Part 2 row #8; engine list in `docs/APP_FLOW.md` §7 | **✅ Already done, now verified — 2026-07-11** (see §12) |
| 7 | **Let onboarding land on a real dashboard after pond #1**, instead of gating on all N ponds being fully configured before Home is reachable. Queue "finish setting up your other ponds" as a dismissible nudge. | Farmers drop off mid-setup on pond 2+ before ever seeing app value, especially on slow/shared phones. | `docs/USER_PERSPECTIVE_PRODUCT_ANALYSIS.md` Part 1.2, Part 2 row #4; onboarding flow in `docs/APP_FLOW.md` §2 | **✅ Done — 2026-07-11** (see §13) |
| 8 | **Complete banned-substance server-evaluated write-time flag** on treatment/chemical/disease records (needs a schema migration). Currently explicitly deferred, not fixed. | Compliance feature with real blast radius (export shipment rejection) if a stale client cache gives false confidence. Highest-consequence *currently-open* item in the whole backlog. | `docs/APP_STATUS.md` §5 and §6 table; `docs/USER_PERSPECTIVE_PRODUCT_ANALYSIS.md` Part 1.7, Part 2 row #5; `LAUNCH_REMEDIATION.md` `BANNED-1` (root cause + fix scope) | **✅ Done — 2026-07-11** (see §14) |

---

## 4. 🟡 Do soon — trust/polish items, lower blast radius

| # | Task | Why it matters | Refer to | Status |
|---|---|---|---|---|
| 9 | **Complete authentic (human, not machine) translations** for `diagnose.*`, `finance.breakEven*`, `reports.cycleAnalysis*`, `ponds.dimHistory*`, `logs.feedingTray_*`, `auth.reset*`, `home.worker*`, `members.*`, `content.tasks.*` — Telugu first, per the existing phasing plan. | Two of these fallback surfaces (**diagnose**, **finance**) are the highest-stakes screens in the app; partial translation reads as broken, worse than English-only. | `docs/I18N_TELUGU_TODO.md` (full key list + phasing note); `docs/USER_PERSPECTIVE_PRODUCT_ANALYSIS.md` Part 1.9, Part 2 row #3 | Not started |
| 10 | **Real device accessibility QA pass** at 150%/200% OS font scale on the 5 daily-loop screens (Home, QuickLog picker, Water Quality log, Feed log, Alerts) + TalkBack navigability check. | Named persona constraint ("older farmer's phone") already identified but never closed — code-side labels landed, device QA didn't. | `docs/APP_STATUS.md` §6 table (`A11Y-1`); `docs/USER_PERSPECTIVE_PRODUCT_ANALYSIS.md` Part 2 row #10; `LAUNCH_REMEDIATION.md` `A11Y-1` | Not started |
| 11 | **Settle "crop" vs "cycle" terminology** to one term across frontend strings (recommend "crop" — matches farmer vocabulary) and enforce via lint/convention doc. Also confirm brand name spelling is consistently "Upcheck" everywhere. | Small, but a literate-but-non-technical farmer notices this kind of inconsistency and reads it as "not a serious product." | `docs/USER_PERSPECTIVE_PRODUCT_ANALYSIS.md` Part 2 row #11; `REMEDIATION_STATUS.md` rows on terminology/brand-naming (search "crop vs" / "brand naming") | Not started |
| 12 | **Decide and act on dark mode**: either finish wiring the existing dark color-role palette across all 118 screens, or remove the dead code. | Currently neither shipped nor deleted — dead code sitting in a farmer-facing app invites confusion for future contributors and is wasted bundle weight either way. | `docs/APP_STATUS.md` §3 ("What's bad") | Not started |

---

## 5. Play Store / infra — parallel track, not blocking the product work above

| # | Task | Refer to | Status |
|---|---|---|---|
| 13 | Provision Android upload keystore via `eas credentials` (external/ops, cannot live in-repo) | `docs/PLAY_STORE_LAUNCH.md` §3; `docs/APP_STATUS.md` §6 | Open — external |
| 14 | Replace fragile Truecaller patched-fork dependency with a real package/TurboModule | `docs/APP_STATUS.md` §3, §6; `REMEDIATION_STATUS.md` row #194 | Open — external |
| 15 | Wire frontend crash reporting: install `@sentry/react-native`, set `EXPO_PUBLIC_SENTRY_DSN` (backend Sentry already wired) | `docs/APP_STATUS.md` §6 table; `REMEDIATION_STATUS.md` Session 4 note | Not started |
| 16 | Complete remaining Play Store checklist items: Data Safety form, signed AAB upload, store listing copy/assets, internal-testing pass | `docs/PLAY_STORE_LAUNCH.md` §§2,5,6,7 (full checklist) | In progress |
| 17 | Plan Render backend plan upgrade (currently free tier — cold starts) and Redis promotion to a real shared instance before any horizontal scaling of backend replicas (2FA/nonce state is per-instance today) | `docs/APP_STATUS.md` §3 | Not started |
| 18 | Backend lint cleanup (non-blocking today, tracked debt) | `docs/APP_STATUS.md` §3; `REMEDIATION_STATUS.md` completion header | Not started |

---

## 7. Task 1 — completion notes (SYNC-1 / SYNC-4 independent verification)

**Completed:** 2026-07-09 · **Status:** ✅ Done · **Verdict: the self-reported fix holds up under independent re-verification — no regression found.**

**What was checked (code read, not just docs):**
- `frontend/src/sync/recordSync.ts` — `saveRecord()` stamps the queued op with the *real* logged-in user's id (`useAuthStore.getState().user?.id`) at enqueue time; `replayQueuedOp()` classifies 401/403 as `'retry'` (never `'failed'`/dropped).
- `frontend/src/store/syncStore.ts` — `drainQueue(handler, currentUserId)` filters `opsToProcess` to `!currentUserId || !op.userId || op.userId === currentUserId` *before* calling the handler — a mismatched-owner op is never even attempted, let alone dropped or mis-attributed. Retry-cap (`MAX_SYNC_RETRIES`) and connectivity-drop handling (`if (!get().isConnected) break`) confirmed to not burn retry budget on pure connectivity flaps.
- `frontend/src/store/authStore.ts` — confirmed `logout()`/`clearSession()` do **not** call `useSyncStore.clearQueue()`. This is the team's documented **Option B** choice from `LAUNCH_REMEDIATION.md` (per-op ownership filtering over queue-wipe-on-logout) — verified it is actually implemented this way in code, not just claimed.

**Gap found and closed:** the existing test `frontend/src/sync/__tests__/offlineLifecycle.test.ts` covered the single-user "token expired while offline" case, and `recordSync.test.ts` covered user-filtering only at the *raw store* level (calling `syncStore.drainQueue()` directly with hand-built ops). Neither test exercised the **full real-world combination** the audit's own acceptance criteria called for: a genuine shared-device user-switch (via the real `useAuthStore`) *combined with* a mid-drain token-expiry, going through the actual production call path (`saveRecord()` → `drainRecordQueue()` → `syncStore.drainQueue()`).

**Action taken:** extended `frontend/src/sync/__tests__/offlineLifecycle.test.ts` with a new test — `'shared-device + expired-token combo...'` — that:
1. Logs in as `worker-A` (real `useAuthStore.setState`), goes offline, saves a water-quality reading → queued and stamped `userId: 'worker-A'`.
2. Switches the logged-in user to `worker-B` (phone handed over) *before* reconnecting.
3. Reconnects and drains as `worker-B` — asserts **no network request is even attempted** for A's op, the op is neither lost nor mutated, and A's retry budget is untouched.
4. Hands the phone back to `worker-A`, simulates the classic token-expired-while-offline 401 on first drain — asserts the record is preserved (not dropped), matching the original single-user test's guarantee.
5. Token refreshes, final drain delivers A's original reading exactly once, correctly attributed, with no duplicate POST.

**Result:** both the pre-existing 1-test suite and the new 2nd test pass (`npx jest src/sync/__tests__/offlineLifecycle.test.ts` → 2/2 passed; full `src/sync src/store` sweep → 4 suites / 22 tests passed, no regressions).

**Conclusion for `docs/APP_STATUS.md` §5:** `SYNC-1` and `SYNC-4` can be moved from "self-reported, needs independent verification" to **"independently verified, combined-scenario test coverage added"**. Recommend updating `docs/APP_STATUS.md` §5 accordingly in the next status-doc pass.

---

## 8. Task 2 — completion notes (DATE-1 independent verification: UTC-vs-IST day bucketing)

**Completed:** 2026-07-09 · **Status:** ✅ Done · **Verdict: the self-reported fix holds up — no UTC-day-boundary regression found — but the report-generation code path itself was untested; that gap is now closed.**

**What was checked (code read, not just docs):**
- `backend/src/common/ist-date.ts` — the shared `toIstDateString()` helper applies a fixed `+5:30` offset before deriving the date string, with its own boundary-crossing test suite (`ist-date.spec.ts`) already covering the exact 00:00–05:30 IST window from the original bug report.
- `backend/src/reports/reports.service.ts:119` — `getCycleAnalysis()`'s `growthChart` mapping calls `toIstDateString()` on each sampling — confirmed the *actual* consumer uses the shared helper, not a re-derived UTC split.
- `backend/src/feed-records/feed-records.service.ts:242` — `getDailyFeedUsage()` also uses the shared helper, not a `setHours()`-based UTC window (the other historically-broken spot per the audit).
- `frontend/src/screens/harvest/HarvestPlansScreen.tsx` — confirmed it imports and uses `todayLocalISODate`/`toLocalISODate` from `frontend/src/utils/localDate.ts` (device-local getters, not `toISOString()`), which already has its own boundary test in `frontend/src/utils/__tests__/localDate.test.ts`.
- Grepped the whole repo for any remaining raw `toISOString().split('T')[0]` / `setHours(0,0,0,0)` calendar-day derivations outside the two known-fixed spots — found none; all remaining `toISOString()` usages are instant timestamps (e.g. health-check payloads), not calendar-day buckets.

**Gap found and closed:** `backend/src/reports/reports.service.spec.ts` was a one-line stub (`it('should pass', ...)`) — the pure `toIstDateString()` helper had a real test, but the actual report code path that calls it (`getCycleAnalysis`) had **zero** coverage, so a future regression (e.g. someone "simplifying" the mapping back to `new Date(s.samplingDate).toISOString().slice(0,10)`) would not be caught by any test.

**Action taken:** replaced the stub with two real tests instantiating `ReportsService` directly (mocked collaborators) and asserting `getCycleAnalysis()`'s `growthChart[0].date`:
1. A sampling at `2026-06-16T20:30:00.000Z` (= 2026-06-17 02:00 IST) must bucket to `'2026-06-17'`, not the naive-UTC `'2026-06-16'`.
2. A sampling already on the same IST/UTC day buckets correctly as a sanity check.

**Result:** `backend/src/reports/reports.service.spec.ts` 2/2 passing; full backend suite re-run clean (78 suites / 514 tests, up from the 498-test baseline — the +16 comes from this task's 2 new tests plus Task 3's parity tests below).

**Conclusion for `docs/APP_STATUS.md` §5:** `DATE-1` can be moved from "self-reported, needs independent verification" to **"independently verified — helper, both consumer code paths, and frontend harvest-plans path all confirmed correct; report-service test gap closed."**

---

## 9. Task 3 — completion notes (PWDVAL-1 independent verification: client↔server password parity)

**Completed:** 2026-07-09 · **Status:** ✅ Done · **Verdict: the two independently-written implementations do agree — confirmed empirically, not just by comment — across 15 edge cases including several neither side's original test set covered.**

**What was checked (code read, not just docs):**
- `backend/src/auth/dto/signup.dto.ts` — `SignupDto.password` uses `@MinLength(8)` + `@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)`. Notably the special-character set is **already the broadened "any non-alphanumeric" set**, not the older restricted `@$!%*?&` set the original finding described — confirming `PWDVAL-2` (the follow-on widening decision) was also completed, not just `PWDVAL-1`.
- `frontend/src/features/passwordPolicy.ts` — `passwordPolicyError()`/`isPasswordValid()` implement the same 4 rules as **discrete, independent regex tests** (a structurally different implementation from the backend's single combined lookahead regex) — meaning the two sides can silently diverge without either side's own unit test noticing, since each only tests its own logic against its own examples.
- `frontend/src/screens/auth/RegisterScreen.tsx` and `frontend/src/screens/auth/ResetPasswordScreen.tsx` both import and call the shared `passwordPolicyError()` — confirmed the fix covers **both** signup and password-reset, closing the adjacent audit row (#171) about `ResetPassword` previously only checking `length < 8`.

**Gap found and closed:** both existing tests (`frontend/src/features/__tests__/passwordPolicy.test.ts` and `backend/src/auth/dto/signup.dto.spec.ts`) only asserted each side's own regex against a handful of hand-picked examples — neither proved the two sides *agree with each other* on the same input, which is the literal acceptance criteria ("any password the client accepts is accepted by the server, and vice versa"). A future edit to either side's regex (e.g. tightening the special-character set, or changing the length bound) could pass both existing suites while silently breaking parity.

**Action taken:** added a matching 15-case fixture list to **both** test files (kept identical on purpose, cross-referenced by file path in code comments) covering cases neither original suite exercised: exactly-8-chars boundary, 7-chars-under-boundary, hyphen/underscore/period/space as the "special" character, an emoji as the special character (multi-byte edge case), an accented letter (to confirm it still counts as non-alphanumeric on both sides, not as a false "letter"), a 200+ character password, an all-symbols password missing letters/digit, and leading/trailing whitespace.
- Frontend: new `describe('passwordPolicy vs backend SignupDto regex — cross-boundary parity (PWDVAL-1)')` block runs each fixture through `isPasswordValid()` AND a verbatim copy of the backend regex, asserting they agree.
- Backend: new `describe('SignupDto — password policy vs frontend fixtures (PWDVAL-1 parity)')` block runs the same fixtures through the real `SignupDto` + `class-validator`, with an explicit expected valid/invalid flag per case, mirroring the frontend file.

**Result:** all 15 fixtures agree on both sides — frontend suite 18/18 passing (up from 3 tests), backend suite 19/19 passing (up from 4 tests). Full suites re-run clean: backend 78/514, frontend 18/138 (from 122-test baseline).

**Conclusion for `docs/APP_STATUS.md` §5:** `PWDVAL-1` can be moved from "self-reported, needs independent verification" to **"independently verified — cross-boundary parity empirically confirmed across 15 fixtures including multi-byte/unicode edge cases; both signup and reset-password screens confirmed to use the shared, verified policy."**

---

## 10. Task 4 — completion notes (regression tests for the two historically dead-button flows)

**Completed:** 2026-07-09 · **Status:** ✅ Done · **Verdict: both flows are genuinely fixed today — confirmed by real component tests, not just a code read — and both tests were mutation-tested to prove they actually catch the original bug class.**

**What was checked (code read, not just docs):**
- `frontend/src/screens/inventory/InventoryListScreen.tsx` — the FAB and empty-state action both call `openAdd()`, which opens a real `Modal` with a real form (`Input` fields for name/category/quantity/unit/reorder level/price/supplier) whose submit button calls `inventoryApi.create(...)` and then force-refetches the list. No `Alert.alert()` stub remains anywhere in this flow.
- `frontend/src/screens/harvest/HarvestPlansScreen.tsx` — "Mark Complete" on a planned plan's card opens a real modal collecting **actual weight** and **actual price**, validates both are `> 0` before allowing submit, calls `harvestPlansApi.complete(id, { actualWeightKg, actualPricePerKg, actualHarvestDate, farmId, cropId })`, then refetches. No auto-booked `0/0` and no silent no-op.

**Gap found and closed:** neither screen had **any** test coverage at all — a regression back to either historical bug (dead FAB / silently-closing modal) would have shipped undetected. Added two new screen-level test files using `@testing-library/react-native`:
- `frontend/src/screens/inventory/__tests__/InventoryListScreen.test.tsx` — presses the FAB, fills the real form, submits, asserts `inventoryApi.create()` is called with the right payload and the list force-refetches; a second test asserts an empty name is rejected client-side without ever calling the API.
- `frontend/src/screens/harvest/__tests__/HarvestPlansScreen.test.tsx` — presses "Mark Complete", fills real weight/price into the modal, submits, asserts `harvestPlansApi.complete()` is called with the exact actual values (never 0/0) and the list refetches; a second test asserts a blank/zero submission is rejected client-side without calling the API.

**Notable environment fix required for both:** `ScreenWrapper` → `OfflineIndicator` calls `useSafeAreaInsets()`, and `react-native-safe-area-context`'s real `initialWindowMetrics` is statically `null` outside a native runtime — so `SafeAreaProvider` silently renders `null` children (no thrown error) unless given explicit fake metrics. Both test files wrap the screen in `<SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>` with a hand-built frame/insets object; worth reusing this pattern for any future full-screen RNTL test in this repo rather than rediscovering it.

**Verification that the tests actually catch the bug class (not just passing trivially):** for each screen, temporarily reintroduced the original bug (FAB `onPress` → no-op; `submitComplete` → close modal and `return` before calling the API) and reran the test — confirmed it fails with a clear "0 calls" assertion error — then reverted and confirmed green again. This is stronger evidence than "the test passes," since a test can pass for the wrong reasons (e.g. matching the wrong element).

**Result:** both new test files pass (2/2 each); full frontend suite re-run clean: **20 suites / 142 tests** (up from 138).

**Recommendation carried forward from the task's own description:** re-run these two test files (or the full suite) on every release before shipping, not just once — they're now the fast, automated version of the manual click-test called out in `docs/APP_STATUS.md` §4.

---

## 11. Task 5 — completion notes (quick-mode for daily logging forms)

**Completed:** 2026-07-09 · **Status:** ✅ Done, right-sized — applied where the underlying rationale actually holds, deliberately skipped where it doesn't, with the reasoning written down below rather than mechanically stamping the same pattern on every log screen.

### 11.1 — Important correction to the original task's premise

The task (and `docs/APP_FLOW.md` §5) was written assuming Plankton has **13** count fields and Weekly Chemistry has **7**. Reading the actual current code (not the docs) during this work found:
- **Plankton** (`PlanktonLogScreen.tsx`): **6** count fields (green algae, blue-green algae, diatom, dinoflagellata, protozoa, floc) + date/time — not 13.
- **Weekly Chemistry** (`WeeklyChemistryScreen.tsx`): **6** fields (ammonia, nitrite, nitrate, alkalinity, hardness, transparency), and its own header comment already documents it as a *periodic* (≈weekly) test-kit entry, not a daily one.
- **Microbiology** (`MicrobiologyLogScreen.tsx`): **5** count fields + notes.

This is the same class of doc-drift the project's own audit already flagged (`REMEDIATION_STATUS.md` row #205, "docs accuracy — reference feature matrix cites specific source lines that have drifted"). Recommend a follow-up pass to correct `docs/APP_FLOW.md` §5's field counts — not done as part of this task since it's a docs-only fix orthogonal to the UX change, but flagging it here so it isn't lost.

### 11.2 — What was actually changed, and why

**`frontend/src/screens/logs/WaterQualityLogScreen.tsx`** (the real fatigue case — logged 1–2×/day, 10 fields):
- Quick mode: only pH, DO, Temperature show by default in a "Today's Reading" card; the other 7 fields sit behind an "Add more readings" / "Show fewer readings" toggle, reusing the exact show-more/show-less pattern already established in `PondDashboardScreen.tsx` (same chevron icon + `accessibilityState={{expanded}}`), not a new bespoke pattern.
- Smart pre-fill: on mount, fetches the pond's last reading via the already-existing (previously unused by this screen) `waterQualityApi.getLatest(pondId)` and pre-fills the 4 genuinely slow-changing fields — salinity, alkalinity, hardness, transparency. pH/DO/temperature are **never** pre-filled — they're the reason the farmer opened the screen and must be fresh.
- The expander stays **collapsed even after a successful pre-fill** — the carried-over values are already in state and submit on Save whether or not the farmer opens the section. That's the actual efficiency win, not the collapse itself.
- A 404 (new pond) or network failure while fetching the latest reading is swallowed silently — no error alert for a farmer who's simply logging for the first time or is offline.

**`frontend/src/screens/logs/FeedLogScreen.tsx`** (daily, but the friction is different — the 4 feeding-tray fields are a supplementary observation, not required to log an amount):
- Added a "Add feeding-tray check" / "Hide feeding-tray check" toggle (same pattern again) around the 4 tray-leftover-% inputs. Core save path (amount + type) is unaffected and requires nothing new. No pre-fill added here — tray leftovers are a fresh-per-feeding observation, there's no sensible "carry forward" value.

### 11.3 — What was deliberately NOT changed, and why

- **Weekly Chemistry** — already only 6 fields, logged ~weekly by design (per its own header comment), and its save button is already disabled until at least one field has a value (`anyValue` guard). The "daily re-typing fatigue" argument this task is meant to fix doesn't apply to a form filled once a week. Adding a headline/expander split here would be complexity for a screen that isn't actually the problem.
- **Plankton** — 6 count fields, all peer lab-style counts with no natural "3 matter most, rest are secondary" split the way pH/DO/temperature vs. salinity/alkalinity does for water quality. There's also no clean "slow-changing" pre-fill candidate — plankton composition can shift meaningfully day to day, so carrying forward yesterday's counts risks a farmer submitting stale bloom data by accident. Left unchanged rather than force-fitting a headline split that doesn't map to how these fields actually differ from each other.
- **Microbiology** — same reasoning as Plankton: 5 peer CFU/mL counts, no natural split, no safe pre-fill candidate.

**The actual takeaway:** "quick mode" is the right fix specifically where (a) the form is filled daily/multiple-times-daily AND (b) some fields are genuinely more time-critical than others AND/OR some fields are genuinely slow-changing. Water Quality hits both. Feed hits (a) with a "supplementary, not required" split instead of a slow-changing one. The other three screens don't hit the pattern's actual precondition, so applying it there would be motion without benefit — worth remembering before mechanically extending this pattern to a screen just because it also has multiple fields.

### 11.4 — Verification

- `frontend/src/screens/logs/__tests__/WaterQualityLogScreen.test.tsx` (3 tests): headline-only by default / full set after expand; pre-filled values reach `saveRecord()` even while collapsed; a fetch failure doesn't error and leaves fields `undefined`.
- `frontend/src/screens/logs/__tests__/FeedLogScreen.test.tsx` (2 tests): tray fields hidden by default and revealed on toggle; a save works without ever opening the tray section.
- **Mutation-tested both**: temporarily flipped each screen's default expanded-state to `true`, confirmed the corresponding test fails with a clear assertion error, then reverted — proving both tests actually catch a "quick mode silently disabled" regression, not just passing trivially.
- Added 6 new i18n keys total (`waterQuality_showMore/showFewer/prefillHint/sectionDaily`, `feed_showTrays/hideTrays`) with inline `t(key, englishDefault)` fallbacks and logged them in `docs/I18N_TELUGU_TODO.md`'s tracked-keys table, per this repo's existing convention (no machine translation for farmer-facing UI; `fallbackLng: 'en'` covers the gap until a native speaker translates).

**Result:** full frontend suite clean: **22 suites / 147 tests** (up from 142 before this task); `tsc --noEmit` clean (same 2 pre-existing unrelated `expo-camera`/`expo-location` errors, untouched).

### 11.5 — Follow-up flagged, not done

- Correct the stale field-count claims in `docs/APP_FLOW.md` §5 (Plankton "13" → 6, etc.) — a docs-accuracy fix, not a code change, out of scope here but should not be forgotten.
- If a third screen ever adopts this exact pattern, consider extracting a small shared hook (e.g. `useQuickModeLog`) for the toggle + pre-fill bookkeeping rather than a third copy-paste — two instances (Water Quality, Feed) isn't yet enough repetition to justify the abstraction, per this repo's own "don't introduce abstractions beyond what's needed" convention, but a third would be.

---

## 12. Task 6 — completion notes (data-completeness indicator on decision engines)

**Completed:** 2026-07-11 · **Status:** ✅ Already implemented, now independently verified with new tests. **This task was already done before this session** — the original task-list entry was written from `docs/USER_PERSPECTIVE_PRODUCT_ANALYSIS.md`'s findings without a full code read of these 4 screens; a proper read found the feature already shipped.

**What was found (code read, not assumption):** `backend/src/pond-context/pond-context.service.ts` computes a full `DataConfidence` model (`score` 0–100, `band` high/medium/low, `missing[]`, `stale[]`) from input completeness + freshness — weighted per parameter (DO/pH/temp 1-day freshness window, ammonia 10-day, body weight 14-day, etc.), already covered by its own backend spec (`pond-context.service.spec.ts`). All four engine screens — `FeedAdvisorScreen.tsx`, `DiseaseRiskScreen.tsx`, `HarvestTimingScreen.tsx`, `LunarScreen.tsx` — already call `pondContextApi.get(pondId)` and render a `ConfidenceChip` showing the score/band, with a "Log {{items}} to improve accuracy" hint on Feed Advisor.

**Gap found and closed:** `ConfidenceChip.tsx` itself (the shared presentational component all 4 screens depend on) had **zero** test coverage — a regression that silently dropped the score, mislabeled a band's color, or broke the improve-hint would have shipped undetected across all four engines at once. Added `frontend/src/components/ui/__tests__/ConfidenceChip.test.tsx` (4 tests): score/band render correctly for high and low bands; the hint only appears when `showHint` is set AND something is missing/stale; no hint renders when everything is complete even with `showHint` set.

**Result:** new test file 4/4 passing. Full frontend suite re-run clean after this task: 23 suites/151 tests.

**Recommendation:** no further action needed. If a 5th decision engine is added later, wire it the same way (`pondContextApi.get()` → `<ConfidenceChip confidence={ctx.confidence} />`) rather than inventing a new completeness signal.

---

## 13. Task 7 — completion notes (onboarding drop-off fix)

**Completed:** 2026-07-11 · **Status:** ✅ Done. **The core gating bug described in the original task was already fixed** — this session closed the one genuinely missing piece (a persistent reminder for unfinished pond setup).

**What was found already fixed (code read):**
- `CreateFarmScreen.tsx` calls `completeFarmSetup()` (clearing `pendingFarmSetup`) **immediately after farm creation**, before the pond-setup loop even starts — not after all N ponds are configured.
- The navigation reset puts `MainApp` **underneath** `PondSetup` in the stack (`navigation.reset({ index: 1, routes: [{name:'MainApp'}, {name:'PondSetup', ...}] })`), so backing out of pond setup at any point lands on a real, usable dashboard — never a dead end.
- `PondSetupScreen.tsx` already has a "Finish Later" link on every step that resets straight to `MainApp`.
So an owner who stops after configuring pond #1 (or configures zero ponds) already reaches Home immediately — the "gated until all N ponds" bug described in the task's premise does not exist in current code.

**Gap found and closed:** nothing reminded the owner that they still have unconfigured planned ponds once they land on Home — a farmer who bails out via "Finish Later" could simply forget the rest of their farm was never set up. Added a **finish-setup nudge card** to `HomeScreen.tsx`:
- Fetches the selected farm's `plannedPondCount` (`farmsApi.getById`) and compares it against the actual pond count for that farm (from the already-fetched `pondsApi.getMine()` list, filtered by `farmId`).
- Shows "Finish setting up your ponds — N more pond(s) planned but not set up yet" with a "Continue setup" button that navigates to `PondSetup` with `totalPonds` set to just the remaining count (a fresh mini pond-setup session, not a resume-exact-step feature — consistent with how "Finish Later" already works).
- A dismiss (×) hides it for this visit only — plain component state, no persistence needed: it naturally reappears next time `HomeScreen` mounts (next app open) while still incomplete, satisfying "persistent but dismissible" without any extra storage plumbing.

**Verification:** added `frontend/src/screens/main/__tests__/HomeScreen.test.tsx` (4 tests): nudge shows with the correct remaining count; nudge disappears once every planned pond exists; dismiss hides it without navigating; "Continue setup" navigates to `PondSetup` with only the remaining count. **Mutation-tested**: forced `showSetupNudge` to `false`, confirmed 3 of 4 tests fail with clear assertion errors, then reverted.

**Result:** new test file 4/4 passing. Full frontend suite re-run clean after this task: 24 suites/155 tests.

---

## 14. Task 8 — completion notes (banned-substance server-evaluated write-time flag)

**Completed:** 2026-07-11 · **Status:** ✅ Done — the highest-consequence previously-open item in the backlog is now closed. This is the one task in this list that required an actual schema migration, per its own description.

**What existed before this session:** a client-only guardrail (`frontend/src/features/bannedSubstances.ts`) that warns a farmer in `TreatmentLogScreen`/`DiseaseLogScreen` at log time, and a server-updatable reference list (`GET /banned-substances`) the client hydrates from. But the actual treatment/disease **records saved to the backend carried no trace** of whether a banned/restricted substance was detected — an offline-stale app, a modified client, or a farmer just dismissing the alert left zero server-side signal. For an export-compliance risk, the audit trail needs to be authoritative, not client-trusted — this was `LAUNCH_REMEDIATION.md`'s own explicitly-deferred item.

**What was built:**
1. **`backend/src/banned-substances/banned-substance-matcher.ts`** — a pure `evaluateBannedSubstances(...texts)` function mirroring the frontend's whole-word, case-insensitive regex matcher exactly, evaluated against the backend's own authoritative `BANNED_SUBSTANCES` list (same lesson as `PWDVAL-1`: two independent implementations of "the same rule" must be kept in lockstep, not just each trusted alone).
2. **Migration `1780301800000-AddBannedSubstanceFlag.ts`** — additive, idempotent (`IF NOT EXISTS`), reversible — adds `banned_substance_flag` (text, default `'none'`), `banned_substance_matches` (text array), `banned_substance_list_version` (text, nullable) to `treatments` and `disease_records`. **Not yet applied to any real database** — needs `npm run migration:run` against the actual environment (see §14.1 below); this session could only write and typecheck it, not run it against live infra.
3. **Entity + service wiring** — `Treatment` and `DiseaseRecord` entities updated with the 3 new columns; `TreatmentsService.create()`/`.update()` and `DiseaseService.recordOccurrence()`/`.updateRecord()` now recompute the flag server-side on every write from the record's own `description`/`notes` text, **ignoring any client-sent value** (the global `ValidationPipe({whitelist:true})` already strips unknown DTO fields, so this is a defense-in-depth guarantee, not the only one). `update()` only re-evaluates when the relevant text field actually changes, and correctly **clears** a stale flag if an edit removes the flagged text — it doesn't just add flags, it stays accurate both directions.
4. **Deliberately scoped out: `ChemicalData`** — that entity has no free-text field at all (pure numeric chemistry readings), so a text-matching flag genuinely doesn't apply there. Not touched, with the reasoning written down rather than force-fitting a column that would just always read `'none'`.
5. **Frontend surfacing** — added a "Flagged: {{names}}" banner to `TreatmentHistoryScreen.tsx` and `DiseaseHistoryScreen.tsx` so the server-evaluated flag is actually visible somewhere, not just sitting in the database unseen. Added the 2 new fields to the `Treatment`/`DiseaseRecord` frontend API interfaces.

**Verification:**
- `backend/src/banned-substances/banned-substance-matcher.spec.ts` (10 tests) — whole-word matching, category classification, multi-field combination, dedup, null/undefined handling.
- `backend/src/treatments/treatments.service.banned-substance.spec.ts` (7 tests) — flags banned/restricted/none correctly on create, scans both description and notes, **ignores a simulated client-forged flag** and recomputes from the real text, re-evaluates on update only when the relevant field changes, correctly clears a stale flag when the flagged text is edited out.
- `backend/src/disease/disease.service.banned-substance.spec.ts` (5 tests) — same guarantees for disease records.
- Updated one pre-existing assertion in `disease.service.spec.ts` that had gone stale (it asserted an exact `create()` call payload that legitimately now includes the 3 new fields) — a correct test update, not a regression.
- `frontend/src/screens/logs/History/__tests__/TreatmentHistoryScreen.test.tsx` and `DiseaseHistoryScreen.test.tsx` (2 tests each) — the banner shows the matched substance name on a flagged record and stays absent on a clean one.

**Result:** backend suite **81 suites/536 tests** (up from 78/514), frontend suite **26 suites/159 tests** (up from 24/155), both `tsc --noEmit` clean (after fixing a stale `node_modules` install missing `helmet`/`@sentry/node` — same class of issue as the earlier `expo-camera`/`expo-location` gap, fixed with `npm install`).

### 14.1 — Action required before this is live in production

**The migration has not been run anywhere.** Per `docs/OPERATIONS.md`'s own migration workflow: run `npm run verify:fresh-db` first to prove the full chain (including this new migration) is safe on a throwaway DB, then `npm run migration:run` against the real direct-connection Supabase host. Until that runs, the new columns don't exist in any real database and the feature is code-complete but **not deployed**. This is exactly the kind of step that shouldn't be run casually against production without the operator's own review — flagging it explicitly rather than silently assuming it happened.

---

## 6. History

- **2026-07-09** — List created. OTA config independently verified end-to-end (package, config, native manifest, string resource) — confirmed correctly wired, no action needed. Task priority order derived from `docs/USER_PERSPECTIVE_PRODUCT_ANALYSIS.md` Part 2's ranked findings table plus open items already tracked in `docs/APP_STATUS.md` §6.
- **2026-07-09** — Task 1 (SYNC-1/SYNC-4 independent verification) completed. Read `recordSync.ts`/`syncStore.ts`/`authStore.ts` directly, confirmed the "Option B" per-user queue-filtering design is actually implemented (not just documented), found and closed a test-coverage gap (no test previously exercised token-expiry + shared-device-switch *together* through the real production call path), added that test, ran the full `src/sync` + `src/store` suite clean (22/22 passing, no regressions). See §7 for full detail. Marked Done in §2.
- **2026-07-09** — Tasks 2 and 3 completed together. **Task 2 (DATE-1):** confirmed both backend consumer code paths (`reports.service.ts`, `feed-records.service.ts`) and the frontend harvest-plans screen all correctly use the shared IST/local-day helpers, found `reports.service.spec.ts` was a 1-line stub with zero coverage of the actual report code path, replaced it with 2 real boundary tests. **Task 3 (PWDVAL-1):** confirmed the backend `SignupDto` regex and frontend `passwordPolicy.ts` are two independently-written implementations that each only tested themselves in isolation; added a matching 15-fixture cross-boundary parity suite to both sides (multi-byte/emoji, accented letters, boundary lengths, whitespace) and confirmed empirical agreement, not just by comment. Also confirmed `ResetPasswordScreen` uses the same shared, now-verified policy. Full suites re-run clean after both tasks: backend 78 suites/514 tests (from 498), frontend 18 suites/138 tests (from 122) — no regressions. See §8 and §9 for full detail. Marked Done in §2.
- **2026-07-09** — Task 4 completed. Confirmed both the Inventory Add-Item and Harvest mark-complete flows are genuinely fixed in current code (real forms, real API calls, no stubs). Neither screen had any test coverage at all, so added two new screen-level RNTL test files that exercise the full user flow end-to-end. Solved a `react-native-safe-area-context` test-environment gotcha (`initialWindowMetrics` is `null` outside native, so `SafeAreaProvider` renders nothing without fake metrics). Mutation-tested both new tests by temporarily reintroducing each original bug and confirming the test fails, then reverted. Full frontend suite re-run clean: 20 suites/142 tests (from 138). See §10 for full detail. Marked Done in §2.
- **2026-07-09** — Task 5 initial pass: implemented quick-mode + pre-fill for `WaterQualityLogScreen.tsx` only, marked 🟡 partial pending review of the other log screens.
- **2026-07-09** — Task 5 finished after reviewing the remaining log screens' actual code (not the docs). Found `docs/APP_FLOW.md`'s field counts for Plankton (claimed 13, actually 6) and Weekly Chemistry were stale — same doc-drift class as audit row #205. Applied the pattern to `FeedLogScreen.tsx` (tray-check fields collapsed behind a toggle — supplementary-observation rationale, not slow-changing pre-fill). Deliberately left Weekly Chemistry, Plankton, and Microbiology unchanged with reasoning recorded in §11.3: none of them actually fit the pattern's precondition (daily cadence + either time-critical-vs-slow-changing split or required-vs-supplementary split) — Weekly Chemistry is periodic by design, Plankton/Microbiology are peer lab counts with no natural split and no safe pre-fill candidate. Added a second test file (`FeedLogScreen.test.tsx`, 2 tests), mutation-tested both new test files. Full suite clean: 22 suites/147 tests (from 142), `tsc` clean. Status changed from 🟡 Partial to ✅ Done (right-sized) in §3 — closing the task on a reasoned scope rather than a mechanical one.
- **2026-07-11** — Tasks 6, 7, and 8 completed. **Task 6:** found the data-completeness indicator (`ConfidenceChip` + `pond-context` confidence scoring) was already fully implemented across all 4 engine screens before this session — closed its one real gap (zero test coverage on the shared chip component) with a new 4-test file. **Task 7:** found the core onboarding-gating bug already fixed (owner reaches Home right after farm creation, "Finish Later" escape hatch exists at every pond-setup step) — closed the one missing piece, a persistent-but-dismissible "finish setting up your ponds" nudge on `HomeScreen.tsx`, with a new 4-test file, mutation-tested. **Task 8** (the one requiring an actual schema migration): built a shared `banned-substance-matcher.ts` mirroring the frontend's client-only matcher against the backend's own authoritative list, added migration `1780301800000-AddBannedSubstanceFlag` (treatments + disease_records, additive/idempotent/reversible — **not yet run against any real database**, see §14.1), wired `TreatmentsService`/`DiseaseService` create/update to recompute the flag server-side on every write independent of client input, deliberately left `ChemicalData` untouched (no free-text field, doesn't apply), and surfaced the flag as a visible banner in both history screens. Fixed a stale `node_modules` install (missing `helmet`/`@sentry/node`, same class of issue as the earlier frontend `expo-camera` gap) blocking backend `tsc`. Added 10+7+5 backend tests and 2+2 frontend tests; fixed one pre-existing test assertion that had gone legitimately stale. Full suites clean: backend 81/536 (from 78/514), frontend 26/159 (from 24/155), both `tsc` clean. See §12, §13, §14 for full detail. All marked Done in §3 — **§14.1 flags that the migration still needs to be run against the real environment before Task 8 is live in production**, not just code-complete.

*(Add a dated line here every time a task's status changes, a new task is added, or this list is re-synced against the source docs.)*
