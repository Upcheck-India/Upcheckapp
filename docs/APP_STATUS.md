# Upcheck — App Status

> **Last updated:** 2026-07-11
> **Source docs this was built from (latest only):** `README.md`, `REMEDIATION_STATUS.md`, `LAUNCH_REMEDIATION.md`, `AUDIT_FINDINGS_2026-07-08.json`, `docs/PLAY_STORE_LAUNCH.md`, `docs/OPERATIONS.md`, `docs/I18N_TELUGU_TODO.md`, `docs/FEATURES.md`, `docs/ARCHITECTURE.md`, `docs/APP_FLOW.md`, latest commits on `master`.
>
> **⚠️ Maintenance instruction — read before trusting this doc:** This is a living status snapshot, not a historical record. **Whenever remediation sessions close more items, a new audit runs, a Play Store submission happens, or a major feature ships — update this document in the same change**, or as soon as possible after. If you're an AI agent picking up work in this repo: before relying on any status below, re-check it against the current `REMEDIATION_STATUS.md` tail, `git log`, and this file's own "Last updated" date — if they've diverged, refresh this doc first, then proceed. Stale status here is worse than no status doc at all, because it will be trusted.

---

## 1. One-paragraph summary

Upcheck is a **pre-launch, actively developed** shrimp-farming operations app for the Indian aquaculture market (NestJS backend + Expo/React Native frontend, ~90 screens, 46 backend modules). The core product surface — farm/pond/cycle management, ~11 log types, decision engines, finance, inventory, disease tracking, 6-language i18n, offline sync — is **feature-complete and functionally built**. The team ran a structured 215-item security/correctness/quality audit (`AUDIT_FINDINGS_2026-07-08.json`) across 7 remediation sessions and closed **213 of 215 (99%)**, including all 6 CRITICAL and all 27 HIGH severity findings. The 2 remaining items are external/operational (not code), plus a small, explicitly separate content backlog (authentic Telugu translation for newer screens) and a known-but-accepted lint debt. **No independent verification of the self-reported fixes has been done outside this repo's own test suite** — see §5.

---

## 2. What's good (working, and a real strength)

- **Feature breadth is real, not vaporware.** Farm/pond/cycle lifecycle, 11 distinct log types (water quality, feed, feeding-tray, sampling, mortality, chemical/weekly-chemistry, plankton, microbiology, disease, treatment, harvest), 8 decision engines (Feed Advisor, Harvest Timing, Disease Risk, Aeration, Lunar molt-risk, Morning Briefing, Daily Routine, Crop P&L), finance (expenses/transactions/P&L), inventory + credit ledger, calculators, simulations, disease encyclopedia + symptom diagnosis, RBAC (owner/manager/worker/viewer) — all present and wired end-to-end per `docs/FEATURES.md` / `docs/APP_FLOW.md`.
- **Offline-first is a genuine architectural choice**, not a bolt-on: client-minted UUIDs, a write-queue (`frontend/src/sync/recordSync.ts`), and dedicated hardening work (`SYNC-1..4` in `LAUNCH_REMEDIATION.md`) targeting exactly the "no signal at the pond" and "shared device between workers" conditions real Indian farm labor involves.
- **6-language i18n is a real i18next implementation** (not a stub) with safe fallback-to-English (`fallbackLng: 'en'`) so missing translations never crash or show raw keys.
- **Security posture closed hard on the worst class of bug first.** All 6 CRITICAL findings (cross-tenant disease-record IDOR read/write/delete, cross-tenant dashboard read, unbounded object binding on credit writes, cross-user cache) and all 27 HIGH findings (auth/2FA edge cases, financial idempotency, un-owned catalog writes, missing CI gate, dependency CVEs) are marked done+tested.
- **Test discipline exists and grew with the remediation work**: backend 78 suites / 498 tests, frontend 18 suites / 122 tests, `tsc --noEmit` clean, CI workflow now runs backend build+test and frontend tsc+jest on push/PR (added in Session 3 — previously there was no quality gate at all).
- **Ops runbook is explicit about the two sharpest footguns** in this stack (backend/frontend deploy through *different* pipelines; DB migrations must use the direct connection, not the pooler) — this is the kind of institutional knowledge that normally only lives in one person's head, here it's written down (`docs/OPERATIONS.md`).
- **Play Store legal/compliance groundwork is done**, not just planned: restricted Android permissions (`READ_CALL_LOG`, SMS, `CALL_PHONE`) already stripped; legal copy filled in; account deletion implemented end-to-end (`Profile → Delete Account` cascades owned data + removes the Supabase auth identity).

