# Harvest & Molt — Design

Date: 2026-09-19 · Status: **spec approved (owner decisions below), not implemented**
Area 4 of the product brainstorm. Builds on — does not redo — the molt window shipped in
`c1fcc4d` / `63e4e3b` (`2026-09-14-molt-flags-account-qr-design.md` §1,
`2026-09-14-attendance-and-molt-fixes-design.md` Part A) and the engine honesty work in
`c00a931` (`2026-09-06-decision-engines-design.md`).

## Owner decisions

| # | Question | Decision |
|---|---|---|
| HD1 | How the harvest form records a sale | **Grade lines.** One line by default (kg · count/kg · ₹/kg); "Add grade" for more. Totals and pieces computed. Mirrors the buyer's weighing slip. |
| HD2 | Two revenue paths (plan completion vs logged harvest) | **The harvest row is the only truth.** Completing a plan opens the harvest form prefilled and saves a harvest. No separate income transaction. |
| HD3 | Where Harvest Timing gets prices | **The farm's own buyer quotes**, remembered per farm, prefilled from the last harvest's graded prices, age always shown. Plus: research free automatic price sources (§H5.3). |
| HD4 | Record what the farmer actually saw during molt | **Yes, light.** Soft-shell % from the cast-net check (on Sampling) and a quick "soft shells?" tap. Drives a pre-harvest soft-shell check. **Calibration is planned here (§M3), not built.** |

---

## 0. Why this area matters

Harvest is the one day a season when all the money arrives. Everything the app tells a farmer
about the cycle (FCR, survival, profit, what to do next time) is computed from the harvest
record. Today that record is a lump-sum price and a weight, and several paths around it lose,
duplicate or leak money. Molt is the other half of the harvest decision. Harvesting soft-shelled
shrimp means buyer deductions and rejections. Today the app knows the moon calendar, but it
does not know what is happening in the pond, and the harvest advisor ignores molt entirely.

**The headline:** one graded harvest record that feeds population, P&L, cycle results and price
memory, and harvest dates chosen to avoid soft-shell days.

---

## 1. What is wrong today (verified at HEAD `9e2ddc2`)

Each item was read in source. File:line is at HEAD.

### 1.1 Money integrity and security (fix first)

| # | Defect | Evidence | Impact |
|---|---|---|---|
| B1 | **Full harvest on an already-closed cycle leaves an orphan row, and a retry duplicates it.** The row is saved, *then* `closeCycle` throws 409. There is no DB transaction and no `crop.status` check. Online: the user sees an error and retries, and `saveRecord` mints a **new** UUID. Offline: replay treats 409 as done. | `harvests.service.ts:80-93`; `crops.service.ts:313-315`; `recordSync.ts:142,222` | Phantom revenue and kg. Reachable from ExpensesScreen on a completed cycle (`ExpensesScreen.tsx:172-184`) and through member races. |
| B2 | **Two revenue paths.** Plan completion writes a `transactions` income row and **no** harvest row. Logging a harvest writes a harvest row and **no** transaction. The farm report sums both. Crop P&L, cycle financials, HarvestHistory and the pond dashboard see only harvests. | `harvest-plans.service.ts:97-106`; `reports.service.ts:268-345`; `pnl.service.ts:80-87` | Double-counted, or missing, revenue depending on the screen. |
| B3 | **Cycle-list revenue is string concatenation.** `sale_price_total` is `decimal(15,2)`, which pg returns as a string, and no type parser is set. | `frontend/src/screens/cycles/cycleHistory.ts:49`; no `setTypeParser` in backend | ₹50,000 + ₹25,000 renders as `050000.0025000.00`. |
| B4 | **IDOR:** `GET /harvest-plans/pond/:pondId/summary` guards only `?farmId`, then sums revenue and expenses for **any** `pondId`. | `harvest-plans.controller.ts:57-62`; `harvest-plans.service.ts:145-156` | Any farm owner can read any pond's revenue. |
| B5 | **Plans can act across farms.** `cropId` is never checked against `pondId`. PATCH can rewrite both. `completePlan` then marks whatever crop is stored as `completed`. The comment "ownership-checked" is false. The check-then-act has no conditional update, so two completes book income twice. | `create-harvest-plan.dto.ts`; `update-harvest-plan.dto.ts:4`; `harvest-plans.service.ts:83-121` | Closing another farm's cycle; double income. |
| B6 | **Financials leak past VIEW_FINANCIALS.** `GET /harvests/:id`, the create response and the PATCH response return unmasked price and buyer. `GET /harvest-plans` (READ, all roles) returns revenue. `GET /harvest-timing/pond/:id` (READ) returns ₹ projections. The harvest form shows the sale section to everyone. | `harvests.service.ts:255-261`; `harvest-plans.service.ts:45-56`; `harvest-timing.controller.ts:94-104`; `HarvestLogScreen.tsx:151-164` | Workers and viewers see the season's money. |
| B7 | `completePlan` is gated on WRITE_MANAGEMENT, not RECORD_HARVEST. This lets a manager bypass an owner who revoked their RECORD_HARVEST. | `harvest-plans.controller.ts:50-55` | Permission bypass. |
| B8 | **`POST /india/price-feeds` lets any authenticated user write prices for any region.** `GET` is `@Public` and returns `entered_by` user ids. | `india/india.controller.ts:58-70` | Price poisoning once anything reads it. Leaks user ids. |
| B9 | Money totals ignore `status`. `discarded` / `pending` harvests count as revenue. (Latent: the UI never sets status.) | `pnl.service.ts:80-87`; `expenses.service.ts:472-479`; `harvests.service.ts:214-220` | — |

### 1.2 The harvest record cannot carry what a harvest is

