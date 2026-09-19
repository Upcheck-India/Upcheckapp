# Molt Window, Remote Feature Flags, Account Management, QR Image Share — Design

Date: 2026-09-14 · Status: approved by owner · Ships as OTA + backend deploy (NO native build)

Owner decisions: build all four; Team flag hides the **tab only**; molt banners on
Sampling/Harvest **warn only, never block**.

---

## Global rules for every implementer

- **Read a file with the Read tool before editing it.** Grep output does not count.
- **No git commands that change state**: no `stash`, `checkout`, `reset`, `commit`,
  `restore`, `clean`. Four agents share one working tree; one `git stash` wipes all.
- Repo has mixed CRLF/LF — **never `sed -i` / `perl -pi`**. Use Edit.
- **Never run `expo prebuild`.** No new native modules (must ship over OTA).
- **No writes to production data**, no migrations run against production.
- Shared files (`backend/src/app.module.ts`, `HomeScreen.tsx`, `SettingsScreen.tsx`,
  `ProfileScreen.tsx`, `i18n/locales/*/index.ts`): **re-Read immediately before each Edit**;
  keep edits small and local.
- i18n: every new key in all six locales `en hi bn ta te or`
  (`localeParity.test.ts` is bidirectional). Gate: `bash frontend/scripts/check-calculator-i18n.sh`.
- Tests: `cd backend && npx jest <path>` / `npx tsc --noEmit`;
  `cd frontend && npx jest <path>` / `npx tsc --noEmit`.
- Any guard you add: break it, watch its test fail, restore it (mutation check).
- Money/security paths: validate at the trust boundary; never trust client ids for access.

---

## 1. Molt Window (owner: agent MOLT)

### Problems being fixed
- Molt alert is recomputed per pond on every request (`engine-alert.service.ts:108`),
  never persisted, so it can never resolve; shows on every pond.
- "Mark done" only hides in screen memory; pond-page button always opens WaterQualityLog.
- No start/end dates; backend knows true phase dates but sends only "5.6 days".
- Home `LunarRow` uses mean-phase client math (`features/moonPhase.ts`), backend uses
  Meeus true phase — they disagree at window edges.
- No other feature knows a molt is on.

### Model
- **Window** = around each TRUE new/full moon (`lunar/moon-phase-meeus.ts`), IST dates:
  `pre` = peak−3d..peak−2d, `peak` = peak−1d..peak+1d, `post` = peak+2d..peak+3d.
  Window key: `YYYY-MM-DD-new|full` (IST peak date). Outside all → `inter`.
- **Eligible pond**: active cycle AND latest ABW ≥ 5 g (below that molt is not
  lunar-locked). Active cycle with no sampling → `sizeUnknown` (prompt to sample,
  no molt alert).
- **Checklist** per (pond, window). Items visible for the current phase and earlier phases:

| phase | key | priority | completion |
|---|---|---|---|
| pre | `minerals` | important | auto: chemical_data or treatment logged for pond in pre..peak end |
| pre | `alkalinity_check` | important | auto: water-quality with alkalinity in pre..peak end |
| pre | `aerator_service` | routine | manual |
| peak | `feed_cut` | critical | auto: each logged peak day's feed total ≤ 85% of mean daily feed over the 3 days before `pre` start (no baseline → manual) |
| peak | `no_handling` | critical | auto-satisfied; becomes `violated` if sampling or harvest logged in peak |
| peak | `night_do_check` | critical | auto: water-quality with DO logged in peak |
| post | `restore_feed` | important | manual |
| post | `post_sampling` | routine | auto: sampling logged in post |
| post | `soft_shell_check` | routine | manual |

- Each item carries a `route` hint (`ChemicalLog`, `WaterQualityLog`, `FeedLog`,
  `SamplingLog`, or none) — the action button opens that screen for the pond.
- Manual ticks persisted in new table `molt_actions`
  (`id uuid, pond_id uuid FK ponds ON DELETE CASCADE, window_key varchar, action_key varchar,
  done_by uuid, done_at timestamptz, UNIQUE(pond_id, window_key, action_key)`).
  Migration timestamp `1780700700000`. Un-tick = delete row. Auto-derived items are
  computed, not stored.

### Backend
- `backend/src/molt/` module: `molt-window.ts` (pure window math + tests),
  `molt.service.ts`, `molt.controller.ts`, `molt-action.entity.ts`.
- `GET /molt/windows?count=3` — upcoming (incl. current) windows
  `{ key, kind:'new'|'full', preStart, peakStart, peakDate, peakEnd, postEnd }` (IST dates).
- `GET /molt/ponds/:pondId` — READ access via FarmAccessService:
  `{ window|null, phase, eligible, sizeUnknown, abwG, items:[{key,phase,priority,status:'done'|'pending'|'violated',source:'auto'|'manual',route?}], pendingCritical }`.
- `POST /molt/ponds/:pondId/actions` `{ windowKey, actionKey, done }` — WRITE_OPERATIONAL;
  validate windowKey is the current window and actionKey is a manual item.