---

## 3. What's bad (real but non-blocking issues, known and accepted)

- **Backend lint is not clean** — explicitly called out as "non-blocking CI step, known debt" in `REMEDIATION_STATUS.md`'s completion header. Tracked separately, not gating releases.
- **Telugu (and other non-English) translations are incomplete for newer screens** — `diagnose.*`, `finance.breakEven*`, `reports.cycleAnalysis*`, `ponds.dimHistory*`, `logs.feedingTray_*`, `auth.reset*`, `home.worker*`, `members.*`, `content.tasks.*` all currently fall back to English in Telugu (and by extension likely Tamil/Odia/Bengali/Hindi/Gujarati too — see `docs/I18N_TELUGU_TODO.md`). This is explicitly a **content task requiring a human Telugu speaker** — "machine translation is not acceptable for the farmer-facing UI" (team's own words). Two of these fallback surfaces (**diagnose**, **finance**) are among the highest-stakes screens in the app.
- **Backend runs on Render's free plan** — cold-starts after ~15 min idle, undocumented-to-users. Acceptable pre-launch; will need a plan upgrade before real production traffic (flagged as MEDIUM in the audit, marked done meaning *documented*, not *resolved* — the free plan itself isn't code-fixable).
- **Redis is optional with an in-memory fallback** — safe on a single Render instance today, but 2FA temp-tokens and Truecaller nonce replay-protection are then **per-instance**, so this silently breaks correctness the moment the backend scales horizontally to >1 instance. Currently only a startup warning exists, not a structural fix. This is a **scaling gate**, not a launch blocker — revisit before adding a second backend instance.
- **A residual patched-fork dependency risk**: the Truecaller React Native module is running on a `patch-package` patch that hard-removes a TurboModule code path — fragile against upstream updates, flagged 🔷 (needs-ops-or-external-input, i.e. a real replacement package, not a code fix in this repo).
- **Dark mode is dead code** — a full dark color-role palette exists in the codebase but is never referenced by any of the 118 screens. Either finish it or remove it; right now it's neither shipped nor deleted.

## 4. What's broken (if any of these regress, treat as urgent)

**Nothing is currently known-broken in the main branch** — the two historically-worst "looks-shipped-but-does-nothing" bugs the audit found were:
- **Inventory "Add Item" was a dead button** — the FAB and empty-state action both just fired a no-op `Alert.alert()` instead of opening a real create form.
- **Harvest "mark complete" flow was broken** — promised behavior didn't match what actually happened.