| # | Defect | Evidence |
|---|---|---|
| R1 | There is no count/kg or ₹/kg. The form asks for "Average Size (g / piece)". The entity comment says "count per kg". History renders "g". Indian buyers grade and pay **per count band**, often 2–3 bands in one harvest. | `harvest.entity.ts:35-36`; `en/logs.ts:81`; `HarvestHistoryScreen.tsx:102` |
| R2 | **A partial harvest never reduces live population.** `harvests.count` is never read by any backend code, and the form never collects it. Biomass, the Feed Advisor ration, daily-brief mortality % and the Harvest Timing prefill all overstate stock after a thinning. | `pond-context.service.ts:423-429, 577-594`; `daily-brief.service.ts:474-476` |
| R3 | Full-harvest side effects are one-way. Editing partial↔full or deleting a full harvest never closes or reopens the cycle. A cycle can be closed with no harvest (₹0 revenue, FCR 0). | `harvests.service.ts:286-300`; `CycleDetailScreen.tsx:63-78` |
| R4 | The date is free text ("YYYY-MM-DD"), with no future or before-stocking check. `@IsDateString` rejects typos, and offline those park as failed. A Full harvest closes the cycle with **no confirmation**. `parseFloat("1,500") = 1`. A price or buyer cannot be cleared on edit. | `HarvestLogScreen.tsx:23, 54-58, 109-129` |
| R5 | Dead `harvest_records` entity (Rupiah `price_per_kg_rp`). `pond.status='harvesting'` is never set. `crop.isActive` is never cleared on close. `count` is `@IsNumber` on an int column. | `harvest-record.entity.ts`; `pond.entity.ts:21`; `create-harvest.dto.ts:29-32` |
| R6 | Cache: harvest invalidation misses `['ponds']` although a full harvest flips the pond to fallow. `/harvest-plans` is absent from `URL_ENTITY_MAP`. | `query/client.ts:198, 250-268` |

### 1.3 Cycle result is missing or wrong