- `engine-alert.service.ts` lunar block replaced: only eligible ponds in a window;
  - peak with pending/violated critical items → `critical` (title "Molt peak — N actions pending");
  - pre/post with pending important items → `watch`;
  - all current-phase items done → no alert.
  - steps = pending item texts. Uses a bulk method (no per-pond N+1 — `activeContexts`
    is set-based; keep it so).
- `/alert-center/today` adds `moltWindow: { window, phase, eligiblePonds, pondsWithPending } | null`.
- Feed advisor `inMoltPeak` must use the same window math.

### Frontend
- `api/molt.ts`; delete mean-phase molt logic usage from Home (keep `moonPhase.ts` only for
  emoji/illumination if still needed).
- `LunarRow`: from `today.moltWindow` — "Molt window 9–13 Sep · peak 11 Sep" +
  "2 of 5 ponds need action"; quiet line outside window with next window date.
- `LunarScreen`: timeline (pre/peak/post dates, current highlighted), next 3 windows;
  with `pondId` → checklist with Done toggles and action buttons; without → eligible
  ponds list with progress, tap → pond.
- `PondDashboardScreen` alert banner "Mark done" for lunar source → opens Lunar for the pond
  (not WaterQualityLog).
- Banners (warn only) during peak: SamplingLogScreen, HarvestLogScreen, TreatmentLogScreen;
  HarvestPlansScreen warns if planned date falls inside any window (soft shells, lower price).
- Local notification the day before `preStart` (18:00 local) via existing
  `utils/notifications.ts` patterns, respecting existing notification permission/prefs;
  reschedule idempotently.
- Strings: `engines.ts`, `home.ts`, `logs.ts`, `harvestPlans.ts` namespaces.

---

## 2. Remote feature flags via PostHog (owner: agent FLAGS)

### Why backend evaluation
The PostHog client only exists after analytics consent (`features/analytics.ts`), and the
Privacy Policy forbids sending data without it. So flags are evaluated **on the backend
with `posthog-node` local evaluation** (`onlyEvaluateLocally: true`): the server polls flag
definitions; no per-user request and no events go to PostHog.

### Flags (PostHog key → app key, default)
`app-news`→news, `app-team-tab`→teamTab, `app-shop`→shop, `app-simulators`→simulators,
`app-disease-encyclopedia`→diseaseEncyclopedia, `app-disease-diagnosis`→diseaseDiagnosis,
`app-calculators`→calculators, `app-lunar`→lunar, `app-feed-advisor`→feedAdvisor,
`app-export`→export, `app-cycle-analysis`→cycleAnalysis, `app-tasks`→tasks (added by owner).
All default **true**.

Semantics: flag absent from PostHog / backend unconfigured / offline → default (true).
Flag present and evaluates false (including a disabled flag) → hidden. Payloads passed through.

### Backend
- `npm i posthog-node` in backend. `backend/src/features/` module.
- Env: `POSTHOG_PROJECT_TOKEN` (phc_…), `POSTHOG_FEATURE_FLAGS_KEY` (feature-flags secure key
  or personal API key). Missing → service returns `{ flags:{}, payloads:{} }` and logs once.
  Add both to `backend/.env.example`.
- Client options: `personalApiKey`, `featureFlagsPollingInterval: 60000`, `disableGeoip: true`;
  never call `capture`; `shutdown` on module destroy.
- `GET /features` (authenticated): distinctId = `sha256('upcheck:' + userId).slice(0,16)`
  (must equal `frontend/src/utils/hashUserId.ts`), personProperties `{ role, language }`
  where role = highest role across the user's farms (owner>manager>worker>viewer) and
  language = users.language if present. `getAllFlagsAndPayloads(..., { onlyEvaluateLocally: true })`.
  Only return keys starting `app-`.

### Frontend
- `features/remoteFlags.ts`: defaults table, zustand store, fetch on sign-in and on app
  foreground (throttle 5 min), AsyncStorage cache of last response, `useFlag(key)` and
  `useFlagPayload(key)`. Signed-out → defaults.
- When analytics is running, report exposure once per session per flag through a new
  allowlisted function in `analytics.ts` emitting `$feature_flag_called`
  `{ $feature_flag, $feature_flag_response }` (enables PostHog experiments for consented users).
- Gate: tab (News, Team tab only), every entry point listed below, and the route
  (a guarded screen shows a small "not available" state and goes back).
  - News: MainNavigator NewsTab, SettingsScreen:214
  - Team tab: MainNavigator Team, HomeScreen:988 "see all" → hide link. FarmMembers,
    AllWorkers, worker QR stay reachable (owner decision).
  - Shop: SettingsScreen:224
  - Simulators: SettingsScreen:211
  - Disease encyclopedia: SettingsScreen:212; Diagnose: DiseaseListScreen:205
  - Calculators: SettingsScreen:210
  - Lunar: HomeScreen:1011 LunarRow, EnginesHubScreen:24
  - Feed advisor: EnginesHubScreen:20, DailyRoutineScreen:154
  - Export: SettingsScreen:217, CycleAnalysisScreen:51
  - Cycle analysis: CycleDetailScreen:248
  - Tasks: routes TaskList, TaskCompose, RecurringTasks; FarmDetailScreen Tasks tile; HomeScreen
    "My tasks" section; TeamScreen tasks section (header/assign, lists, repeating row);
    ExportScreen `tasks` dataset.