Both are marked ✅ fixed in `REMEDIATION_STATUS.md` (rows #28, #29, #86). **These are exactly the two flows worth manually click-testing on every release** — they're terminal, high-stakes farmer actions (a real purchase, closing out a season's harvest) where silent failure does the most trust damage. If you're validating a new build, start here.

---

## 5. Confidence caveat — read this before trusting "✅ done"

`REMEDIATION_STATUS.md` and `LAUNCH_REMEDIATION.md` are **self-reported by the same coding sessions that produced the fixes** — they are the best available record, and the discipline behind them (severity tiers, acceptance criteria, allow/deny test pairs, before/after test counts) is genuinely strong. But "the audit trail says fixed" and "independently verified as fixed" are not the same claim. Before depending on any of the following for something real (a farmer's data, a compliance decision, a production launch), do an independent pass:
- Offline sync data-loss / shared-device mis-attribution (`SYNC-1`, `SYNC-4`) — highest consequence if it regresses; force-fail a token refresh mid-drain with a non-empty queue and check nothing is lost or mis-attributed.
- UTC-vs-IST day-boundary bucketing (`DATE-1`) — a fixed-clock test around 00:00–05:30 IST.
- Password/signup validation client↔server parity (`PWDVAL-1`).
- ~~Banned-substance guardrail (`BANNED-1`)~~ — **code-complete as of 2026-07-11** (see `docs/LATEST_TASKLIST.md` §14): a server-evaluated write-time flag now exists on `treatments`/`disease_records`, computed independent of client input, with backend+frontend test coverage. **Still not live** — the migration (`1780301800000-AddBannedSubstanceFlag`) has not been run against any real database yet. Treat as open for compliance purposes until that migration runs.

---

## 6. What's planned / open (explicitly, from the docs themselves)

| Item | Type | Status | Note |
|---|---|---|---|
| Android upload keystore | 🔷 external/ops | Open | Must be done via `eas credentials`; cannot live in-repo. Play Store BLOCKER per `docs/PLAY_STORE_LAUNCH.md` §3. |
| Truecaller SDK fork replacement | 🔷 external/ops | Open | Current patched fork is fragile; needs a real replacement package, not a repo code fix. |
| Authentic non-English translations (Telugu first, then Tamil/Odia/Bengali/Hindi/Gujarati) | Content | Open, explicitly scoped | Needs a human native speaker per screen area listed in `docs/I18N_TELUGU_TODO.md`. |
| Banned-substance server-evaluated write-time flag | Code done, migration pending | Open (ops step only) | Code + tests complete 2026-07-11 (`docs/LATEST_TASKLIST.md` §14). Migration `1780301800000-AddBannedSubstanceFlag` still needs `npm run migration:run` against the real DB — not yet applied anywhere. |
| Large-font (`allowFontScaling`) accessibility QA | Manual QA | Open | Code-side labels landed; the actual "does it clip on a real device at 150–200% font scale" pass is still manual and pending (`A11Y-1`). |
| Physical-device deep-link verification (password reset via Gmail/WhatsApp-forwarded links) | Ops/manual QA | Open | Code-side routing fixed; real-device handoff verification + Supabase redirect-allowlist confirmation is an ops step (`DEEPLINK-1`). |
| Play Store submission checklist | Ops | In progress | Legal/permissions/account-deletion done; Data Safety form, signed AAB, store listing copy/assets, internal-testing pass still to complete per `docs/PLAY_STORE_LAUNCH.md`. |
| Frontend crash reporting (`@sentry/react-native`) | Code + ops | Open | Backend Sentry is wired; frontend has the `reportError()` seam but needs the native package installed and `EXPO_PUBLIC_SENTRY_DSN` set. |
| Backend lint cleanup | Code debt | Open, non-blocking | Tracked separately from the audit; not gating CI today. |
| Dark mode | Product decision needed | Open | Dead code today — decide to finish or remove. |

---

## 7. Recent history (most recent first, from `git log` + `REMEDIATION_STATUS.md`)

- **2026-07-11** — Tasks 6/7/8 from `docs/LATEST_TASKLIST.md` closed: Task 6 (decision-engine data-completeness indicator) and Task 7 (onboarding drop-off) were found already fixed in code, their remaining gaps (test coverage, a persistent finish-setup nudge) closed this session; Task 8 (`BANNED-1` write-time flag) is now code-complete with a new migration — **migration not yet run against any real database**, see §6 table and `docs/LATEST_TASKLIST.md` §14.1.
- **2026-07-09** — DOC (days-of-culture) display alignment fix (frontend now matches backend's 1-based convention).
- **2026-07-09 — Session 7**: closed the final 4 minor codeable audit items (ResetPassword password-policy parity, pond-context per-parameter confidence timestamps, dead `SupabaseService` removed, CreateCycle validation confirmed correct). **213/215 audit items done; only 2 external-only items remain.**
- **2026-07-09 — Session 6**: large parallel workflow (8 agents) closed 91 findings in one pass — unified IST/1-based DOC convention app-wide, idempotent cycle-close + harvest/transaction writes, N+1 query collapses, admin-gating on reference/news/disease-library writes, frontend error-vs-empty-state + pull-to-refresh + accessibility + store-reset cleanup. **Noted behavior changes to manually verify on-device**: DOC is now 1-based (+1 from before), harvest status renamed `harvested`→`completed`, and several catalog writes now require SUPER_ADMIN.
- **Sessions 1–5** (see `REMEDIATION_STATUS.md` for full detail): all CRITICAL + HIGH findings closed; Play Store legal copy filled; backend input-validation hardening (array/string size caps) across ~15 DTOs; dependency vulnerability cleanup; CI quality gate added (previously none existed).

---

## 8. How to keep this document honest

1. After any remediation session, audit run, or Play Store milestone: update §2–§7 above and bump the "Last updated" date at the top.
2. If `REMEDIATION_STATUS.md`'s open-item count changes, mirror it here immediately — that file is the primary source of truth for audit status; this file is a synthesized summary of it.
3. If an item in §5 (the "confidence caveat" list) actually gets independently verified (not just re-claimed), move it out of §5 and note the verification method in §7's history.
4. If a new major feature ships (something not in `docs/FEATURES.md` yet), add it to §2 and cross-check that `docs/FEATURES.md` itself got updated too — don't let this doc and the feature map drift apart.
5. Treat any gap between this doc's date and the latest commit date on `master` as a signal to re-run the update, not as something to ignore.
