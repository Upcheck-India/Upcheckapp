# High-Value Farmer Features — Frontend + Backend Build Spec

Companion to `jala_teardown.md`, `jala_teardown_india.md`, `lunar_module_spec.md`.
Ten features that turn the app from a logbook into a **decision engine**. Each runs
on data the app already collects. Conventions: currency ₹, area stored in m²
(shown in acres/cents), size shown as **count** (pcs/kg = 1000/ABW_g), stack is
assumed React Native (mobile-first) + a service/API backend with the existing
entity model.

Legend: **FE** = frontend, **BE** = backend, **Reuses** = existing logged data.

---

## TIER 1 — profit-defining decisions

### 1. Harvest-Timing Decision Engine ⭐
**Purpose:** answer "harvest now or wait?" — the single biggest profit lever.

**Reuses:** sampling ABW + ADG, SR/population estimate, standing biomass, carrying
capacity, count-price matrix, feed cost, recent FCR, disease/mortality risk (#2).

**BE — projection & optimization**
For each candidate day `d = 0..horizon` (e.g. 30):
```
ABW(d)      = growthProjection(ABW_now, ADG_now, d)      # decaying ADG curve
N(d)        = N_now × dailySurvival^d                    # from SR method
biomass(d)  = N(d) × ABW(d) / 1000                       # kg
count(d)    = 1000 / ABW(d)
price(d)    = priceMatrix.lookup(region, countBand(d))   # ₹/kg
gross(d)    = biomass(d) × price(d)
feedCost(d) = Σ_{0..d} dailyRation × feedPricePerKg
riskLoss(d) = gross(d) × cumulativeDiseaseRisk(d)        # 0..1 from #2
netProfit(d)= gross(d) − feedCost(d) − riskLoss(d)
```
```
d*          = argmax_d netProfit(d)   s.t. biomass(d)/area ≤ carryingCapacity
gain        = netProfit(d*) − netProfit(0)
recommend   = d*==0 ? "Harvest now" : "Hold d* days → +₹gain"
```
**Partial-harvest optimizer:** if `biomass/area > carryingCapacity` or growth
stalling, simulate thinning `p%` now (relieves density → survivors grow into a
higher-value lower count band); compare `netProfit(full-now)` vs
`netProfit(partial p% now + rest at d*)` across p ∈ {20,30,40%}; recommend best.

**BE entity:** `HarvestPlan { crop_id, generated_at, recommend{now|hold}, optimal_day,
projected_count, projected_biomass, projected_revenue, expected_gain, partial_plan[] }`

**FE**
- **Harvest Advisor card** on pond dashboard: big verdict ("HOLD 6 days → +₹38,400"
  or "HARVEST NOW — risk rising"), confidence chip.
- **Projection chart:** x = days, dual axis revenue (₹) and count; vertical marker
  at optimal day; shaded "risk overtakes reward" zone.
- **Scenario table:** Harvest today / Hold to d* / Partial now+later — rows with
  count, biomass, revenue, net profit, risk.
- **What-if sliders:** survival %, price ₹/kg, ADG → live re-projection.
- CTA "Create Harvest" pre-fills the existing Harvest form (base §9).

---

### 2. Disease Early-Warning Engine ⭐
**Purpose:** flag outbreaks days before visible loss; biggest loss preventer.

**Reuses:** water quality (DO, temp, pH swing, NH₃), chemistry, microbiology
(vibrio CFU), plankton, sampling (size CV), feeding-tray (white feces / off-feed),
mortality trend, lunar window (#lunar), regional map (#9), crop calendar/season.

**BE — per-disease signature scoring**
Each disease = weighted indicator set; pull latest value AND trend (slope over last
N readings). Score 0–100, banded Low/Watch/Critical.
```
signatures = {
  WSSV:   [ tempDrop>3°C/48h:.3, DO<4:.15, season=winter:.2, regionalWSSV:.2, redBody:.15 ],
  AHPND:  [ DOC<35:.25, yellowVibrio↑:.3, emptyGut:.25, paleHP:.2 ],
  EHP:    [ sizeCV↑:.3, ADG<expected:.3, whiteFecesTray:.25, region/WFD:.15 ],
  WFD:    [ whiteFecesTray:.4, vibrio↑:.3, EHPrisk↑:.3 ],
  Luminous:[ luminousVibrioCFU↑:.6, nightGlow:.4 ],
  RMS:    [ chronicDailyMortality:.5, multiStress(DO+NH3+temp):.5 ],
  LSS:    [ looseShellObs:.4, mineralDeficit:.4(india§5), HPstress:.2 ],
}
riskᵢ = 100 × Σ(indicatorMatched × weight)
```
`trend(param)` = linear-regression slope over last N logs; `↑` = slope above
threshold. Output ranked diseases + **specific corrective steps** per disease
(mirror the lunar playbook style, with computed mineral/probiotic doses).

**BE entity:** `DiseaseRiskSnapshot { pond_id, date, risks:[{disease, score, band,
triggers:[{indicator,value}], steps:[] }] }`

**FE**
- **Health Risk panel:** traffic-light tiles per disease, sorted by score; tap →
  detail with triggering data points and step checklist.
- **Trend sparklines:** the parameters driving each risk (vibrio, temp, DO).
- **Alert banner** + push when any disease crosses Critical.
- **"Why?" expander:** transparent indicator list (builds trust, avoids black box).

---

### 3. Daily Feed Advisor
**Purpose:** tell each pond exactly how much to feed today; adapts daily.

**Reuses:** biomass/population estimate, ABW, FR(ABW) table, feeding-tray residue,
lunar molt window, DO/temp/NH₃, fasting flag, feeding schedule (meals/day).

**BE**
```
biomass    = N_est × ABW / 1000
baseRation = biomass × FR(ABW)/100
trayFactor = lastTray: Empty→1.07, Few Left→1.0, A Lot Left→0.8
moltFactor = inMoltPeak ? 0.75 : 1.0           # from lunar module
envFactor  = (DO<4 ? .85:1) × (NH3>0.3 ? .8:1) × (T>33 ? .9:1)
ration     = baseRation × trayFactor × moltFactor × envFactor
ration     = fasting ? 0 : ration
mealSize   = ration / mealsPerDay
```
Track recommended vs actual fed → feed-adherence metric; rolling FCR.

**BE entity:** `FeedPlan { pond_id, date, recommended_kg, per_meal[], factors{},
actual_kg, adherence }`

**FE**
- **Today's Feed card** per pond: big number "Feed 61.5 kg today", meal chips
  (15.4 kg × 4), and the adjustment reasons as small tags ("−25% molt window",
  "−15% low DO").
- **Feed program table** (next 7 days projected) with download/print for pond staff.
- **Tray feedback loop:** quick tray-residue entry adjusts tomorrow live.
- Vernacular + icon mode for low-literacy feeders (#10).

---

### 4. Aeration & Power Optimizer
**Purpose:** attack the #2 cost (electricity/diesel) and prevent DO crashes.

**Reuses:** DO logs (+ diurnal min), biomass, density, plankton density, temp,
aerator inventory (HP), tariff.

**BE**
```
requiredHP = biomass_kg / 500            # ≈ 2 HP per tonne standing biomass (tunable)
deficitHP  = requiredHP − installedHP    # >0 → under-aerated alert
# night DO-minimum prediction (pre-dawn) from O2 budget:
predDOmin  = f(plankton respiration, biomass respiration, temp, current DO trend)
schedule   = on-times to keep predDOmin ≥ DO_target (e.g. ≥4 mg/L), focus 02:00–06:00
powerCost  = Σ aerator_HP × 0.746 × runHours × ₹perkWh   # 1 HP = 0.746 kW
                # diesel mode: Σ L/hr × runHours × ₹/L
```
**BE entities:** `Aerator { pond_id, type, hp, fuel{grid|diesel} }`,
`AeratorRun { aerator_id, start, stop, hours, cost }`.

**FE**
- **Aeration adequacy gauge:** installed vs required HP (red if deficit), "+2 HP
  recommended for current biomass."
- **Schedule recommendation:** timeline strip of suggested on-windows; night DO-min
  forecast line.
- **Power cost tracker:** ₹/day, ₹ cumulative, ₹/kg-shrimp contribution; grid vs
  diesel split.
- Outage/log entry + genset fuel tracker.

---

## TIER 2 — financial survival & operations

### 5. Crop P&L / Cost Accounting + Break-Even
**Purpose:** the number banks, insurers and farmers all want — cost ₹/kg & profit.

**Reuses:** feed logs, mineral/treatment dosing, harvests, count-price.

**BE**
```
Expense { crop_id, category{seed|feed|power|minerals|probiotics|labour|lease|
          chemicals|harvest|misc}, amount, date, supplier? }
totalCost   = Σ Expense
CoP_per_kg  = totalCost / harvestBiomass_kg
breakEvenCount = countBand where priceMatrix(count) == CoP_per_kg   # interpolate
revenue     = Σ harvest.biomass × harvest.price
profit      = revenue − totalCost ;  margin% = profit/revenue×100 ;  ROI = profit/totalCost
```
Live (pre-harvest) version uses *projected* biomass from the simulation/harvest
engine so break-even updates daily.

**FE**
- **P&L dashboard:** donut of cost breakdown, big "Cost of production ₹312/kg",
  "Break-even at count 48", projected profit with confidence band.
- **Expense entry** (quick-add, category icons, photo of bill).
- **Crop comparison:** bar chart CoP/profit across this farmer's past crops.
- Export PDF "crop statement" for bank/insurance.

### 6. Input Inventory + Credit/Dealer Tracking
**Purpose:** manage stock, dealer credit (a major Indian debt driver), and
counterfeit inputs.

**Reuses:** feed & treatment logs (auto-decrement), daily feed advisor (burn rate).

**BE**
```
InventoryItem { item, category, qty, unit, batch, supplier, unit_price, on_credit }
# consumption from logs:  qty -= loggedUse
reorderAlert when qty < threshold OR daysToRunout(burnRate) < leadTime
CreditLedger { dealer, principal, date, due_date, interest?, repaid, outstanding }
# repayment hook at harvest revenue
counterfeitFlag: link batch → pond KPIs; flag if results deviate vs batch baseline
```
**FE**
- **Stock list** with low-stock chips and "runs out in 4 days" projections.
- **Dealer credit view:** outstanding ₹ per dealer, due dates, repay-from-harvest
  planner.
- **Batch quality flag:** mark a probiotic/mineral batch as suspect; warning if its
  ponds underperform.

### 7. Pre-Stocking Pond Prep SOP Engine
**Purpose:** win the crop before stocking; gate "Start Cycle" on readiness.

**Reuses:** pond area/volume, soil/water tests, PCR fields (india §2).

**BE**
```
PrepTemplate = ordered tasks with gates:
  dry-out(days) → bottom soil pH → liming(dose) → fill → chlorination/treatment →
  fertilize/bloom → probiotic → PL acclimation → seed PCR check → DOC-0 gate
limeDose_kg = f(soilPH_target − soilPH_now, area, soilBufferFactor)
readiness = allCriticalTasksDone → unlock Start Cycle
```
**FE**
- **Stepper checklist** with per-task dose calc, due dates, photo evidence.
- **Readiness meter** (e.g. 7/9 done) gating the Create-Cycle button.
- Template library (coastal vs inland-low-saline prep differ).

### 8. Weather & Cyclone Alerts + Pre-Event Checklist
**Purpose:** disaster mitigation for the cyclone-prone east coast & WSSV cold snaps.

**Reuses:** weather log (base §4), temp trend, salinity, harvest engine (#1).

**BE**
```
rules:
  heavyRain      → salinity-dilution + mineral top-up alert (india §5)
  tempDrop>3°C   → WSSV risk boost (feeds #2)
  cycloneWarning → trigger PreCycloneChecklist + emergency-harvest evaluation (#1)
PreCycloneChecklist = [ lower water level, secure/elevate aerators, genset fuel,
  reinforce bunds, decide emergency partial harvest, stock minerals/oxygen ]
```
(Weather input manual now; pluggable to free IMD feed later.)

**FE**
- **Weather advisory banner** + severity.
- **Pre-cyclone checklist** modal with the emergency-harvest CTA wired to #1.
- Post-rain mineral/salinity recheck reminder.

---

## TIER 3 — adoption enablers & network effects

### 9. Regional Anonymized Biosecurity Map ⭐
**Purpose:** dense Andhra clusters → neighbour outbreaks raise your risk; network moat.

**Reuses:** opt-in disease logs (base §9), farm geo (district/mandal/grid).

**BE**
```
aggregate opt-in DiseaseReports by geo-cluster + time window
privacy: k-anonymity — only surface a cluster if ≥k farms (e.g. k≥3)
regionalRiskFactor(pond) = f(nearby outbreaks within radius R, last T days, disease)
  → boosts that disease's score in #2
```
**FE**
- **Heat map** (district/grid) of disease pressure; your pond pinned; legend by
  disease; time slider.
- **"3 WSSV reports within 5 km in last 7 days"** alert → elevates #2 risk.
- Opt-in toggle + privacy explainer (data anonymized & aggregated).

### 10. Offline-First + Vernacular + Low-Literacy UX
**Purpose:** foundation for rural adoption — not a feature, a requirement.

**BE/Infra**
```
local store (SQLite/WatermelonDB/Realm) + sync queue
conflict resolution: per-field last-write-wins + server merge; idempotent sync ids
all calculators run client-side (work offline)
i18n bundles: Telugu, Tamil, Hindi, English; number/area/currency localization
```
**FE**
- **Offline indicator** + pending-sync badge; everything works without signal.
- **Language switcher**; voice input (regional speech-to-text) for numeric logs.
- **Icon/photo-driven flows**, large tap targets, minimal text for pond workers.
- Audio playback of advisories for non-readers.

---

## Cross-cutting: Unified Alert Center & Notifications
All engines (lunar, disease, feed, aeration, harvest, weather, inventory) emit into
one **Alert** stream:
```
Alert { pond_id, source, severity{info|watch|critical}, title, body, steps[],
        created_at, acknowledged_by, status }
```
**FE:** a single notification inbox + per-pond badge; daily "morning briefing" card
summarizing every pond's top action. Prevents alert fragmentation across modules.

---

## Build order (dependency-aware)
1. **#10 offline/vernacular foundation** + **Alert Center** (everything rides these).
2. **#3 Feed Advisor** (daily habit, reuses existing data) → drives engagement.
3. **#2 Disease Early-Warning** (loss prevention) → **#9 regional map** extends it.
4. **#1 Harvest-Timing** (profit lever; needs price matrix + sim).
5. **#5 P&L / #6 Inventory-Credit** (financial layer).
6. **#4 Aeration / #7 Pond-Prep / #8 Weather** (operational completeness).

### Unit tests to add
```
- harvest: netProfit curve concave, d* respects carrying-capacity cap, partial>full when over-stocked
- disease: each signature fires on its indicator set; trend slope sign correct
- feed: ration→0 on fasting; tray/molt/env factors multiply correctly
- aeration: requiredHP & powerCost (1 HP=0.746 kW); deficit alert sign
- P&L: CoP=totalCost/biomass; break-even count interpolation
- inventory: auto-decrement from feed log; runout projection
- map: k-anonymity suppression below k; regionalRiskFactor boosts #2
- offline: queued write syncs idempotently; client calc == server calc
```