| # | Defect | Evidence |
|---|---|---|
| C1 | After a full harvest the form just calls `goBack()`. The farmer never sees a result. | `HarvestLogScreen.tsx:82` |
| C2 | Cycle analysis FCR uses **pond-lifetime** feed (inflated on any pond's second cycle), although `feed_records.crop_id` exists. Survival = the latest sampling *estimate*, not harvested ÷ stocked. | `reports.service.ts:95-101, 126-129`; `feed-record.entity.ts:28` |
| C3 | `productivityTPerHa` and `breakEvenCount` are always null, because no caller passes `areaM2` / `region`. | `CycleDetailScreen.tsx:43`; `PondDashboardScreen.tsx:316`; `CropPnlScreen.tsx:29` |
| C4 | The `reports` i18n namespace exists in **no** locale, so CycleAnalysisScreen is English in all six. | `i18n/locales/*/index.ts` |
| C5 | Crop P&L excludes pond-tagged `transactions`; cycle financials include them. Two screens show two profits for one cycle. | `pnl.service.ts:67`; `expenses.service.ts:426-439` |

### 1.4 Harvest Timing still advises from invented numbers

`c00a931` removed invented seeds from this screen, but three survived. **This was my miss in
the engines spec (E1).**

| # | Defect | Evidence |
|---|---|---|
| T1 | **ADG is never prefilled and not required.** `Number('') = 0`, so ABW stays flat while feed cost accrues, and the engine **always says "Harvest now".** pond-context has no ADG. | `HarvestTimingScreen.tsx:44, 64-85, 92` |
| T2 | Every call sends hardcoded `DEFAULT_BANDS` ₹520/430/360. `region` is never sent, so the regional code path is dead. | `HarvestTimingScreen.tsx:31-35, 98` |
| T3 | Invented `carrying='2'` (backend default 1.5, crop default 1.25) and `diseaseRisk='5'` %. | `HarvestTimingScreen.tsx:47-49` |
| T4 | The partial optimizer applies the full risk haircut to the portion harvested *today*, while "harvest all today" carries none. The comparison is biased against partial harvests. Price is **nearest band**, not interpolated. | `harvest-timing.service.ts:93-98, 159-161, 237-238` |
| T5 | No molt input. It can recommend harvesting on a molt-peak day. | grep: no lunar/molt in `harvest-timing/` |
| T6 | The nav title is hardcoded English. There is no "Plan this harvest" action from the result. | `RootNavigator.tsx:456` |

### 1.5 Molt: good calendar, blind to the pond

| # | Defect | Evidence |
|---|---|---|
| M-a | **"Dose minerals" auto-ticks from any water test or any treatment.** Any `chemical_data` row (an NH₃ test) or any treatment (an antibiotic) in pre..peakEnd counts. | `molt.service.ts:294-305, 360` |
| M-b | `MoltService.latestAbw` does not filter `mbw_g IS NOT NULL`. A later sampling row without MBW flips the pond to `sizeUnknown`. pond-context and the daily brief use different ABW rules. | `molt.service.ts:384-396` |
| M-c | **Nothing records observed molting.** `soft_shell_check` stores done/not-done, not a finding. The playbook note claims calibration "from your pond's own observations". **That is false.** | `molt.service.ts:99`; `lunar.service.ts:505`; `lunar.module.ts:566-570` |
| M-d | Once `no_handling` is `violated`, the alert stays critical for the rest of peak with nothing the farmer can do. | `molt.service.ts` deriveItems / moltAlertFor |
| M-e | Feed Advisor's molt toggle defaults on for **every** pond during peak, including ponds under 5 g. The Day Score, reminder and harvest banners are farm-wide too. The reminder is scheduled even with no eligible pond, and tapping it routes nowhere. | `FeedAdvisorScreen.tsx:67-73`; `notifications.ts:355-394`; `App.tsx:328-332` |
| M-f | Molt ticks are not offline: a plain `apiClient.post` shows an Alert when offline. | `frontend/src/api/molt.ts:61-62` |
| M-g | Alert title, body, steps and the whole playbook are **backend English**. They show in the Home hero, MorningBriefing and TodayAlerts in all six locales. | `molt.service.ts:183-213`; `lunar.service.ts:293-508` |
| M-h | Dead code: `mineralDoseKg`, `components/ui/MoonPhaseCard.tsx`, mean-phase `isMoltingWindow`. `/lunar/risk` has no DTO, so it can return a NaN score. | `lunar.service.ts:204-211`; `lunar.controller.ts:550-560` |
| M-i | Meeus full-moon series reuses new-moon coefficients below the lead term. Error is about 1 min, so it only matters when a full moon is within minutes of IST midnight. | `moon-phase-meeus.ts:60-95` |

---

## 2. Workstreams

Order = ship order. Each is one PR against `development`.

| WS | Name | Migration | Ships as |
|---|---|---|---|
| **H0** | Money integrity & security fixes | none | backend + OTA |
| **H1** | Graded harvest record | `harvest_grades`, harvest columns | backend + OTA |
| **H2** | Harvest drives the pond (population, close/reopen) | none | backend + OTA |
| **H3** | Cycle Result screen | none | backend + OTA |
| **H4** | One revenue path (plans → harvest) | `harvests.plan_id` | backend + OTA |
| **H5** | Farm price book (+ free price sources) | `farm_price_quotes` | backend + OTA |
| **H6** | Harvest Timing: real inputs, molt-aware | none | backend + OTA |
| **M1** | Molt correctness fixes | none | backend + OTA |
| **M2** | Molt observations + pre-harvest check | `molt_observations` | backend + OTA |
| **M3** | Calibration: **plan only**, not built | — | — |

Everything is OTA-safe: no native modules. **Every migration is additive, and `migrationsRun` is
false. Apply each migration to production BEFORE the backend that reads it deploys**
(the `c1fcc4d` rule). Each new read must use the `isMissingTable()` / `42P01`/`42703` fail-safe,
so an unapplied migration degrades instead of 500-ing.

---

## H0 — Money integrity & security

Small and independent. Ship first, because each item is a live defect.

1. **B1 atomic harvest.** `HarvestsService.create` runs in `dataSource.transaction`:
   - load the crop `FOR UPDATE`;
   - `crop.status !== 'active'` → **409 `CYCLE_CLOSED`** *before* inserting anything;
   - insert the harvest;
   - for `full`, do `closeCycle` inside the same transaction.

   `closeCycle` gains an optional `EntityManager` parameter; no new service.
   - Frontend: on `CYCLE_CLOSED`, show "This cycle is already closed" and **do not** offer retry.
   - The offline 409-as-done path is now correct, because nothing was written.
2. **B3** `cycleHistory.ts:49`: `Number(h.salePriceTotal)`. Also add a single pg type parser for
   `NUMERIC` (1700) → `parseFloat` in the TypeORM data source config.
   - Grep every `decimal`/`numeric` consumer that does `Number(...)` today. Those keep working.
   - Any that compares strings must be listed in the PR.
   - If the global parser is judged too wide, fall back to fixing each consumer and say so.
3. **B4** `getCycleSummary`: `assertCanAccessPond(userId, pondId, 'VIEW_FINANCIALS')` and drop
   the `farmId` trust. The frontend doesn't call it (`getSummary` is unused), so **delete the
   endpoint** unless H4 needs it. It doesn't.
4. **B5**:
   - Create/update plan: verify `cropId` belongs to `pondId` and is `active`.
   - Remove `pondId`/`cropId` from `UpdateHarvestPlanDto` with `OmitType`.
   - `completePlan` uses a conditional update `WHERE status='planned'`; `affected=0` → 409. (H4 replaces the booking itself.)
5. **B6**: one helper `maskFinancials(row, canView)` in `harvests.service.ts`, applied to `findOne`, the create response and the update response.
   - `GET /harvest-plans` masks the price and revenue fields per farm.
   - `GET /harvest-timing/pond/:id` requires VIEW_FINANCIALS.
   - Frontend: the sale section and grade prices render only with `canViewFinancials` (H1).
6. **B7** `completePlan` → RECORD_HARVEST (it now records a harvest, per H4).
7. **B8** `POST /india/price-feeds` → admin only (the existing admin guard pattern). The farmer path is H5, not this.
   - `GET /price-feeds` stops returning `enteredBy`.
8. **B9** revenue and biomass sums filter `status = 'sold'` (P&L, cycle financials, money entries).
9. **R5/R6 hygiene:**
   - `count` → `@IsInt`.
   - Add `['ponds']` to the harvest invalidation.
   - Add `/harvest-plans` → `[['pond'],['briefing'],['home'],['money'],['ponds']]` to `URL_ENTITY_MAP`.
   - Delete the `harvest_records` entity file. The table stays; drop it in a later cleanup migration.
   - Close sets `isActive=false`.
   - Leave `pond.status='harvesting'` unused. Say so in `FEATURES.md`.
10. `PATCH /crops/:id/close` gets a real DTO. Legacy `PATCH /crops/:id/harvest` (no caller) → delete.

**Tests (mutation-checked):**
- B1 full harvest on a completed crop → 409 and **zero rows**.
- B1 replay with the same id → the existing row, no second close.
- B3 two string prices sum numerically.
- B4 a pond of another farm → 403.
- B5 plan with a foreign cropId → 400; a double complete → one income.
- B6 manager without VIEW_FINANCIALS → null price on `findOne` / create / update.
- B8 non-admin POST → 403.

---

## H1 — The graded harvest record (HD1)

### Data

New table `harvest_grades` (migration `1780700900000-CreateHarvestGrades`):

```
id uuid PK (client-minted, see offline)
harvest_id uuid NOT NULL FK harvests ON DELETE CASCADE, indexed
count_per_kg numeric NULL          -- buyer's count; NULL = not graded
weight_kg numeric NOT NULL CHECK > 0
price_per_kg numeric NULL          -- NULL when entered by someone without VIEW_FINANCIALS
sort_order smallint NOT NULL DEFAULT 0
```

New columns on `harvests`:
- `rejected_kg numeric NULL`
- `rejected_reason text NULL` (`soft_shell | broken | dead | other`)
- `pieces int NULL`
- `pieces_estimated boolean NOT NULL DEFAULT false`

**The harvest row stays the aggregate, so every existing reader keeps working unchanged:**
- `weight_kg = Σ grade.weight_kg`
- `sale_price_total = Σ weight × price` (null if any sold grade lacks a price)
- `average_size` = weighted mean **g/piece**, derived as `1000 / weighted count`. It is now
  defined as g/piece everywhere. Fix the entity comment.
- `pieces`:
  - `Σ weight × count` when every grade has a count;
  - otherwise `weight × 1000 / latest ABW` with `pieces_estimated = true`;
  - otherwise null.

Computed server-side in one function, `harvestTotals(grades, abwG)`. Pure, with a unit test.

Old harvests have no grades. Readers treat a harvest with zero grades as one implicit grade
(`weight_kg`, no count, `sale_price_total` as total). **No backfill.**

### API

`CreateHarvestDto` gains `grades?: GradeDto[]` (1..6, `ValidateNested`), `rejectedKg?` and
`rejectedReason?`.
- When `grades` is present, the server ignores any client `weightKg`/`salePriceTotal` and derives them.
- When absent, it runs the old behaviour, so **old app builds keep working**.
- Server-side range checks:
  - `count_per_kg` 10..400;
  - `price_per_kg` 50..2000 ₹/kg, a warn-not-block band (per daily-logging D4). Outside it, a `400` with `code: 'OUT_OF_RANGE'` unless `confirmOutOfRange: true` is sent;
  - `harvestDate` ≤ today (IST) and ≥ crop stocking date.

A **price without VIEW_FINANCIALS** is stripped server-side, and the grade is saved with null price.
The owner adds the price later through PATCH. That matches real life: the manager weighs at the
pond, and the owner settles with the buyer.

`UpdateHarvestDto` gets `grades` with **replace-all** semantics (in a transaction). `harvestType` is
**not editable** (see H2).

### Offline

Grades travel **inside** the harvest payload, so one `saveRecord` is one idempotent replay keyed on
`harvest.id`. There is no second queue entry, and no ordering problem.

### Form (`HarvestLogScreen`, rewritten)

```
Harvest · Pond 3                                   [Partial | Full]
Date  [ 19 Sep 2026 ▾ ]         (date picker; default today; ≤ today, ≥ stocking)

Grade 1   [ 820 ] kg   [ 40 ] /kg   [ 430 ] ₹/kg      = ₹3,52,600
Grade 2   [ 160 ] kg   [ 55 ] /kg   [ 340 ] ₹/kg      = ₹54,400   ✕
[+ Add grade]
Rejected  [ 12 ] kg   because [ Soft shell ▾ ]         (collapsed "Deductions" row)

Buyer [ Sri Balaji Exports ]   Notes [ … ]
──────────────────────────────────────────────
Total 980 kg · ≈ 41,800 pieces · avg 42/kg · ₹4,07,000
[ Save harvest ]
```

- Price columns and the ₹ total show only with `canViewFinancials`.
- Numbers go through the existing locale-safe parser from daily-logging L4, not `parseFloat`. `1,500` → 1500.
- Count/kg ≥ 10 and ≤ 400 inline. A price outside the band gives an inline warning and a confirm (never a block).
- Prefill for a new harvest:
  - the count from latest ABW (`1000/abw`, rounded), shown as "from 14 Sep sampling";
  - ₹/kg from the farm price book (H5) for that count, shown as "your quote, 3 days old".
  - Both are editable, and **labelled as prefills**, never silent.
- **Full harvest confirmation** (new): "This closes the cycle for Pond 3. Stocked 3 Jun, 108 days.
  You can't log feed or water for this cycle after this." [Close cycle & save] / [Cancel].
- Molt pre-harvest check card (M2) above the grades when relevant.
- Clearing a price or buyer on edit sends `null` explicitly.
- After a **full** save: navigate to Cycle Result (H3), not `goBack()`.

**HarvestHistoryScreen:**
- rows show `980 kg · 2 grades · avg 42/kg` and, with financials, `₹4,07,000`;
- a per-cycle subtotal header;
- the edit pencil and FAB gated on `canRecordHarvest`;
- the FAB disabled with a reason when the pond has no active cycle.

**Export** (`features/export/collect.ts`):
- harvest rows expand grades, one line per grade;
- add the missing `logs.harvestType/buyer/sale` keys in all six locales.

**i18n**: all new strings go in `logs.ts` in all six locales. Fix the Telugu `harvest_labelAvgSize`, which is still English.

---

## H2 — Harvest drives the pond

1. **Population.** `estimateLivePopulation(stocking, mortality, harvestedPieces)`: subtract
   `Σ harvests.pieces` for the crop's **partial** harvests.
   - When any contributing harvest has `pieces_estimated` or null pieces, pond-context's
     population `asOf`/confidence drops one band, and the detail says "after a partial harvest
     with no count".
   - A null `pieces` falls back to `weight × 1000 / abwAtHarvest`, estimated.
   - The daily brief reuses the same function (`daily-brief.service.ts:474-476`).
2. **Full harvest closes. Edit and delete are honest:**
   - `harvestType` is **immutable** after create. The edit screen shows it read-only, with
     "Wrong type? Delete this harvest and log it again."
   - **Delete a full harvest** → in the same transaction, reopen the crop (`status='active'`,
     `actualHarvestDate=null`, `isActive=true`) and restore `pond.activeCycleId`/`status='active'`,
     **only if** the pond has no other active cycle. Otherwise 409 `POND_HAS_NEW_CYCLE` ("A new
     cycle has started on this pond; this harvest can't be removed").
   - Confirm dialog: "Deleting this reopens the cycle."
3. **Close without a harvest** (`CycleDetailScreen` "Close Cycle") stays, for crop failure or
   abandonment, but the dialog asks **why**: `Harvested elsewhere / Crop lost / Other`.
   - "Harvested" routes to the harvest form (Full) instead of closing silently.
   - "Crop lost" closes with `closeReason='lost'`, stored in the existing `notes`. **No schema
     change.** The Cycle Result then reads "Crop lost", not "₹0 revenue".

---

## H3 — Cycle Result

This is the moment the season's work turns into a number the farmer trusts. It also answers
"what do I do differently next time".

`GET /crops/:id/result` (READ; money fields only with VIEW_FINANCIALS). It lives in
`reports.service.ts` beside cycle analysis and replaces its FCR/SR logic:

| Metric | Formula | Honesty rule |
|---|---|---|
| DOC | harvest date − stocking date | — |
| Harvested kg | Σ harvests.weight_kg (status sold) | — |
| Yield | kg ÷ pond area → **t/ha** | Hidden if pond area unknown (never assumed). Show "area assumed" if `depth/area` came from the onboarding assumed flag. |
| Survival | Σ pieces ÷ stocking count | If any pieces are estimated, show a range from ABW ±10% and an "estimated" tag. If no count and no ABW, hide it. **Never** the latest sampling SR estimate. |
| FCR | Σ feed_records.quantity_kg **where crop_id = this crop** ÷ harvested kg | Fixes C2. If some feed rows have null crop_id in the crop's date range for the pond, include them and note "includes N untagged feed logs". |
| Avg count / size | weighted from grades | — |
| ADG | (final ABW − stocking ABW) ÷ DOC | Stocking ABW = crop's PL weight if recorded, else 0.01 g, noted. |
| Revenue, cost, profit, cost/kg, margin | one source: `expensesService.getCycleFinancials` | Fixes C5: crop P&L switches to the same basis (includes pond-tagged transactions). **One profit number per cycle, everywhere.** |
| Break-even ₹/kg | cost ÷ harvested kg | — |
| Grade mix | kg and % per count band | — |

**Screen `CycleResultScreen`** is opened after a full harvest and from CycleDetail for completed cycles:
- **Hero:** "Pond 3 · 108 days · 980 kg · 4.9 t/ha", then "Profit ₹1,12,000" (financials only).
- **Four tiles:** FCR, survival, avg count, ADG. Each has a one-line plain-language read against
  simple bands, labelled "typical for vannamei in India, uncalibrated":
  - FCR ≤1.3 good / ≤1.6 fair / higher poor;
  - SR ≥80 / ≥65 / lower.
- **"Next cycle" section, max 3 lines**, generated only from real deltas:
  - FCR poor → "Feed was X kg over plan; check tray-adjusted feeding";
  - Survival low and mortality logs show a spike → the date of the spike;
  - Harvest in a molt window with soft-shell rejections → "Rejected 12 kg soft-shell: harvest outside molt days next time".
  - No generic advice. If nothing applies, the section is absent.
- Actions: Share (existing export PDF, cycle scope) and "Start next cycle" (existing CreateCycle with the pond preselected).

- `CycleAnalysisScreen` keeps its growth chart and reads the same `result` metrics.
- Create the **`reports` namespace in all six locales** (fixes C4).
- `pnl` callers pass `areaM2` from pond context (fixes C3). `breakEvenCount` needs a price book (H5): pass the farm's latest quote bands instead of `region`.

---

## H4 — One revenue path (HD2)

- `harvests.plan_id uuid NULL FK harvest_plans ON DELETE SET NULL` (migration `1780701000000`).
- **"Mark complete" on a plan → `HarvestLog`** with params `{ pondId, cropId, planId, harvestType:'full', prefill: { date, targetKg, expectedPrice } }`.
  - The plan is completed **by the harvest save**: in H0's transaction, when `planId` is given,
    `UPDATE harvest_plans SET status='completed', actual_* = harvest totals WHERE id=:planId AND
    pond_id=:crop.pondId AND status='planned'`.
  - A plan that belongs to another pond → 400.
- `PATCH /harvest-plans/:id/complete` → **410 Gone** with `code: 'USE_HARVEST_LOG'` after one release.
  - Until then, old app builds still call it. It is rewritten to **create a harvest row** (single
    grade, `weight × price`) through `HarvestsService.create` instead of a transaction.
  - This is the only compatibility shim. Remove it in the release after.
- **Historical data:** existing `transactions` rows with `category='harvest_sale'` written by plan
  completion are **left as they are**. They have no harvest row, so they are not double-counted
  unless the farmer also logged a harvest.
  - The farm report flags a cycle where both exist ("possible duplicate harvest income") instead of silently summing.
  - No data rewrite. We don't touch production money rows.
- **HarvestPlansScreen:**
  - the create form computes `expectedRevenue = targetKg × expectedPrice` (it is never sent today);
  - the date picker shades molt days (M2 §4);
  - delete and complete gated on RECORD_HARVEST;
  - the plan card shows the pre-harvest check (M2) from 2 days before.

---

## H5 — Farm price book (HD3)

### H5.1 Data

`farm_price_quotes` (migration `1780701100000`):

```
id uuid PK, farm_id uuid FK farms ON DELETE CASCADE, quoted_on date NOT NULL,
buyer text NULL, bands jsonb NOT NULL   -- [{ count: 40, price: 430 }, …] 1..12 entries
source text NOT NULL  -- 'quote' (typed) | 'harvest' (derived from a harvest's grades)
harvest_id uuid NULL, created_by uuid, created_at timestamptz
```

- Read and write require **VIEW_FINANCIALS**. Prices are money.
- Every H1 harvest with priced graded lines **auto-writes** a `source='harvest'` quote in the same
  transaction. The farm's price memory builds itself from real sales, and the farmer never
  re-enters.
- **"Today's quote" entry:** a small sheet reached from Harvest Timing, HarvestPlans and the Money
  tab. Count/price rows start from the last quote, so the farmer only edits what changed.
  - The rows default to the counts the farm actually sells (the last 3 quotes' counts). If there
    is no history, 30/40/50/60/70/80/100.
  - One POST. Online-only is acceptable (it is not loggable pond data); show a clear offline message.

### H5.2 Using it

`PricingService.priceForCount(bands, count)` becomes **linear interpolation between neighbouring
bands**, replacing nearest-band.
- Outside the quoted range it clamps to the end band and returns `extrapolated: true`. The UI says "no quote for 25-count; using your 30-count price".
- The "current" quote is the newest by `quoted_on`, with its age always shown:
  - age > 7 days → amber "quote is 9 days old — update?";
  - age > 30 days → treated as **missing** for Harvest Timing (§H6).
- Consumers: Harvest Timing (H6), harvest form prefill (H1), `breakEvenCount` on P&L (H3), plan expected revenue (H4).

### H5.3 Automatic price sources: research result (HD3 follow-up)

As of Sep 2026, **no free API publishes Indian farm-gate vannamei prices by count.**

| Source | What it is | Fit |
|---|---|---|
| Daily rate posts from processors and aggregators (e.g. "Today's Vannamei Shrimp Market Rates, Andhra Pradesh" on Facebook, WhatsApp groups, aggregator apps) | Exactly the right data: count-wise ₹/kg by district, daily | **No API.** Scraping breaks their terms, is fragile, and gives us no right to redistribute. **Do not build.** |
| S&P Global Commodity Insights (Platts) | Weekly AP / West Bengal farm-gate by count (e.g. week 53: 30-count ₹460, 40-count ₹380, 100-count ₹220 in AP) | Paid, enterprise-priced. Not for now. Worth a conversation only if we sell a pro tier. |
| World Bank Pink Sheet (CMO) | Free monthly international shrimp $/kg | Free and stable, but monthly, international and not by Indian count. **Useful only as a "global trend" line**, and not for a harvest decision. Not worth building now. |
| **Our own users' graded harvests** | Every H1 grade line with a price is a real, dated, count-wise farm-gate price | **The real answer, and a moat.** It needs farm district (see `docs/strategy/farm-location-strategy.md` Option B) and opt-in. |

**H5.4 (later, not in this build): the Neerani district price.** Planned so H1/H5 data is ready for it:
- Aggregate `source='harvest'` quote bands by **district × count band × 7-day window**.
- Publish only when **≥5 distinct farms** contribute, showing the median and the farm count ("₹428 · 40-count · 7 farms · last 7 days").
- Never show a single farm's price. Delay by 1 day.
- Opt-in: "Share my sale prices anonymously to see district prices". The Privacy Policy must be updated first.
- It feeds the H5.2 quote as a fallback: own quote first, district price second, labelled.
- Blockers: district field (location strategy Option B), privacy copy, enough farms per district.
- The existing `price_feeds` table is the natural store for the published aggregate (`source='neerani'`). Keep it, with admin-only writes (H0 B8).

---

## H6 — Harvest Timing: real inputs, molt-aware

1. **ADG in pond-context.** Add `adgG` and `adgAsOf`, computed from the crop's last two samplings
   with non-null MBW at least 5 days apart: `(mbw₂ − mbw₁) / days`.
   - Fewer than 2 samplings → null. Negative → null, with `adgNote: 'negative'` (sampling noise; don't advise from it).
   - Harvest Timing prefills ADG and makes it **required** (a `MissingInputs` row: "Needs two samplings 5+ days apart").
   - This fixes T1, the always-"harvest now" bug.
2. **Prices** come from the farm price book (H5). No quote, or a quote older than 30 days → a
   `MissingInputs` row "Add today's buyer quote", with the sheet inline.
   - Delete `DEFAULT_BANDS` (T2).
   - Without VIEW_FINANCIALS, the screen shows "Ask the farm owner", not numbers (B6).
3. **Carrying capacity** from `crop.carryingCapacityKgM2`. If null, use the backend default 1.5,
   shown as an **assumption chip** ("1.5 kg/m² assumed · edit").
   - **Disease risk:** from the Disease Early-Warning engine's current score for the pond if
     available. Otherwise **0**, with a visible "Disease risk not included" line.
   - Delete the invented `'2'` and `'5'` (T3).
4. **Partial bias fix (T4):** day-0 realised value in the partial sweep uses the same risk basis as
   "harvest all today" (none on day 0). Unit test: with `diseaseRisk=0`, partial at p equals the
   hand-computed value.
5. **Molt-aware (T5).** The backend tags each projection day with its molt phase
   (`currentMoltWindow` / `phaseOn` over the day's IST date).
   - If `optimalDay` lands in **peak or post**, return `safeDay`: the nearest non-peak/non-post day
     on each side, with its `netProfit` and the difference.
   - UI: "Best day 14 (2 Oct) is a molt peak: soft shells, buyer deductions. Day 11 (29 Sep): −₹3,200, or day 17 (5 Oct): +₹1,100."
   - The chart shades molt days.
   - **No soft-shell price discount is modelled.** We have no data for it. We avoid the days instead.
6. **Result → action:** "Plan this harvest" opens HarvestPlans create, prefilled with the chosen day,
   projected kg and expected ₹/kg (T6).
   - Localise the nav title.
   - Send `pondId`/`cropId`/`persist` so `harvest_recommendations` actually records what was advised. It is useful later for calibrating ADG decay.

---

## M1 — Molt correctness fixes

1. **Minerals evidence (M-a).** `minerals` completes only from:
   - a treatment whose product `category` or `description`/`notes` matches the mineral lexicon
     (`mineral, calcium, magnesium, potassium, MOP, muriate, dolomite, lime, Ca, Mg, K`, plus the same words in the 5 other locales' scripts);
   - or a manual tick. Chemical **tests** no longer count.
   - `// ponytail: keyword match — replace with a treatment type field when Disease (area 5) adds one.`
   - **Area 5 adds it:** `2026-09-19-disease-health-compliance-design.md` §D2 (`category='mineral'|'lime_alkalinity'`). If D2 ships first, skip the keyword match and use the category. Keep the keyword match only as the fallback for old free-text rows.
   - Make `minerals` **auto + manual**, like `restore_feed`, so a farmer who dosed without logging can tick it.
2. **One ABW rule (M-b).** `MoltService.latestAbw` filters `mbw_g IS NOT NULL`. Better: take `abwG`
   from pond-context's set-based `activeContexts` (the alert path already does). All three consumers then agree.
3. **Violated handling (M-d).** Once `no_handling` is violated, it stays `violated` (history is
   truthful) but no longer counts toward `critical`. It adds one watch step: "Handled during peak:
   check for soft-shell deaths for 2 days". A peak alert then clears when the remaining items are done.
4. **Per-pond molt (M-e).**
   - Feed Advisor's molt default reads `GET /molt/ponds/:id` eligibility and phase, not the farm-wide window.
   - The Day Score peak exemption applies only to eligible ponds.
   - The reminder is scheduled only when ≥1 pond is eligible.
   - The `molt-reminder` notification tag routes to `Lunar`.
5. **Offline ticks (M-f).** `POST /molt/ponds/:id/actions` accepts a client `id` and goes through `saveRecord`.
   - Replay is idempotent on `(pond, window, action)` (the unique key already exists: the insert `orIgnore`s).
   - A tick replayed after the window closed returns 409, treated as done.
6. **Localise the backend text (M-g).** Molt alerts carry `titleKey` + `params` and `steps: [{ key, params }]` beside the existing English `title`/`steps`.
   - Clients that know the keys render `t()`. Old clients keep the English.
   - The playbook moves to keys the same way.
   - Keys live in `engines.ts` in all six locales.
7. **Cleanup (M-h, M-i).**
   - Delete `mineralDoseKg`, `MoonPhaseCard`, `isMoltingWindow`/`upcomingPhases`.
   - Delete the unused `inMoltWindow`/`signedDaysToSpringTide` response fields after one release.
   - Give `/lunar/risk` a DTO.
   - Replace the false note at `lunar.service.ts:505` with "Molt timing follows the moon calendar. Your soft-shell observations are recorded for future tuning."
   - Put in the proper Meeus full-moon coefficient set, with a test against a published full-moon time. Verify the expected times from an external source, not from memory; the E5.1 lesson was that the first test data was wrong.

---

## M2 — Molt observations + pre-harvest check (HD4)

### Data

> **Superseded by `2026-09-19-disease-health-compliance-design.md` §D6.** Build the general
> `health_observations` table there instead, with soft shell as `sign='soft_shell'`. The entry points,
> pre-harvest check and M3 plan below are unchanged; read "molt observation" as "a health
> observation with sign `soft_shell`". The original table is kept below for reference only.

`molt_observations` (migration `1780701200000`), **do not build**:

```
id uuid PK (client-minted, saveRecord), pond_id uuid FK ponds CASCADE, crop_id uuid NULL,
observed_on date NOT NULL (IST), source text NOT NULL  -- 'sampling' | 'quick' | 'harvest'
sample_size int NULL, soft_count int NULL             -- from a cast-net sample
level text NOT NULL  -- 'none' | 'few' | 'many'        (derived when counts given: <10% few, ≥10% many)
molt_deaths int NULL, window_key varchar NULL, created_by uuid, created_at
```

- Capability: WRITE_OPERATIONAL (workers observe). Offline via `saveRecord`, idempotent on `id`.
- The `level` thresholds are "field rule of thumb, uncalibrated", commented as such (E4 provenance).
- `window_key` is filled server-side from `currentMoltWindow(observed_on)` (null in `inter`). This is what M3 needs.

### Entry points (three, all tiny)

1. **Sampling form:** an optional "Soft shells in this sample: [ 3 ] of [ 50 ]" row, with sample
   size prefilled from `totalSamples`. On save, a second `saveRecord` posts the observation with
   `source='sampling'`. Two queue entries, each independently idempotent; no ordering dependency.
2. **Quick tap** on the post-molt checklist item `soft_shell_check`: "Soft shells seen? None / A few / Many" plus an optional "Dead from molting: [ ]".
   - One tap saves the observation, and `soft_shell_check` becomes **auto-done from any observation in post**.
   - It stays manual-tickable.
3. **Harvest:** `rejectedReason='soft_shell'` writes an observation `source='harvest'`, `level='many'`,
   in the same transaction.

### Pre-harvest check (the value)

One component, `PreHarvestCheck`, shown:
- on HarvestLog above the grades;
- on a HarvestPlan card from 2 days before its date;
- on the Harvest Timing result for the chosen day.

It shows at most three computed lines, no manual checklist:

| Line | Rule | Tone |
|---|---|---|
| Molt | Chosen date in peak/post → "Molt peak on 29 Sep: expect soft shells" | amber |
| Soft shells | Latest observation in last 3 days: `many` → "Soft shells seen 2 days ago (6 of 50): buyer may deduct"; `none`/`few` → "Shells checked: firm" (green). No observation and the date is in or within 3 days after a window → "Do a cast-net check first: how many soft of 50?" with inline entry (M2 entry 1's row) | amber / green |
| Residues | Any treatment this cycle with `banned_substance_flag` → "A banned substance was logged on 12 Aug: export buyers test for residues" | red |

- **Warn only, never block** (standing owner decision from `2026-09-14-molt-flags-account-qr-design.md`).
- Absent lines are omitted. If all are clean, one green line: "Ready to harvest".
- The residue line is the only compliance item here. Withdrawal periods don't exist in the data today, so they are **deferred to area 5 (Disease & compliance)**.

### Molt-day shading

`frontend/src/features/moltWindow.ts` already mirrors the window math. The HarvestPlans date picker
and the Harvest Timing chart shade peak (strong) and post (light) days. The plan-date warning that
exists today stays, and reads the phase: "29 Sep is a molt peak day".

---

## M3 — Pond-tuned molt timing: calibration plan (not built)

**Goal:** move from "the moon says ±1 day" to "on *your* farm, soft shells peak 1 day after the full moon".
The design follows `docs/reference/lunar_module_spec.md` §7, made concrete.

**Data it needs (M2 collects it):** `molt_observations` with `observed_on`, `level`, `window_key`, `pond_id`, plus the pond's ABW at the time (pond-context history).

**Method (per farm, pooled across its ponds):**
1. For each window with ≥2 observations on ≥2 different days, take the **day of the highest
   soft-shell fraction** relative to the true-moon IST date → an offset in days (−3..+3).
2. The farm offset is the **median** across windows. Use it only when there are **≥3 windows**, the
   interquartile range is ≤2 days, and the observations come from ponds with ABW ≥ 5 g.
3. Apply the offset by shifting `peakDate` for that farm. Clamp to ±2 days. Window widths are unchanged in v1.
4. Show "Tuned to your farm (+1 day, from 4 molt cycles)" on LunarScreen, with a reset.
   The generic calendar is always one tap away.
5. Size: fit soft-shell fraction against ABW buckets (5–10, 10–15, 15–20, 20+ g) across farms to
   replace the eligibility gate's hard 5 g with a data-backed curve. This needs **cross-farm data**,
   so it follows H5.4's opt-in and k≥5 rules.

**When to start building:** once ≥20 farms have ≥3 windows each with post-molt observations.
Add a PostHog insight on `molt_observation_saved` (allowlisted, no pond ids) to watch for that
threshold. Until then, M2's data simply accumulates.

**Success test:** on held-out windows, the tuned peak day must predict the observed max-soft-shell
day better than the untuned one (mean absolute error). If it doesn't, don't ship the tuning.

---

## 3. Explicitly out of scope

- **Soft-shell price discount modelling.** No data. H6 avoids molt days instead.
- **Antibiotic withdrawal periods and residue compliance.** → Area 5.
- **Buyer / processor directory, invoices, payment tracking (credit sales, pending payments).**
  `harvests.status='pending'` exists but stays unused. Candidate for Money (area 6).
- **Proactive "harvest window opening" push.** → Area 8 (alerts & scheduling).
- **Scraping price posts.** Rejected in H5.3.
- **Dropping the `harvest_records` table.** Entity deleted in H0; table drop in a later cleanup migration.
- **`pond.status='harvesting'`.** Unused. Left alone.

## 4. Rollout

| Step | Contents | Migration (apply BEFORE backend deploy) | Old-app safety |
|---|---|---|---|
| 1 | H0 | none | All additive or stricter; old app gets 409/403 where it was wrong before |
| 2 | M1 | none | Alert keys added beside English; old clients unchanged |
| 3 | H1 + H2 | `1780700900000` harvest_grades + harvest columns | Old app posts no `grades` → old path |
| 4 | H3 | none | New screen only |
| 5 | H4 | `1780701000000` harvests.plan_id | `/complete` shim creates a harvest for old builds; 410 one release later |
| 6 | H5 + H6 | `1780701100000` farm_price_quotes | Harvest Timing on old builds keeps DEFAULT_BANDS until OTA |
| 7 | M2 | `1780701200000` molt_observations | New entry points only |

Timestamps continue after `1780700800000-AttendanceShiftAndAudit`. Re-check the latest migration
before creating each file; a concurrent session may have taken the next number.

**Next molt windows** (true phase, IST): full moon **26 Sep**, then new moon ~**11 Oct**. M1 items 3–4
ideally land before the 26 Sep peak (25–27 Sep).

## 5. Test gate (beyond each WS's own tests)

- `harvestTotals` pure-function table test:
  - mixed graded and ungraded lines;
  - a missing price → null total;
  - pieces estimated from ABW.
- Population after a partial harvest (counted and estimated), including the pond-context confidence drop.
- Delete a full harvest → cycle reopened. With a newer cycle present → 409.
- Plan → harvest: the plan is completed in the same transaction, a double submit completes once, and a foreign pond's plan → 400.
- Price interpolation:
  - between bands;
  - outside the range → `extrapolated`;
  - quote age > 30 d → missing.
- Harvest Timing:
  - ADG null → missing input;
  - optimal day in peak → `safeDay` both sides;
  - partial with risk 0 matches the hand calculation.
- Molt:
  - an NH₃ test in pre does **not** tick minerals;
  - a mineral treatment does;
  - a null-MBW newer sampling doesn't cause `sizeUnknown`;
  - violated handling → the alert clears when the other items are done;
  - an offline tick replays once.
- Observation `level` derivation at 9% / 10%.
- i18n parity across six locales (`localeParity.test.ts`) for `logs`, `engines`, `harvestPlans`, `reports` (new).
- Mutation-check every guard (VIEW_FINANCIALS masks, RECORD_HARVEST on complete, the cross-farm checks).

## 6. Doc corrections to carry

- `docs/FEATURES.md:110-111, 127, 136, 146`: harvest entities, plan cancel (doesn't exist), P&L t/ha, survival basis, Harvest Timing inputs.
- `docs/APP_FLOW.md:99`: the HarvestLog fields.
- `docs/superpowers/specs/2026-09-14-attendance-and-molt-fixes-design.md:3`: header still says "not implemented". It shipped in `63e4e3b`.
- `lunar.service.ts:505`: the false calibration claim (M1.7).