- `config/features.ts`: `cycleAnalysisReport`/`diseaseDiagnosis` read the remote flag
  (static table stays for the other, non-remote flags).
- After implementation, the lead creates the 12 flags in PostHog at 100%, active.

---

## 3. Account management (owner: agent ACCOUNT)

Auth is sensitive: owner instruction "dont break the auth". Every change has tests; existing
auth specs must still pass.

### Name bug
- Signup writes `firstName/lastName` (camelCase) to user_metadata; `authStore.displayNameOf`
  reads snake_case → email prefix. `profiles` row upserted with `fullName: ''`.
- Fix: signup also writes `full_name, first_name, last_name`; `displayNameOf` also reads
  `firstName/lastName`; `ProfilesService.upsert` fills empty `full_name` from
  `users.first_name/last_name` (heals existing accounts on next `GET /profiles/me`).

### Member since
`GET /profiles/me` returns `createdAt` from `users.created_at`; also `phone`, `phoneVerified`,
`hasPassword`, `providers: string[]`, `emailIsInternal` (truecaller temp email).
`hasPassword`: `SELECT (encrypted_password IS NOT NULL AND encrypted_password <> '') FROM auth.users WHERE id=$1`
(verify the backend DB role can read `auth.users`; otherwise fall back to identities).
Fix `findPublicByUsername` selecting non-existent `createdAt`.

### Endpoints (all authenticated, all rate-limited like existing auth endpoints)
- `PATCH /profiles/me` `{ fullName }` (trim, 1–80, class-validator) → profiles.full_name,
  users.first_name/last_name, auth `admin.updateUserById` user_metadata
  `{full_name, first_name, last_name, firstName, lastName}`.
- `POST /auth/supabase/account/email-code` `{ purpose:'set_password'|'change_email', newEmail? }`
  → 6-digit code, Redis, TTL 10 min, max 5 verify attempts, resend cooldown 60 s, per-user
  keyed by purpose (+newEmail). Sent via existing EmailService/Brevo. set_password → account
  email (must be a real, non-internal email); change_email → newEmail (must not belong to
  another user).
- `POST /auth/supabase/account/set-password` `{ code, newPassword }` — only when
  `hasPassword` false; same password policy as signup.
- `POST /auth/supabase/account/change-email` `{ newEmail, code, currentPassword? }` —
  refused for Google-provider accounts; `currentPassword` required when `hasPassword`;
  `admin.updateUserById({ email, email_confirm: true })`; update profiles.email.
- Change password: existing `POST /auth/supabase/update-password` — fix frontend
  `authApi.updatePassword` to send `currentPassword`.
- Link Google: `POST /auth/supabase/account/link-google` `{ idToken }` using an isolated
  Supabase client (`persistSession:false`) with the caller's session and
  `auth.linkIdentity({ provider:'google', token })`. If Supabase returns manual-linking
  disabled, return a clear 400 code `MANUAL_LINKING_DISABLED`. Must not invalidate the
  caller's current session; if a new session is returned, the client adopts it through the
  existing session-setting path. Tests required.
- Truecaller link: `linkTruecallerToUser` must canonicalize the phone with the SAME function
  the sign-in path uses (uniqueness check and stored value). Write a failing test first that
  demonstrates the duplicate-account risk (linked `+91…` vs canonical lookup), then fix.
  Do not change the sign-in path.

### Frontend
- Profile → "Account" section/screen: name edit, email (change/add), password (change or
  set), connected sign-in methods (email, Google, phone) with Link Google / Verify phone via
  Truecaller (existing ProfileScreen flow), Member since.
- Remove the unsaved free-text phone field.
- After name/email change refresh `authStore.user` (add a small `refreshUser` that maps
  the returned profile; do not touch token handling).
- Strings: `auth.ts`, `settings.ts` namespaces.

---

## 4. QR image share (owner: agent QR)

- `frontend/src/utils/shareQrImage.ts`: given a `react-native-qrcode-svg` ref, `toDataURL`
  → base64 PNG → `new File(Paths.cache, name).write(base64, { encoding:'base64' })`
  (match `features/export/deliver.ts` API usage) → `Sharing.shareAsync(uri,
  { mimeType:'image/png', dialogTitle })`. Fallback to existing text share when sharing is
  unavailable or conversion fails. Render with white background + quiet zone so the image
  scans.
- Worker QR (`ProfileScreen.tsx` ~376–392) and farm invite QR (`FarmMembersScreen.tsx` ~317,
  `shareInvite` ~184): "Share image" + keep "Share code" text. In ProfileScreen, touch only
  the QR block and its share handler.
- Strings: `members.ts`, `settings.ts` (coordinate: add keys under a `qr` sub-object only).
- Test: unit test for `shareQrImage` (mock ref/File/Sharing) covering success + fallback.
