# Pricing Inputs — Facts for a Future Pricing Strategy

**For:** whoever designs pricing next · **Date:** 2026-09-21 · **Status:** facts only, no recommendation
**Scope note:** this document does not propose a price, plan, or tier. It collects what pricing would depend on, with a source for every claim. Unknowns are marked **UNKNOWN**, never guessed.

---

## 1. What the product is

Source: `frontend/src/navigation/MainNavigator.tsx`, `frontend/src/screens/*`, `backend/src/*`, `docs/reference/UPCHECK_FEATURE_MATRIX.md` (authoritative as of 2026-06-16), `docs/reference/UPCHECK_LAUNCH_PLAN.md`, and the untracked specs in `docs/superpowers/specs/2026-09-19-*` and `2026-09-20-*`.

Brand name in-app: **Neerani** (product/company name: Upcheck).

| Module | Status | Notes / source |
|---|---|---|
| Farms / ponds / cycles (crops) CRUD, computed DOC | **Shipped** | `backend/src/farms`, `ponds`, `crops`; feature matrix §2 |
| Water quality logging + critical-threshold auto-alert | **Shipped** | `backend/src/water-quality`; feature matrix §3 |
| Feed records, feed products catalogue | **Shipped** (feed history screen unclear) | `backend/src/feed-records`, `feed-products`; matrix flags feed-history screen "verify/build" |
| Sampling (ABW), mortality, chemical, plankton, microbiology | **Shipped** | matrix §3, all WIRED |
| Health checks + disease records with library picker | **Shipped** | `backend/src/health`, `health-observations`, `disease`; matrix §3 |
| Disease early warning / risk engine | **Shipped**, but two of its weighted inputs (`regionalWssv` 20%, `regionWfd` 15%) are **never set by any screen** — a dead input, not a bug | `backend/src/disease-warning`; `docs/strategy/farm-location-strategy.md:40` |
| Treatments + banned-substance compliance | **Partially shipped** | FE has a banned-substance guard; matrix notes "no matching BE validation (FE-only guardrail)" as of 2026-06-16. The 2026-09-19 compliance spec (`docs/superpowers/specs/2026-09-19-disease-health-compliance-design.md`) designs server-side banned-substance + PHI/withdrawal enforcement and an export-eligibility badge — **specced**, implementation state not verified in this pass |
| Harvest (graded), price book, harvest timing | **Shipped**, two harvest paths coexist | `backend/src/harvests`, `harvest-plans`, `harvest-timing`, `products` (price feeds); matrix §2 flags a MISMATCH — backend `PATCH /crops/:id/harvest` exists but the app calls `POST /harvests` instead, "decide canonical harvest path" still open |
| Cycle result / cycle input record (PDF-style export for buyers/processors) | **Shipped** | `backend/src/reports/cycle-result.ts`, `input-record.service.ts`; referenced throughout the 2026-09-20 photos spec as "D4" |
| Expenses / finance, transactions, P&L, financial reports | **Shipped**, ownership-scoped | `backend/src/finances`, `transactions`, `reports`, `pnl`, `money-overview`; matrix §5 |
| Inventory (CRUD, low-stock, adjust) | **Shipped** | `backend/src/inventory`; matrix §5 |
| Tasks | **Shipped**, assign-to/priority UI incomplete | `backend/src/tasks`; matrix §3 |
| Team / attendance / leave (worker HR-style features) | **Shipped**, payroll not built | `backend/src/attendance`, `leave-requests`, `team-overview`; open issue #40 "[EPIC] Worker-specific dashboard and HR-style modules (attendance, leave, salary, schedule, tasks)" is still open, so **salary/payroll is explicitly not done** |
| Alerts / alert center, daily brief (morning briefing engine) | **Shipped** | `backend/src/alert-center`, `alerts`, `daily-brief` |
| News & market prices (count-based price feed by region) | **Shipped**, but region defaulting is a known gap | `backend/src/news`, `india/price-feed.entity.ts`, `india/pricing.service.ts`; `HarvestTimingScreen` still sends hard-coded default price bands rather than the farm's region (`docs/strategy/farm-location-strategy.md:39`) |
| Exports (cycle results, PDFs, CSV-style) | **Shipped** | `frontend/src/screens/export/ExportScreen.tsx`, `frontend/src/features/export/deliver.ts` |
| Offline-first sync | **Partial, not "offline-first"** | Per `UPCHECK_LAUNCH_PLAN.md` D1/D2 (locked decision): **no local DB (no WatermelonDB)** — this is "resilient online": reads need network, writes queue on failure via `frontend/src/sync/recordSync.ts` `saveRecord()` (client-minted UUID, idempotent replay) and drain on reconnect. Not full offline-first as originally specced |
| 6 languages | **Shipped**, not 100% parity | `frontend/src/i18n/locales/{en,hi,ta,te,bn,or}`; matrix §7 notes EN ~1391 keys vs ~1308 in other locales as of 2026-06-16 (open issue #38 "[i18n] Translation quality pass needed across all 6 locales") |
| Photos (attach to records, storage, retention, backup, acceptable-use) | **Spec approved, not implemented** as of 2026-09-20 | `docs/superpowers/specs/2026-09-20-photos-storage-and-privacy-design.md` header: "Status: spec approved (owner decisions below), not implemented." Today's actual state (same doc §1.1–1.2): one private R2 bucket, health-check photos are "write-only" (uploaded but not rendered back — bug P1), no delete endpoint (P2), nothing is deleted on record/farm/account deletion except avatars (P3), **no quota enforced yet** (P4) |
| Calculators / decision engines (feed, FCR, ADG, growth, aeration, lunar, harvest timing, disease risk, morning briefing) | **Shipped** | matrix §4, all WIRED |
| Simulations (day-by-day growth/feed/harvest projection) | **Shipped** | `backend/src/simulations`; matrix §4 |
| India-specific layers: acre/lakh units, count-based ₹/kg pricing, inland low-salinity mineral module | **Shipped per PRD** | `backend/src/india/units.service.ts`, `economics.service.ts`; `docs/reference/jala_teardown_india.md` (internal build-spec doc, not third-party data) describes these as the intended India differentiators — not independently verified against every screen in this pass |
| Deferred, external-dependency only (per `UPCHECK_LAUNCH_PLAN.md` D9, locked 2026-06-16) | **Not built, not planned for near-term** | IoT sensor integration, e-commerce marketplace checkout (needs Razorpay/UPI), public traceability web/QR, expert consultation network |
| Farm boundary map, pond dimension-history, cycle-analysis report, feeding-tray-checks UI | **Backend exists, no UI** (DEAD/PARTIAL) | matrix §2–5, listed as P2 "build to completion" backlog |
| Member role change, ownership transfer, email invitation to non-users | **Not shipped** (DEAD/PARTIAL) | matrix §2 |
| Location-based features (weather/tide/regional pricing) | **Promised in copy, not implemented** | `docs/strategy/farm-location-strategy.md` §1: GPS is collected and stored but "used for nothing" today; the doc is a recommendation, not yet built |

**Reading this table for pricing:** the "core record book" (farms/ponds/cycles/logs/harvest/finance/inventory/tasks/alerts) is the shipped, stable surface. Photos, full offline-first, payroll, and location-driven features are explicitly either specced-not-built or open backlog — pricing that assumes any of these exist today would be pricing a roadmap, not the product.

---

## 2. Who uses it / roles

Source: `frontend/src/permissions/capabilities.ts`, `backend/src/farm-access/farm-capability.ts` (the two are meant to mirror each other 1:1).

Four roles, one shared capability matrix on both frontend (display-only) and backend (enforced):

| Role | READ | WRITE_OPERATIONAL (logs) | WRITE_MANAGEMENT | VIEW_FINANCIALS | MANAGE_WORKERS | RECORD_HARVEST | VIEW/MANAGE_INVENTORY | OWNER_ONLY |
|---|---|---|---|---|---|---|---|---|
| **owner** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ / ✓ | ✓ |
| **manager** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ / ✓ | ✗ |
| **worker** | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ / ✗ | ✗ |
| **viewer** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ / ✗ | ✗ |

- `VIEW_FINANCIALS`, `VIEW_INVENTORY`, `MANAGE_INVENTORY`, `RECORD_HARVEST`, `WRITE_MANAGEMENT` are **owner-overridable per role or per member** (`farm.rolePolicy` / `member.capabilityOverrides`). `READ` and `OWNER_ONLY` are never overridable.
- One account (a phone/email login) can be a member of **multiple farms**, each with an independently-assigned role — there is no single global "account role." A user could be owner of one farm and worker on another.
- **What a "seat" could mean:** the code has no seat/license concept today. The natural unit visible in the data model is a **farm-membership row** (`farm_members`), i.e. one person on one farm, not a global per-account seat. A pricing model billing "per user" would need to decide whether a worker who logs into 3 farms is 1 seat or 3.
- Farms are free to create today (no cap found in code) — this is explicitly why the photo-quota spec chose a **per-account**, not per-farm, pool (`docs/superpowers/specs/2026-09-20-photos-storage-and-privacy-design.md` PD3: "a per-farm quota is gameable since farms are free to create").

---

## 3. Existing monetisation hooks in code

Source: repo-wide grep for premium/subscription/payment/billing/tier/plan terms, `frontend/src/features/remoteFlags.ts`, the photos spec.

- **No payment or billing code exists.** Grepping `backend/src` and `frontend` for `razorpay`, `stripe`, `billing`, `iap`, `purchase`, `react-native-iap` returns **zero hits** in `package.json` dependencies on either side. **Verified: Play Billing / in-app purchase is NOT integrated.**
  - Consequence: any subscription for app *features* sold to end users would need Google Play Billing (see §7 policy note) — and `react-native-iap` or equivalent is a **native module**, so wiring it up requires a new native build (per `AGENTS.md`'s "Local builds" cost class), not an OTA update.
- **F2 photo quota — the one plan/tier-shaped construct in the codebase, and it is explicitly not implemented yet.** From the approved-but-unbuilt photos spec:
  - Flat **1,000 photos and 1.5 GB per account**, whichever is hit first (`docs/superpowers/specs/2026-09-20-photos-storage-and-privacy-design.md` §F2, "PD3: Flat per account, not per farm").
  - The spec explicitly names this as a monetisation seam: `// ponytail: one number in a constants file, not a column. Becomes a per-plan column the day tiers exist (PD3).`
  - Designed with an 80%/100% warning ladder and a "clear space" flow, but **none of F0–F8 (including F2's quota enforcement) is implemented** — the spec's own status line says so.
- **Per-user quota overrides (admin):** not found in code as a shipped feature. The photos spec's admin surface (`POST /admin/photos/drain`, `AdminKeyGuard`) is about deletion-queue draining, not per-user quota overrides. Open issue #204 "Admin photo-quota management: usage, per-account limits, R2 vs ledger" (opened 2026-09-21) confirms per-account limits are **not yet built** — it is tracked future work.
- **Remote feature flags (`frontend/src/features/remoteFlags.ts`):** a PostHog-backed kill switch per feature (`news`, `teamTab`, `shop`, `simulators`, `diseaseEncyclopedia`, `diseaseDiagnosis`, `calculators`, `lunar`, `feedAdvisor`, `export`, `cycleAnalysis`, `tasks`, `dailyBrief`). This is an **on/off switch per feature globally**, evaluated server-side, defaulting to "on" — it is not a per-account entitlement system and has no plan/tier concept wired to it today. It could technically be repurposed as a feature-gate mechanism, but as built it answers "is this feature live for everyone," not "does this account's plan include this feature."
- No "premium," "pro," "subscription," or "payment" strings found elsewhere in `backend/src` or `frontend/src` beyond the photos-spec quota note above and the deferred marketplace-checkout mention in the launch plan (which needs Razorpay/UPI and is explicitly deferred, not built).

---

## 4. Cost structure

### 4.1 Services and current plans

| Service | Purpose | Current plan (owner-provided / code-verified) | What drives cost with scale | Public pricing (read 2026-09-21) |
|---|---|---|---|---|
| **Render** (`Upcheckapp-sg`, Singapore) | Backend NestJS API host | **Free plan** today; owner-provided note that **Starter (~$7/mo)** is recommended to stop cold-start sleep. `backend/render.yaml:6` shows `plan: free` | Compute tier (RAM/CPU), bandwidth, add-ons | Render free tier: web services sleep after 15 min idle, ~1 min cold-start. Starter (always-on, 512 MB/0.5 CPU) is **$7/mo**; Standard (2 GB/1 CPU) $25/mo, up to Pro Ultra $450/mo. Workspace-plan restructuring took effect 2026-04-23, replacing the old $19/member Professional plan with flat tiers + unlimited seats. [Render Pricing](https://render.com/pricing) |
| **Supabase** (Postgres + auth) | Primary database, `auth.users` | Region `ap-southeast-1` (owner-provided). **Plan tier UNKNOWN** — not read from production per task constraints; `mcp__supabase*` tools were not queried | DB size, monthly active users (MAU) via Supabase Auth, egress, compute add-ons, storage (though this app uses R2 for photos, not Supabase Storage) | Free: 500 MB DB, 50k MAU, 1 GB file storage, 5 GB egress, projects pause after 1 week idle, max 2 active projects. Pro: **$25/mo** base + $10/mo compute credit, 8 GB DB, 100k MAU, 100 GB storage, 500 realtime connections, then usage-based overage. Team: $599/mo. [Supabase Pricing](https://supabase.com/pricing) |
| **Cloudflare R2** (photos: bucket `upcheck-photos`) | Object storage for health/feedback/avatar photos | One private bucket, no CDN/public URL (`backend/src/storage/r2-storage.service.ts`). Owner-provided current usage: **2 photos, ~150 KB total** | GB stored, Class A (write/list) and Class B (read) operations; **zero egress fee** | Standard storage **$0.015/GB-month**; Class A ops **$4.50/million**; Class B ops **$0.36/million**. Free tier: 10 GB-month storage, 1M Class A ops, 10M Class B ops, free egress. [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing) (read 2026-09-21) |
| **Upstash Redis** | 2FA token TTL / rate-limit store; app degrades to in-memory if unset (`REDIS_URL` unset locally, and `.env.example` marks it optional) | Plan **UNKNOWN** — not verified whether configured in prod; `render.yaml:101-103` shows `REDIS_URL: sync: false` (must be set manually in Render dashboard if used) | Commands/month, storage beyond 1 GB free, bandwidth beyond 200 GB free | Free tier: 256 MB, 500k commands/month. Pay-as-you-go: **$0.20 per 100k commands** + $0.25/GB-month beyond first free GB; bandwidth free to 200 GB/mo then $0.03/GB; idle DB costs $0. [Upstash Pricing](https://upstash.com/pricing) (read 2026-09-21) |
| **Vercel** | Admin dashboard host (`admin/`) | Plan **UNKNOWN** | Deploying seats, function invocations, bandwidth, Active CPU | Hobby: free, hard caps (100 GB bandwidth, 1M invocations, 4 CPU-hours, 360 GB-hours memory) — service stops rather than overage-bills. Pro: **$20/deploying-seat/month**, includes $20 usage credit/seat; 1 TB data transfer + 10M edge requests included free. [Vercel Pricing](https://vercel.com/pricing) (read 2026-09-21) |
| **Expo EAS** | Native builds + OTA updates | Plan **UNKNOWN** | Builds/month, OTA update MAUs, bandwidth | Free: 15 Android + 15 iOS builds/month, updates for 1,000 MAU, 100 GiB edge bandwidth — SDK/CLI always free. Starter **$19/mo** ($45 build credit, 3k update MAU). Production **$199/mo** ($225 build credit, 50k update MAU, 2 concurrencies). [Expo Pricing](https://expo.dev/pricing) (read 2026-09-21) |
| **Sentry** (EU region, `de.sentry.io`) | Crash/error reporting, both frontend and backend | Plan **UNKNOWN**; `frontend/app.config.ts:76-83` names org "upcheck-technologies-private-l," project "upcheck-app," DSN hardcoded as fallback | Error/event volume, replays, spans, log GB | Free tier exists; Team plan **$26/mo** (annual) for 50k errors, 5M spans, 50 replays, 5 GB logs; overage from $0.0003625/error down to $0.00015/error at 20M+. [Sentry Pricing](https://sentrypricing.com/) (read 2026-09-21) |
| **PostHog** (US region) | Product analytics + remote feature flags; consent-gated (SDK only loads post analytics-consent per `remoteFlags.ts` comment) | Plan **UNKNOWN**, likely free tier given scale (11 users) | Events/month beyond 1M free, session recordings, feature-flag requests | First **1M events/month free**; then $0.00005/event stepping down to $0.000009/event at 250M+. 97% of PostHog accounts reportedly stay on free tier. [PostHog Pricing](https://posthog.com/pricing) (read 2026-09-21) |
| **Brevo** | Transactional email (SMTP relay + API), `backend/render.yaml:81-97` | Plan **UNKNOWN** | Emails/day (free: 300/day) and contacts | Free: 300 emails/day, 100k contacts stored, always carries a "Sent with Brevo" footer. Starter $9–$69/mo for 5k–100k emails/month, no footer. [Brevo Pricing](https://help.brevo.com/hc/en-us/articles/208589409) (read 2026-09-21) |
| **Truecaller SDK** | Phone-number one-tap login (Android) | Integrated per `TruecallerAuth.md`, client ID in `app.config.ts:2` | Per-verification or flat SDK licensing — **UNKNOWN**, Truecaller's business pricing is not public | Not found in public pricing pages; **UNKNOWN**, likely a negotiated/free developer-tier SDK agreement — needs owner confirmation |
| **Google Sign-In** | OAuth login | Free (standard Google OAuth, no cost) | N/A | Free |
| **Play Console** | App distribution | **$25 one-time** registration fee (industry-standard, non-recurring) | N/A beyond the one-time fee; Play doesn't charge hosting/distribution fees, only takes a cut of any in-app purchase/subscription revenue if IAP is ever added (standard 15–30% Play Billing fee, not itemized here since IAP isn't integrated) | [Play Console fee, various sources, read 2026-09-21] |

### 4.2 Per-account cost model (rough, clearly estimated)

**Assumptions (stated explicitly — all estimates, not measurements):**
- "Active farm" = one farm with at least one active cycle, logging roughly daily.
- Photos per farm/month: the **F2 spec caps** give a per-record ceiling (2 for receipts, 2 for weighing slips, 2 for input labels, 2 for PCR certs, 1 each for pond/farm/water-colour/feed-tray) but photos are **not yet built**, so assume a conservative **10–20 photos/farm/month** once F5 ships, at ~230 KB/photo (1600px WebP full + 400px thumb per the spec's compression settings) → **~2.3–4.6 MB/farm/month** in R2, well inside R2's cheap per-GB rate.
- DB rows: each farm generates roughly 1 cycle + a handful of ponds + daily log rows across water-quality/feed/sampling/mortality/health/disease/treatment/harvest/inventory/task/attendance tables — call it **~50–150 rows/farm/month** at a few hundred bytes each; trivially small relative to Supabase's 500 MB (free) / 8 GB (Pro) caps even at 10,000 farms (≈0.5–1.5M rows/month fleet-wide, well under typical Postgres row-count limits — the **byte** budget, not row count, is what caps out first).
- Requests: each active user session touches the API on the order of **tens of requests/day** (dashboard reads, log writes, offline-queue drains) — call it **~50 requests/user/day**.

| Farms | Rough monthly cost driver | Estimate | Basis |
|---|---|---|---|
| **10** | Everything comfortably inside every service's free tier (Supabase 500 MB, R2 10 GB free, PostHog 1M events, Brevo 300 emails/day) | **~$0–7/mo** | The only likely paid line is Render Starter ($7/mo) if always-on uptime is wanted; everything else free-tier |
| **100** | Still likely inside free tiers for R2/PostHog/Brevo; Supabase DB may approach 500 MB depending on log verbosity and require Pro | **~$7–35/mo** (Render Starter + possible Supabase Pro $25) | DB size is the first likely trigger, not compute or photos |
| **1,000** | Supabase Pro near-certain ($25+ base, compute/egress overage likely); R2 still cheap (≈GB-scale storage, a few dollars); Render likely Standard tier for headroom; Sentry/PostHog likely into paid tiers depending on event volume | **~$100–300/mo**, rough order of magnitude | Multiple services cross their free-tier line around this scale; no measured data exists for this app's actual per-farm request/error volume |
| **10,000** | Supabase likely Team-tier territory or heavy Pro overage; R2 storage in the tens-of-GB range (cheap, ~$1–5/mo just for storage) but operations cost starts to matter; Render needs a higher compute tier; Sentry/PostHog overage becomes real; Brevo needs a paid tier for transactional volume | **~$500–2,000+/mo**, wide range | This is a rough scaling estimate, not a capacity-tested number — the app has never run at this scale; **UNKNOWN** how request/error/photo volume per farm actually behaves under real usage |

**Caveat stated plainly:** every number above 10 farms is an estimate built on assumptions, not measured production data (production has never carried this load — see §5). Treat the 1,000/10,000-farm rows as directional, not a budget.

---

## 5. Usage today

- **11 users** (owner-provided, 2026-09-21).
- **No paying customers.**
- **Production review status:** build 14 is in Google Play review (owner-provided; not independently verified against the Play Console, per task constraint not to query production).
- Production database was **not queried** for this brief (per task constraints — no production DB access).

---

## 6. Market context (brief, sourced)

**Caveat:** the only India-specific competitor pricing found is anecdotal/press-sourced, not from official pricing pages (none of these apps publish public price lists) — treat every number below as **unverified until confirmed independently**.

| Signal | Detail | Source |
|---|---|---|
| Farm size, Andhra Pradesh (India's dominant shrimp-farming state, ~65–70% of national production per `jala_teardown_india.md`, itself an internal build-spec doc, not a primary source) | Smallholder farms typically **under 2 hectares (~4.9 acres)**; semi-intensive ponds commonly **0.4–2 hectares per pond**; small-medium farms often **0.5–5 acres** | [Sustainable Fisheries Partnership — Shrimp Farming in Andhra Pradesh](https://sustainablefish.org/shrimp-farming-in-andhra-pradesh-understanding-small-scale-farmers-opportunities-for-landscape-level-improvements/) (read 2026-09-21) |
| Ponds per farmer | No definitive average found; one illustrative example: a 25-acre farmer split into **12 ponds** (~1.5 acres each) | [Agrifarming — shrimp/prawn farming success story](https://www.agrifarming.in/making-60-lakh-per-year-from-prawn-shrimp-farming-a-success-story-of-an-aqua-farmer) — **single anecdote, not a statistic** |
| Seasonality | India runs **1–2 crops/year**: main crop stocked Jan–Mar (harvest Apr–Jun), second crop Jun–Aug (harvest Sep–Nov, monsoon salinity-drop risk); winter carries high WSSV (White Spot) risk from temperature swings, and many farms idle Dec–Jan | `docs/reference/jala_teardown_india.md` §9 — internal engineering doc reconstructing farming calendar, not a primary agricultural source |
| Competitor: **Aquaconnect (FarmMOJO)** | Reported pricing signals conflict across sources: one source cites **₹500/pond** for a basic plan; another cites **₹2,000/pond/culture-cycle**. Aquaconnect is AI-powered, India-focused, disease/loss-prevention positioning | [Inc42 — Aquaconnect](https://inc42.com/startups/aquaconnect-shrimp-farmers-app/), [Outlook Business — "Shrimp farmer finds MOJO"](https://www.outlookbusiness.com/enterprise/big-idea/shrimp-farmer-finds-mojo-5654) (read 2026-09-21) — **pricing figures are press-reported, not from an official price list; treat as unverified** |
| Competitor: **AquaExchange** | Reported pay-as-you-use model at **$2/acre/month**; base app itself reported as free, IoT hardware + financial services are the paid layer; positions itself as a "full-stack OS" (farm mgmt + IoT + financial services) for India's aquaculture economy | [Inc42 — AquaExchange](https://inc42.com/startups/aquaexchange-is-building-the-os-for-indias-shrimp/), [Global Seafood Advocate](https://www.globalseafood.org/advocate/iot-tools-for-shrimp-farming-in-india-earn-aquaexchange-a-spot-as-a-responsible-seafood-innovation-award-finalist/) (read 2026-09-21) — **unverified against an official price page** |
| Competitor: **Jala** (Indonesia, not India) | No India pricing found. `docs/reference/jala_teardown.md` and `jala_teardown_india.md` are **internal reverse-engineered feature/build specs authored for this project**, not Jala's own published pricing or public documentation — useful for feature comparison, not a pricing source |
| Willingness-to-pay signals | **UNKNOWN.** No survey, interview, or market-research data found in the repo or via search specific to Upcheck/Neerani's target farmers. The per-pond and per-acre competitor figures above are the closest available proxy, and they are themselves unverified press figures |
| Other named competitors (eFishery) | eFishery is **Indonesia-focused** (feed/aquaculture fintech), not primarily an India shrimp-management app; no India-specific pricing found in this pass — **not researched in depth**, flagged as a gap |

---

## 7. Constraints the pricing must respect

- **DPDP (India's Digital Personal Data Protection Act 2023 + DPDP Rules 2025, notified 14 Nov 2025, most operative rules commence ~May 2027).** `docs/superpowers/specs/2026-09-20-compliance-privacy-and-store-readiness-design.md`:
  - ML training on farmer data is **a separate opt-in, default off**, consent recorded with a version (§C3, "CD4: Training models on farmer data — Separate opt-in, added now. Default off, consent recorded with a version"). Any future pricing tier that depends on model quality/data network effects cannot assume broad data access — it is opt-in only.
  - Consent (analytics, ML training, terms) is being formalized via a `user_consents` table (§C2.1) — not yet shipped per that spec's own phasing.
- **Photo acceptable-use rule (F8), lawyer-gated.** The photos spec (`2026-09-20-photos-storage-and-privacy-design.md` §F8) locks photos to "farm records only" with a permanent-ban enforcement ladder for misuse, and explicitly states its draft Terms clause "needs a lawyer's pass before it ships." Any pricing tied to photo storage inherits this: the quota mechanism (§F2) is designed to become per-plan ("becomes a per-plan column the day tiers exist") but is **not built**, and the acceptable-use/ban framework must exist before storage becomes a monetized, contested resource (an account fighting over paid storage needs the ban/appeal machinery already specced).
- **Play policy on digital goods.** Subscriptions for in-app *features* must use Google Play Billing (per standard Play policy — not independently re-verified against Play's current developer terms in this pass, flagged as **UNKNOWN, verify against current Play Console policy before committing to a subscription model**). Play Billing/IAP is **not integrated today** (§3) and would require a native build to add (`react-native-iap` or equivalent is a native module). Physical/real-world services (e.g. hardware, consulting) can legally bypass Play Billing under Play's real-world-goods exception, but Upcheck has no such offering today — the deferred marketplace/IoT features (§1) would be the natural place for that distinction, not the core app subscription.
- **Offline-first is only partially real.** Per the locked launch-plan decision (D1/D2), the app is "resilient online" with a write-queue, not full offline-first (no local DB). A pricing model that assumes reliable offline usage in poor-connectivity farm areas should account for this gap, not the aspirational blueprint.
- **6 languages, uneven parity.** en/hi/ta/te/bn/or; non-English locales are ~83 keys short of English as of the 2026-06-16 feature matrix, and open issue #38 tracks a translation-quality pass. A tier or feature gate must ship in all 6 locales per `AGENTS.md`'s i18n landmine, or it silently breaks for 5/6 of the language base.
- **Farmers' low bandwidth / workers vs owners.** The photo spec explicitly designed around low-bandwidth, camera-first capture (client-side resize before upload) and a record that "still saves offline without photos — nothing is silently lost." Any pricing UX (paywalls, upgrade prompts) needs to degrade the same way: a blocked feature must never block the underlying record from saving. Workers have no financial visibility (`VIEW_FINANCIALS` excludes worker/viewer by default) — a worker-facing paywall prompt referencing cost/pricing would leak information a worker's role is designed not to see.

---

## 8. Open questions for the owner

1. Supabase plan/tier today, and its actual DB size, MAU, egress usage — not queried in this pass (task constraint: no production DB access).
2. Upstash Redis: is it actually configured in production (`REDIS_URL` set in Render dashboard), or is the app running on the in-memory fallback? Its plan, if configured.
3. Vercel plan for the admin dashboard.
4. Expo EAS plan/tier, and actual monthly build/update volume.
5. Sentry and PostHog actual plan tiers and current event/error volumes (vs. the free-tier assumptions in §4.2).
6. Truecaller SDK commercial terms — free developer tier, per-verification cost, or flat license? Not publicly documented.
7. Is there a target date or trigger for turning on Play Billing / in-app purchase, given it requires a native build?
8. Does the owner have any existing farmer interviews, survey data, or informal willingness-to-pay conversations not captured in this repo, to ground §6's market-context gap?
9. What unit does the owner want pricing to key off — per farm, per account (as F2's photo quota already assumes), per pond, per acre (as AquaExchange does), or per season/cycle (as Aquaconnect's ₹/cycle figure suggests)? The codebase's only natural unit today is the farm-membership row (§2); nothing currently distinguishes a "seat."
10. Is a free tier expected to remain permanently free (given 11 users and no revenue yet), or is monetisation expected before or alongside the Play production release?
11. Should the eventual pricing model treat workers/viewers as free "additional seats" under an owner's plan, given their capability set is a strict subset of owner/manager — or does every farm-membership row cost the same regardless of role?

---

*Sources are cited inline per claim. Facts owner-provided in the task brief (11 users, Render free plan + Starter recommendation, Supabase region, R2 bucket contents, build-14 review status) are marked "owner-provided." All public pricing was read 2026-09-21 and is subject to change — verify before using in a live pricing decision.*
