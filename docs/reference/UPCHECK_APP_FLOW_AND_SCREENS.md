# Upcheck — App Flow & Screens (UX / IA Spec)

> **Purpose:** The shared map of *how the app flows and what every screen does*, so the team builds in one direction and minimizes rework.
> **Design north star:** A shrimp farmer (often low-literacy, 2 GB Android phone, sun glare, wet hands, patchy network) must reach **any feature in ≤3 taps** and complete a daily log in **under 60 seconds with almost no typing**.
> **Grounded in the real code** (route names match `frontend/src/navigation/RootNavigator.tsx`). Aligns with `UPCHECK_LAUNCH_PLAN.md` (decisions D1–D10), `UPCHECK_FEATURE_MATRIX.md` (what's wired), and `UPCHECK_DESIGN_SYSTEM.md` (binding visual standard).
> **Roles at launch:** all four — **Owner, Manager, Worker, Viewer** (D3). Every in-app feature is built; only four external-dependency features are deferred (D9).
> **Professional standard (D10):** no emojis anywhere; icons only from MaterialCommunityIcons; every screen passes the Anti-"vibe-coded" checklist in `UPCHECK_DESIGN_SYSTEM.md`. The icon names below are MaterialCommunityIcons glyphs, not decorative symbols.

---

## 1. Farmer-friendly UX principles (apply to every screen)

| # | Principle | Concrete rule |
|---|-----------|---------------|
| P1 | **Pond-first thinking** | The farmer thinks in *ponds*, not menus. Every data action starts from "which pond?" The **Pond Dashboard is the operational home**. |
| P2 | **Icon + label, always** | Never an icon alone, never text alone. Big, recognizable icons (water drop, feed corn, scale, shrimp) + a short word in the farmer's language. |
| P3 | **Tap, don't type** | Numbers via **steppers / number pads**; choices via **chips & pickers**; dates via calendar. Free text is optional and last. Pre-fill the obvious (today's date, active cycle, last value). |
| P4 | **≤3 taps to anything** | Home → hub → action. No feature buried 4+ levels deep. The "Quick Log ＋" FAB is the 1-tap shortcut for the 5 daily actions. |
| P5 | **One primary action per screen** | A single large bottom button ("Save", "Next"). Secondary actions are smaller and above it. |
| P6 | **Vernacular-first** | Telugu + English at launch; the rest fall back to English. Aquaculture shorthand (FCR, DOC, PL, ABW) stays as-is; everything else is translated. |
| P7 | **Always tell the truth about state** | Offline banner; "saved — will sync" toast; skeletons not spinners; clear empty states with a "do this next" button. Never a blank screen. |
| P8 | **Big targets, high contrast** | Min 48×48 dp touch targets; large fonts (≥16 sp body, ≥20 sp numbers); color + icon for status (never color alone) for outdoor readability. |
| P9 | **Forgiving** | Confirm destructive actions; everything editable/deletable; no dead ends — every error offers a next step. |
| P10 | **Progressive disclosure** | Workers see a tiny surface (today's ponds + log). Owners see portfolio + money. Advanced tools (engines, simulations, finance) live in hubs, not in the daily path. |

---

## 2. Information architecture (the spine)

5-slot bottom bar with a center **Quick Log ＋** FAB (kept — it's an excellent farmer pattern). The old "More" graveyard becomes an **organized Menu** with labeled sections so nothing is lost.

Icon names in brackets are MaterialCommunityIcons glyphs (per `UPCHECK_DESIGN_SYSTEM.md` §4).

```
BOTTOM TAB BAR  (always visible in the main app)
+-------------+-------------+--------------+-------------+-------------+
| Home        | Farms       |  Quick Log   | Insights    | Menu        |
| [view-      | [barn]      |  [plus] FAB  | [chart-box] | [menu]      |
|  dashboard] |             |   (center)   |             |             |
+-------------+-------------+--------------+-------------+-------------+

HOME  (role-adaptive)
   - Owner:  stat strip (active ponds / total ponds / low-stock / today feed)
             + Your Ponds + Lunar card + Farm Glance + Quick Actions + critical-alert banner
   - Manager: today's operations + pending/overdue tasks + worker summary + alerts
   - Worker:  today's ponds + large "Log now" + recent entries (no money)
   - Viewer:  read-only portfolio/production summary (no money unless granted; no actions)

FARMS  (hierarchy: Farm -> Pond -> Cycle)
   - Farms List -> Farm Detail -> Pond Dashboard  (operational hub)
        - Members (Owner full / Manager: workers only) / Invite member
        - Create Pond (Owner, Manager)
   - Pond Dashboard (operational hub)
        - Active Cycle card (DOC / FCR / biomass / last sampling)
        - Quick actions: Water / Feed / Sampling / Mortality / Treatment
        - Recent records + per-log History
        - Cycle Detail -> Cycle History (past cycles & metrics)
        - "Need disease help?" -> Disease Library / Diagnosis

QUICK LOG  (modal FAB - 1 tap from anywhere)
   Pick pond -> [ Water Quality / Feed / Daily Routine / Sampling / Mortality / Measurements / Open Pond ]

INSIGHTS  (Reports + decision tools)
   - Dashboard summary & Financial report (Owner/Manager; Worker = own-pond, no money; Viewer = read, money if granted)
   - Calculators Hub  (FCR / Daily Feed / Free Ammonia / Product Dosage / Growth & Harvest ...)
   - Engines Hub      (Feed Advisor / Harvest Timing / Disease Risk / Aeration / Lunar / Crop P&L / Morning Briefing)
   - Simulations
        (Crop P&L and money-bearing views hidden for Worker)

MENU  (organized, sectioned)
   - ACCOUNT:       Profile / Settings (language, theme, notifications) / Alerts
   - KNOWLEDGE:     Disease Encyclopedia & Diagnosis / News / Reference (species/hatchery/broodstock)
   - STOCK & MONEY: Inventory / Expenses / Transactions / Cost reports / Shop / Feed Products
   - HELP:          Help Center / About
   - Sign out
```

**Why this shape:** Home answers "what should I care about now?"; Farms/Pond is where work happens; the ＋ FAB removes navigation from the daily log; Insights holds everything analytical; Menu holds everything reference/account. Every one of the app's ~80 screens has exactly one obvious home (full map in §6).

---

## 3. Global UI standards

- **Touch & type:** 48 dp min targets; 16 sp body, 20–28 sp for key numbers; number-pad keyboards for metrics; steppers (− / +) for counts; chips for enums (feed type, severity, cause); calendar for dates (default = today).
- **Color/status:** semantic tokens already in `theme/`. Status = **icon + color + label** (e.g. ⚠️ orange "High" — never just orange). Critical = red, warning = orange, ok = green, info = blue.
- **Offline (D2):** persistent banner when offline; on save while offline → optimistic insert + "Saved — will sync when online" toast; show queued-count. (Localize the banner — currently hardcoded English.)
- **Empty / loading / error (P7):**
  - *Empty:* friendly illustration + one-line reason + a primary button ("Add your first pond").
  - *Loading:* skeleton cards (never a bare spinner on Home).
  - *Error:* plain-language message + Retry; network errors map to a friendly string (already in `api/client.ts`).
- **Role visibility (P10):** hide — don't disable — owner-only controls for workers (`useMembershipStore.isWorker(farmId)`). A worker never sees money, member management, pond create/delete, or Crop P&L.
- **Header:** every screen has a back affordance and a title in the farmer's language; a small "?" help icon links to the relevant Help topic.

---

## 4. Core journeys (the flows to build against)

### J1 — First-time onboarding (target: home in <90 s)
```
Splash (logo, ~2s, restore token)
  └─ if token valid → Home
  └─ else → Login
Login  ─ choose: Phone (Truecaller) ▸ Google ▸ Email ▸ Email-OTP
  └─ (new user) Register → pick "I am: Owner / Worker"   [sets primary_role, NOT permissions]
        ├─ Owner  → Create Farm (name, location) → "Add your first pond?" (soft) → Home (Owner)
        └─ Worker → Home (Worker)  [empty state: "Ask your owner to add you to a farm"]
```
*Worker-with-no-farm must get a friendly empty state, not a crash (AUTH-3).* *Reset-password link needs an in-app landing (Gap A1/AUTH-2).*

### J2 — Worker daily routine (the 60-second loop)
```
Open app → Home (Worker): "Today" + ponds
  └─ Tap ＋ Quick Log → pick pond → tap "Feed"
       → feed type (chips) → quantity (stepper/number pad) → Save
       → toast "Saved" → back to Home   (≈4 taps, ~30s)
  └─ Daily Routine tile = guided checklist (water → feed → tray check) for the day
```

### J3 — Owner daily check
```
Home (Owner): stat strip + critical alerts + ponds glance
  └─ Tap a pond → Pond Dashboard: DOC, FCR-to-date, biomass, recent records, alerts
  └─ Insights → Financial report / Crop P&L / Feed Advisor
  └─ Farms → Members → invite worker (by phone/email lookup)
```

### J4 — Log → see history (any record type)
```
Pond Dashboard → Quick action (e.g. "Water Quality")
  → Log form (pre-filled pond + active cycle + today) → Save
  → appears in "Recent records" → "View all" → History list (filter, edit, delete)
```

### J5 — Disease help (lite, launch scope)
```
Mortality log (abnormal count)  OR  Menu → Disease Encyclopedia
  → Browse/search library → Disease detail (symptoms, prevention, treatment)
  → "Report in my pond" → Disease record (pick disease, severity, photo) → linked to cycle
```
*(Full symptom-matcher & expert consult are post-launch.)*

### J6 — Decision tools
```
Insights → Calculators Hub → e.g. Daily Feed (enter biomass/ABW) → result
Insights → Engines Hub → Feed Advisor / Harvest Timing / Disease Risk / Aeration / Lunar
Insights → Simulations → create what-if → results
```

---

## 5. Screen-by-screen specs (anchor screens)

For each: **purpose · key elements · primary action · role notes**. Route names are the actual stack routes.

### 5.1 `Login` / `Register` / `OtpLogin` / `TruecallerLogin` / `TwoFactorChallenge`
- **Purpose:** get in with the least friction. Phone (Truecaller One-Tap) is the hero on Android; Google and Email below; Email-OTP as fallback.
- **Elements:** big method buttons (icon+label), one input at a time, clear error text, "?" help.
- **Primary:** "Continue". **Role:** Register asks Owner/Worker (sets default path only).

### 5.2 `Welcome` / `CreateFarm` / `PondSetup`
- **Purpose:** owner's first farm + first pond, minimal fields (farm name, location; pond name, area, depth, type).
- **Primary:** "Create" → soft prompt to add a pond (dismissible). **Role:** owner path.

### 5.3 Home (`Dashboard`) — **role-adaptive**
- **Owner:** greeting + avatar→Settings; **stat strip** (active ponds · total ponds · low-stock · today's feed); **Your Ponds** (status chips: Active/Idle) with "View all"; **Lunar** card; **Farm Glance** cards; **Quick Actions** (Farms, Calculators, Simulate, Settings); critical-alerts banner on top.
- **Worker:** greeting + **Today's ponds** + a big **"Log now"** button (opens Quick Log) + **recent entries**. No money, no portfolio, no member tools.
- **Primary:** the ＋ Quick Log FAB (center tab). **Build delta:** make Home branch on `isWorker` (today it's one layout).

### 5.4 Farms (`Farms` → `FarmDetail` → `FarmMembers` / `AddWorker`)
- **Farms List:** card per farm (name, pond count, active cycles, alert count). Owner sees "＋ Create Farm".
- **Farm Detail:** ponds list + "Add Pond" (owner/—); entry to **Members** (owner) and farm settings.
- **Members:** list with role; owner can invite (phone/email lookup) & remove worker. Worker sees read-only.

### 5.5 `PondDashboard` ★ — the operational hub (most-used screen)
- **Header:** pond name · area/depth · status (Empty / Active DOC n / Between cycles).
- **Active Cycle card:** DOC · estimated biomass · FCR-to-date · days since last sampling.
- **Quick actions row:** Water · Feed · Sampling · Mortality · Treatment (Treatment = owner/manager-tier; worker sees the first four).
- **Recent records** (last 5, mixed) → per-type **History**.
- **Cycle:** "Start Cycle" (owner) / "Close Cycle"; link to **Cycle Detail** & **Cycle History**.
- **"Need disease help?"** → Disease Library.

### 5.6 Quick Log (`QuickLog` modal) — the daily shortcut
- **Flow:** pick pond (chips of the user's ponds) → grid of big actions: **Water Quality · Feed · Daily Routine · Sampling · Measurements · Open Pond**.
- **Empty state:** no ponds → "Create your farm" CTA.
- **Build delta:** consider adding **Mortality** to the grid (it's a daily worker action).

### 5.7 Log-form pattern (`WaterQualityLog`, `FeedLog`, `SamplingLog`, `MortalityLog`, `TreatmentLog`, `ChemicalLog`, `PlanktonLog`, `MicrobiologyLog`, `DiseaseLog`, `HarvestLog`)
- **Shared anatomy:** context header (pond + active cycle + date, pre-filled) → grouped inputs (number pads/steppers/chips) → optional notes → optional **photo** (mortality/disease) → single **Save**.
- **On save:** threshold check may raise an alert (water quality); success toast; return to Pond Dashboard with the entry in Recent.
- **Build deltas:** add **photo picker + ≤800 px compression** (Gap L3); DiseaseLog uses library `severityLevel` not hardcoded "Mild" (L2); feed/treatment chips for type/brand.

### 5.8 History pattern (`*History` screens)
- List sorted newest-first; filter by date/cycle; row → edit/delete (forgiving). Charts where useful (sampling growth, FCR trend) but **not on the worker daily path** (P10/PERF).

### 5.9 `CycleDetail` / cycle history
- Cycle metrics (DOC, FCR, survival, total feed), record summary, disease incidents, harvest. Close/Complete (owner). Past cycles comparable per pond.

### 5.10 Insights (`Reports`, `CalculatorHub`, `EnginesHub`, `SimulationList`)
- **Reports:** dashboard summary + financial report (owner; worker = own-pond, no money) + (later) cycle analysis + charts.
- **Calculators Hub:** tiles → Daily Feed, Cultivation Performance, Free Ammonia, Product Dosage, Growth&Harvest. Each: inputs → instant result + plain-language interpretation.
- **Engines Hub:** Feed Advisor, Harvest Timing, Disease Risk, Aeration, Lunar, **Crop P&L (owner only)**, Morning Briefing, Daily Routine, Measurements.
- **Simulations:** list/create/results/delete.

### 5.11 Menu (`More`) + `Settings` + `Profile` + `Notifications` + `Help`/`About`
- **Menu:** sectioned (Account / Knowledge / Stock & Money / Help) — already structured; keep the section headers and farmer-friendly labels.
- **Settings:** language picker (native names), theme, notification toggles, 2FA, legal links.
- **Profile:** name/phone/avatar, **Delete Account** (cascades).
- **Notifications/Alerts:** list, unread badge, mark-read, delete.
- **Help Center:** FAQs + contact (WhatsApp/phone) — offline-aware (live channels marked "online only").

### 5.12 Disease Encyclopedia (`DiseaseList` → `DiseaseDetail`)
- Search + severity-sorted list (CRITICAL first, red/orange/yellow badges) → detail (overview, symptoms+photos, cause, prevention, treatment) → "Report in my pond".

---

## 6. Full screen catalog → IA placement (so nothing is orphaned)

Every existing route, where it lives, who sees it, and its disposition (per the D9 completion decision). **BUILD/COMPLETE** = finish to professional quality and ship · **VERIFY** = confirm on device first · **DEFER(ext)** = only the four external-dependency features. A `features.ts` flag may keep a screen dark *while it is being finished*, but no in-app feature ships hidden.

| Route(s) | Lives under | Role | Disposition |
|---|---|---|---|
| Login, Register, ForgotPassword, OtpLogin, TruecallerLogin, TwoFactorChallenge, PrivacyPolicy, Terms | Auth (pre-login) | all | SHIP (add reset-password landing) |
| Welcome, CreateFarm, PondSetup | Onboarding | owner | SHIP |
| Dashboard (Home) | Tab: Home | all (adaptive) | SHIP (add worker layout) |
| Farms, FarmDetail, FarmMembers, AddWorker | Tab: Farms | owner full / worker read | SHIP |
| CreatePond, PondDashboard, CreateCycle, CycleDetail | Farms ▸ Pond | owner/worker | SHIP |
| QuickLog | Center FAB | all | SHIP (consider +Mortality) |
| WaterQualityLog, FeedLog, SamplingLog, MortalityLog, TreatmentLog, ChemicalLog, PlanktonLog, MicrobiologyLog, DiseaseLog, HarvestLog | Pond ▸ Log / Quick Log | worker+ (Treatment owner-tier) | SHIP (add photo+compression) |
| WaterQualityHistory, FeedHistory, SamplingHistory, MortalityHistory, TreatmentHistory, ChemicalHistory, PlanktonHistory, MicrobiologyHistory, DiseaseHistory, HarvestHistory | Pond ▸ History | all (own-pond for worker) | SHIP (verify FeedHistory exists) |
| WeeklyChemistry, Measurements, DailyRoutine | Insights/Engines + Quick Log | all | SHIP |
| CalculatorHub, CultivationPerformance, DailyFeedCalculator, ProductAmount, FreeAmmonia, GrowthAndHarvest | Insights ▸ Calculators | all | SHIP |
| EnginesHub, FeedAdvisor, HarvestTiming, DiseaseRisk, Aeration, Lunar, MorningBriefing | Insights ▸ Engines | all | SHIP |
| CropPnl | Insights ▸ Engines | Owner, Manager | BUILD (hidden for Worker; Viewer if cost-share granted) |
| SimulationList, SimulationCreate, SimulationResults | Insights ▸ Simulations | Owner, Manager | BUILD |
| Reports | Tab: Insights | Owner/Manager; Worker own-pond; Viewer read | BUILD (verify charts, farmId) |
| DiseaseList, DiseaseDetail | Menu ▸ Knowledge | all | BUILD |
| NewsList, NewsDetail | Menu ▸ Knowledge | all | BUILD |
| Reference | Menu ▸ Knowledge | Owner, Manager | BUILD (verify/confirm DB tables, then complete UI) |
| Inventory, InventoryDetail | Menu ▸ Stock & Money | Owner/Manager full; Worker stock-in/out | BUILD |
| Expenses, Transactions, Cost reports | Menu ▸ Stock & Money | Owner, Manager | BUILD (complete cost-management suite) |
| Shop, FeedProducts | Menu ▸ Stock & Money | all (browse) | BUILD |
| HarvestPlans | Pond/Cycle + Menu | Owner, Manager | BUILD |
| Profile, Settings, TwoFactor, Notifications | Menu ▸ Account | all (own) | BUILD |
| Help, About, Legal | Menu ▸ Help | all | BUILD |
| TaskList (full task module) | Tasks (Home/Pond) | Owner/Manager create+assign+verify; Worker own assigned | BUILD (recurrence, time windows, verification — blueprint §17) |
| Farm boundary map UI, PondDimensionHistory, Cycle-analysis report, FeedingTrayChecks screen | give each a home in the IA | per role | BUILD (build the missing UI + nav entry) |
| Member invitations (incl. non-users), ownership transfer, Manager & Viewer roles, rule-based disease diagnosis (symptom matcher), RLS | Farms/Members, Auth, Disease | per role | BUILD |
| Expert consultation, marketplace/Shop checkout, IoT sensor dashboard, traceability public web/QR | — | — | DEFER(ext) — external blockers only; in-app shell may exist but stays dark |

> Result: **every in-app feature ships complete and reachable.** Nothing in-app is left hidden or half-built; only the four external-dependency features stay dark behind config.

---

## 7. Role-adaptive visibility (four roles)

Full matrix follows the blueprint §28 (the authoritative permission spec). Summary:

| Area | Owner | Manager | Worker | Viewer |
|---|---|---|---|---|
| Home layout | Portfolio + stats + alerts + money | Ops + tasks + worker status + alerts | Today's ponds + Log now (no money) | Read-only summary |
| Create/delete farm, transfer ownership, member role-change | Yes | No | No | No |
| Invite/remove member | Any role | Worker only | No | No |
| Pond create/edit | Yes | Yes | No | No |
| Pond delete | Yes | No | No | No |
| Start/close cycle | Yes | Yes | No | No |
| Records (water/feed/sampling/mortality) | Full | Full | Full (own ponds) | Read only |
| Treatment / disease record | Full | Full | No | No |
| Tasks: create/assign/verify | Yes | Yes | Complete own assigned | No |
| Inventory | Full | Full | Stock in/out | No |
| Money: Expenses, Transactions, Cost, Crop P&L, financial report | Full | Full | Hidden | Read only **if** owner grants cost-share (default off) |
| Insights/calculators/engines/disease library/news/help | Full | Full | Full (utility) | Full (read) |
| Alerts | All farm | All farm | Own-pond | None |
| Reports export | Full | Full | No | Aggregate only (raw if owner grants) |
| Settings/Profile/Notifications | Own | Own | Own | Own |

Enforce in **three layers** (never UI-only): `useMembershipStore` hides UI (hidden, not disabled) → NestJS `OwnershipGuard`/`FarmAccessService` rejects → **Supabase RLS** as the final defense (D6). Owner-only sensitive actions (delete farm, transfer ownership, role-change, critical alert rules) require **OTP re-verification** (blueprint §28.6). Client uses Supabase for auth only; anon key has no table grants (D7).

---

## 8. Navigation & accessibility rules

- **≤3-tap rule (P4):** audit every feature — Home/Pond/Menu → hub → action. The ＋ FAB is the 1-tap daily path.
- **Back behavior:** predictable; saving returns to the originating context (e.g., Pond Dashboard), not the root.
- **Deep links / push taps:** route to the target; if the user's role can't see it, redirect to their Home with a friendly toast (don't show a forbidden screen).
- **Feature flags (X1):** `src/config/features.ts` gates the FLAG-HIDE rows in §6 so half-built screens never appear in nav.
- **Consistency:** same log-form pattern (§5.7) and history pattern (§5.8) everywhere — learn once, use everywhere.

---

## 9. Build delta vs current code (so devs know what changes)

1. **Home → role-adaptive for all four roles** (Owner / Manager / Worker / Viewer layouts). *Today: single layout, 2 roles.* Requires extending the role model (D3).
2. **Rename/organize tabs** for clarity: Home · Farms · ＋ · **Insights** (Reports + hubs) · **Menu** (sectioned). *Today: Dashboard · Farms · ＋ · Reports · More.* (Labels/icons; structure mostly exists.)
3. **`features.ts` flag system** to hide FLAG-HIDE screens (§6).
4. **Quick Log:** consider adding **Mortality**; keep pond-first flow.
5. **Log forms:** add **photo picker + compression**; DiseaseLog severity from library; feed/treatment chips.
6. **Offline:** wire the write-queue + drain (D2/OFF-1) and localize the offline banner.
7. **Worker empty states** (no farm yet) + **reset-password landing**.
8. Everything else in §6 marked SHIP is keep-and-polish; VERIFY items get a device check first.

---

### Companion docs
- `UPCHECK_LAUNCH_PLAN.md` — decisions (D1–D10), sequencing, fresh-Supabase cutover.
- `UPCHECK_FEATURE_MATRIX.md` — per-feature wired/partial/dead status (verification checklist).
- `UPCHECK_DESIGN_SYSTEM.md` — binding professional UI standard (no emojis, icons, components, Anti-"vibe-coded" checklist).
- `docs/PLAY_STORE_LAUNCH.md` — store submission.
