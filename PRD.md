# MASTER PRD — Upcheck (working name)
## The Operating System for Indian Shrimp Aquaculture

**Version:** 1.0 · **Date:** 2026-06-13 · **Owner:** Product
**Companion specs (authoritative detail):** `jala_teardown.md` (core science),
`jala_teardown_india.md` (India layer), `lunar_module_spec.md`,
`farmer_features_spec.md`, `data_collection_audit.md` (ML-readiness).

> **Mission:** make every Indian shrimp farmer run a profitable, disease-resilient,
> export-compliant crop — by turning the phone into a decision engine today and a
> sensor-fed, ML-powered farm OS tomorrow. **Goal: market leadership in Indian
> aquaculture.**

---

## 1. Executive Summary

India is the world's largest shrimp **exporter**; ~95% of culture is *P. vannamei*,
dominated by Andhra Pradesh (~65–70%), then Tamil Nadu, Gujarat, Odisha, West
Bengal. Yet most farmers manage by intuition, notebooks, and WhatsApp — losing
crops to disease, overfeeding, mistimed harvests, power costs, and debt.

Existing tools (e.g. JALA in Indonesia) are strong **logbooks + simulators** but
weak on the things Indian farmers actually need: *deciding* (when to harvest, how
much to feed, when to worry) and *surviving financially* (power, credit, disease
loss). They also ignore India-specifics: inland low-salinity mineral management,
count-based pricing, CAA/MPEDA compliance, India-prevalent diseases, and the
cyclone-prone east coast.

**Upcheck Aqua** is built in three architectural commitments that define the
product and the moat:
1. **Decision engine, not a logbook** — every screen drives an action with numbers.
2. **Sensor-ready from day one** — manual entry now flows through the *same*
   measurement pipeline sensors will use later; zero rework when IoT deploys.
3. **ML-ready data foundation** — provenance-tagged, labelled, versioned data so a
   future model trains on a clean, India-specific dataset no competitor has.

This document consolidates **every feature agreed** and sequences them into a
phased roadmap to leadership.

---

## 2. Market Opportunity & Problem

**Opportunity:** millions of pond-crops/year across ~150k+ farms; high input spend
(feed alone ≈ 55% of cost); acute, repeated pain (disease wipeouts, debt). A farm
OS that demonstrably raises profit per pond and lowers loss has strong willingness
to adopt and a natural data network effect.

**Problems we solve:**
- **Unpredictable disease loss** (WSSV, EHP, WFD, RMS, LSS) — the #1 financial risk.
- **Feed waste & poor FCR** — the #1 cost, driven by guesswork.
- **Mistimed harvests** — leaving lakhs of rupees on the table at the wrong count.
- **Power/aeration cost** — top-3 cost, unmanaged.
- **Mineral deficiency in inland low-salinity ponds** — soft-shell/molt death.
- **Debt & opacity** — dealer credit, no cost-of-production clarity for banks.
- **Compliance & traceability** — CAA/MPEDA, antibiotic residue rejections on export.
- **Low digital literacy & connectivity** — most tools are unusable in the field.

---

## 3. Goals & Success Metrics

**North-Star Metric:** *verified profit uplift per pond per crop* (₹), tracked via
the in-app P&L vs. a baseline cohort.

| Goal | KPI | Target (24 mo) |
|---|---|---|
| Farmers win more crops | Crop success rate (no crash/emergency harvest) | +15–25% vs baseline |
| Lower feed waste | Mean FCR | −0.1 to −0.2 |
| Better timing | Avg realized count value vs region median | +5–10% ₹/kg |
| Loss prevention | Disease-caught-early rate (warning ≥3 days pre-onset) | >50% |
| Adoption | Active ponds logging daily during a live crop (DAU/active-crop) | leading share in AP |
| Data moat | Mean `data_completeness_score` per crop | >0.7 |
| Financial inclusion | Crops with exportable P&L statement | majority |

---

## 4. Personas

- **Small/medium farmer (primary)** — 1–10 ponds, 1–4 acres each, low-to-medium
  digital literacy, Telugu/Tamil/Hindi, intermittent connectivity. Needs simple
  daily decisions and money clarity.
- **Pond worker/feeder** — low literacy; needs icon/voice task lists.
- **Farm technician / consultant (agronomist)** — manages many farms; power user of
  chemistry, microbiology, disease, simulation.
- **Hatchery / feed dealer** — supplies inputs, extends credit (later: B2B surface).
- **Processor / exporter** — wants traceability & compliance (later).
- **Lender / insurer** — wants cost-of-production & risk data (later).

---

## 5. Product Principles (design tenets)

1. **Every screen ends in an action** — show the number and the next step.
2. **Sensor-agnostic data model** — a value is a value; `source` distinguishes
   manual/sensor/lab/derived/photo-AI. Engines never branch on source.
3. **Offline-first** — everything works with no signal; sync later, idempotently.
4. **Vernacular & low-literacy by default** — language, voice, icons, audio.
5. **Capture once, reuse everywhere** — one measurement feeds many engines.
6. **Trust through transparency** — every prediction shows the data behind it.
7. **Tiered effort** — mandatory core is tiny; richness is optional/auto-captured.
8. **India-first** — units (acre/cent/lakh/count), ₹, compliance, local diseases.

---

## 6. Architecture (sensor-ready, ML-ready)

### 6.1 Layers
```
┌── Clients ──────────────────────────────────────────────┐
│ Mobile (React Native, offline-first) · Web (consultant) │
└─────────────────────────────────────────────────────────┘
            │ idempotent sync (queue + conflict resolution)
┌── API / Service layer ──────────────────────────────────┐
│ Auth · Farm/Pond/Crop · Measurement ingest · Engines     │
│ (lunar, feed, disease, harvest, aeration, P&L) · Alerts  │
└─────────────────────────────────────────────────────────┘
            │
┌── Ingestion bus (unified) ──────────────────────────────┐
│  Manual entries ─┐                                       │
│  Lab results ────┼──►  MEASUREMENT PIPELINE  ──► Store    │
│  Photo-AI ───────┤     (validation, metadata,            │
│  IoT telemetry ──┘      units, dedup, label)             │
└─────────────────────────────────────────────────────────┘
            │
┌── Data platform ────────────────────────────────────────┐
│ OLTP store · immutable event log · time-series ·         │
│ feature store · data dictionary (versioned) · CV image   │
│ lake · CropOutcome label store  →  ML training/serving    │
└─────────────────────────────────────────────────────────┘
```

### 6.2 The keystone: one Measurement envelope for ALL sources
Manual today, sensor tomorrow — identical schema, so **no engine changes when IoT
deploys** (full field list in `data_collection_audit.md §3`):
```
Measurement {
  pond_id, crop_id, DOC, param, value, unit,
  measured_at, time_of_day,
  source {manual | sensor | lab | derived | photo_ai},
  instrument, device_id, entered_by, confidence,
  is_missing_reason {not_measured | not_applicable | sensor_fail | null},
  edited_from
}
```
**Implication:** in Phase 1 a farmer types DO = 4.2 (source=manual). In Phase 3 a
probe writes DO = 4.2 every 5 min (source=sensor). The Feed Advisor, Disease
Engine, Aeration Optimizer, and Harvest Engine consume the same field unchanged.

---

## 7. Phased Roadmap (build sequence to leadership)

| Phase | Theme | Headline capabilities |
|---|---|---|
| **P0 Foundation** | Rails | Entities; offline-first + sync; i18n/vernacular + voice/icons; **Alert Center**; Measurement envelope; versioned data dictionary |
| **P1 Logbook + Calc (MVP)** | Capture & compute | All data-capture modules (manual); 4 Farm Calculators; Simulation engine; India units/₹/count; CAA/MPEDA + PCR; count-price matrix (crowdsourced); pond/farm dashboards |
| **P2 Decision Engine** | Intelligence (manual data) | Daily Feed Advisor; Disease Early-Warning; Harvest-Timing; Lunar molt module; Aeration & Power; Inland mineral mgmt; Crop P&L + break-even; Inventory + credit; Pond-prep SOP; Weather/cyclone |
| **P3 Sensor / IoT** | Automate capture | Device registry; telemetry ingestion; real-time DO/pH/temp/ORP/EC/level; aerator power monitors; auto-feeder integration; edge buffering; sensor-driven alerts & control hooks |
| **P4 ML + Network** | Predict & connect | Predictive disease/growth/SR/FCR/yield models; CV (photo weight/disease/count); Harvest optimizer v2; **Regional biosecurity map**; benchmarking |
| **P5 Ecosystem** | Consolidate lead | Input marketplace; finance/insurance data products; full export traceability; B2B (dealer/processor) |

Each phase ships standalone value; **the data model never breaks** across phases.

---

## 8. Feature Catalog (all agreed features)

Each entry: **purpose · FE · BE · sensor/ML note.** Formulas are summarized; full
derivations live in the companion specs.

### 8.A Foundation (P0)
- **Core entities** — Farm→Pond→Crop→logs (`jala_teardown.md §0`). Pond geometry →
  area/volume; stocking density.
- **Offline-first + sync** — local store, queued idempotent sync, per-field
  last-write-wins. *FE:* offline badge, pending-sync count. *BE:* conflict resolver.
- **Vernacular/low-literacy** — Telugu/Tamil/Hindi/English, voice numeric input,
  icon/photo flows, audio advisories.
- **Alert Center** — unified stream from all engines; daily morning-briefing card.
  `Alert{pond_id, source, severity, title, steps[], status}`.
- **Measurement envelope + data dictionary** (§6.2, audit §3, §8).

### 8.B Data-capture modules (P1, manual → P3 sensor)
All write through the Measurement pipeline; validation bounds per `india` & base.
- **Water Quality** — pH, salinity, temp, DO, DO%, ORP, EC, turbidity, transparency,
  water height, color, weather; AM/PM time-of-day. *(sensor-targets: DO, pH, temp,
  ORP, EC, level.)*
- **Chemistry & nutrients** — NH3, NO2, NO3, alkalinity, hardness, Ca, Mg, K, Na,
  Cl, CO3, HCO3, TOM, NH4, PO4, **+ H₂S, silicate** (audit §2). Derives TAN, free
  NH₃, ionic ratios.
- **Plankton** & **Microbiology** — species/vibrio counts; totals auto-summed; ratios.
- **Feed** — product/brand/grade/bag, qty, cumulative, fasting, **+ protein%, method,
  feedings/day** (audit §2).
- **Feeding Tray (anco)** — residue scoring → feed-adjustment loop.
- **Sampling** — MBW/ABW + **individual sample weights (CV)** + photo; ADG/SGR/count.
- **Health / Clinical-signs checklist (NEW, audit §2)** — red body, white spot,
  soft/loose shell, gut fullness, white feces, black gill, behaviour, feeding
  response → early disease signal + ML labels.
- **Mortality** — event (count/multiplier) **+ daily baseline** trend.
- **Treatment** — structured product/active-ingredient/dose/method/reason/withdrawal.
- **Water-exchange events (NEW)** — volume/source/%.
- **Disease** — name(enum: incl. RMS, LSS), photos(tagged), notes; reference library.
- **Harvest** — date/type/weight/count/price/buyer; total price; ABW=1000/count.

### 8.C Calculators & Simulation (P1)
- **Farm Calculators (4)** — Cultivation Performance (Biomass=Feed/FR; Pop=Biomass×
  1000/ABW; FCR; SR); Daily Feed; Product/Mineral Dose = Area×Level×ppm/1000; **Free
  Ammonia** NH₃=TAN/(1+10^(pKa−pH)), pKa=0.09018+2729.92/(T+273.15).
- **Simulation Engine** — day-by-day growth (anchored on target **count**), FR(MBW)
  table, survival decay, partial-harvest schedule → feed/biomass/harvest projections,
  total feed, FCR, economics (`jala_teardown.md §12`, `india §10`).

### 8.D India layer (P1)
- **Units & money** — acre/cent/lakh in, m²/PL internal; size as **count**; ₹.
- **Regulatory & compliance** — CAA reg, MPEDA, pre-stocking PCR, **banned-antibiotic
  lock-list + withdrawal enforcement → export-eligible badge** (`india §2`).
- **Inland low-salinity mineral mgmt** — ionic targets (Na:K≈28:1, Mg:Ca≈3:1, min K),
  mineral-dose calculator with Indian-input presets (MOP/dolomite/gypsum/Epsom).
- **Count-based pricing** — PriceFeed matrix by region & count band (crowdsourced
  primary; CSV/API adapters later — API deferred per decision).
- **Economics** — full INR cost stack; CoP ₹/kg; break-even count; productivity t/ha.
- **Crop calendar** — 2-crop seasonality; monsoon/winter risk flags.

### 8.E Decision engines (P2) — *the differentiators* (`farmer_features_spec.md`)
- **Daily Feed Advisor** — ration = biomass×FR(ABW) × tray × molt × env factors;
  per-meal split; adherence/FCR tracking. *FE:* "Feed 61.5 kg today" + reason tags.
- **Disease Early-Warning** — per-disease signature scoring from latest+trend
  (WSSV/AHPND/EHP/WFD/Luminous/RMS/LSS); ranked risks + steps; transparent triggers.
- **Harvest-Timing Engine** — netProfit(d)=gross−feedCost−riskLoss; optimal day d*;
  partial-harvest optimizer. *FE:* verdict card, projection chart, scenario table,
  what-if sliders → pre-fills Harvest form.
- **Lunar Molt Module** — semi-lunar molt likelihood; pond-data-tailored pre/peak/
  post playbook (minerals, aeration, feed-cut, no-handling); adaptive calibration.
- **Aeration & Power Optimizer** — requiredHP=biomass/500; night DO-min forecast;
  schedule; powerCost=HP×0.746×hrs×₹/kWh; adequacy gauge & ₹/kg tracking.

### 8.F Financial & operations (P2)
- **Crop P&L + Break-Even** — expense ledger; CoP ₹/kg; break-even count; ROI;
  exportable bank/insurer statement.
- **Inventory + Credit/Dealer** — auto-decrement from logs; runout projection;
  dealer-credit ledger (repay-from-harvest); counterfeit-batch flagging.
- **Pre-Stocking Pond-Prep SOP** — gated checklist; lime-dose calc; DOC-0 readiness
  gate on Start-Cycle.
- **Weather & Cyclone** — advisory rules; pre-cyclone checklist wired to emergency
  harvest; post-rain mineral/salinity recheck.

### 8.G Network & moat (P4)
- **Regional Biosecurity Map** — k-anonymized neighbour-outbreak data raises a pond's
  disease risk; opt-in; network effect in dense clusters.
- **Benchmarking** — pond-vs-pond and vs anonymized regional cohort.

---

## 9. Sensor / IoT Integration (P3) — designed-for-now, deployed-later

**Design rule:** the app must require **zero schema or engine changes** when sensors
arrive. Achieved via §6.2 (one Measurement envelope, `source` field).

### 9.1 Device & telemetry model
```
Device { device_id, pond_id, type{DO|pH|temp|ORP|EC|level|camera|power_meter|
         auto_feeder|weather}, vendor, model, install_date,
         calibration{last_at, offset, slope}, status, firmware }
Telemetry → MeasurementPipeline (source=sensor, device_id, confidence)
            with edge buffering + backfill on reconnect (offline ponds)
```

### 9.2 Target sensor classes
- **Water probes** — DO, pH, temperature, ORP, EC/salinity, water level → continuous
  WQ; replaces/augments manual logs; powers real-time DO-crash alerts.
- **Aerator power monitors** — runtime, current, kWh per aerator → exact power cost &
  failure detection (the highest-ROI IoT class in Indian shrimp).
- **Automatic feeders** — feed-dispensed telemetry + acoustic feeding-activity → closes
  the Feed-Advisor loop with actual intake.
- **Pond cameras** — feeding-tray residue, water color, surface behaviour → CV inputs.
- **Weather station / gateway** — local rainfall, temp, wind.

### 9.3 Capabilities unlocked
- **Real-time alerts & control hooks** — DO < threshold → auto-aerator-on (Phase 3.5
  closed loop), push alert.
- **Calibration management** — every reading carries device calibration; drift alerts.
- **Hybrid ponds** — some sensored, some manual; engines treat both identically.
- **Sensor-vs-manual reconciliation** — cross-check & confidence weighting.

### 9.4 Migration guarantee
Because manual entries already populate the same `param/value/unit/source` rows,
historical manual data and future sensor data form **one continuous time series** per
pond — directly usable for ML and trend engines with no backfill gymnastics.

---

## 10. Data Platform & ML Strategy (P4, foundation laid in P0–P1)

Detailed in `data_collection_audit.md`. Essentials:
- **Provenance metadata on every value** (§6.2) — units, time-of-day, source,
  instrument, confidence, **null≠0** (`is_missing_reason`), immutable raw + edit log.
- **Frozen CropOutcome labels** at harvest close — final SR/FCR/count/yield/profit/
  CoP/disease-onset-DOC/outcome-class + `data_completeness_score`. *These are the ML
  targets.*
- **Image data lake** — sampling/disease/water-color/tray photos stored *with* their
  measured value as label → CV training sets accumulate from day 1.
- **Versioned data dictionary / feature catalog** — coded enums (not free text),
  ranges, units; schema changes are migrations.
- **Model roadmap:** (1) disease-onset early prediction; (2) growth/SR/FCR forecast;
  (3) yield & profit prediction; (4) harvest-timing optimizer v2; (5) CV weight/
  disease/count; (6) regional spatio-temporal outbreak forecasting.
- **Why we win:** a clean, labelled, India-specific, multi-modal dataset (water +
  chemistry + microbiology + feed + health + imagery + outcomes + geo) that no
  competitor is structurally positioned to collect.

---

## 11. Non-Functional Requirements

- **Offline-first:** all capture + calculators work with no connectivity; sync
  idempotent; no data loss.
- **Performance:** dashboards < 2s on low-end Android; engines compute client-side
  where possible.
- **Scale:** designed for 100k+ ponds, high-frequency sensor telemetry (P3) via the
  ingestion bus + time-series store.
- **Reliability:** edge buffering; at-least-once telemetry with dedup.
- **Security & privacy:** role-based access; opt-in data pooling; anonymization for
  the regional map; **DPDP Act (India) compliance**; raw-data immutability/audit.
- **Localization:** full i18n; locale-aware units/number/currency.
- **Accessibility:** large targets, voice, audio, color-blind-safe alert palette.

---

## 12. Differentiation — why this becomes the leader

| Capability | Typical Indian apps / JALA | Upcheck Aqua |
|---|---|---|
| Decision support (feed/harvest/disease/aeration) | weak/none | **core engines** |
| Inland low-salinity mineral mgmt | absent | **first-class** |
| Count-based pricing & break-even | rare | **built-in** |
| CAA/MPEDA + antibiotic withdrawal + export badge | manual | **enforced** |
| Lunar molt scheduling on pond data | none | **unique** |
| Power/aeration cost optimization | hardware-only vendors | **software + IoT** |
| Sensor-ready unified data model | bolt-on | **designed-in** |
| ML-ready labelled dataset + CV | none | **foundational moat** |
| Offline + vernacular + low-literacy | partial | **default** |
| Regional biosecurity network effect | none | **compounding moat** |

Leadership thesis: **best daily decisions → measurable profit uplift → adoption →
proprietary labelled data → better models & network effects → durable lead.**

---

## 13. Risks & Mitigations

- **Adoption friction (literacy/connectivity)** → offline-first, vernacular, tiny
  mandatory core, voice/icons.
- **Data sparsity early** → tiered + auto-captured datapoints; completeness nudges.
- **Prediction trust** → transparent triggers; conservative, explainable rules
  before ML.
- **Sensor cost/reliability in field** → software-first value; sensors optional &
  hybrid; edge buffering.
- **Price-data availability** → crowdsourced primary (API deferred).
- **Compliance liability** → enforce withdrawal/PCR gates; clear advisories, not
  guarantees (esp. disease/lunar).
- **Privacy/regulatory (DPDP)** → consent, anonymization, data minimization.

---

## 14. Out of Scope (this version) / Future
- Live external price API integration (**deferred** — crowdsourced for now).
- Sensors **not deployed in current version** (architecture ready; rollout P3).
- Marketplace/finance/insurance B2B surfaces (P5).
- Closed-loop automated aerator/feeder control (P3.5+).

---

## 15. Appendix — canonical formulas (stand-alone reference)

```
Area/volume:     area=L×W (or π r²); volume_m³=area×depth; density=seed/area
Count↔weight:    count = 1000 / ABW_g
Cultivation:     Biomass=DailyFeed/FR ; Pop=Biomass×1000/ABW ; FCR=CumFeed/Biomass
                 SR=Pop/InitStock×100
Daily feed:      Feed/day = InitStock×(SR/100)×ABW×(FR/100)/1000
Dose:            Amount_kg = Area×Level×ppm/1000
                 Mineral_kg = deficit_ppm×volume_m³/1000/purity
Free ammonia:    NH3 = TAN/(1+10^(pKa−pH)) ; pKa=0.09018+2729.92/(T+273.15)
Growth/health:   ADG=ΔABW/Δd ; SGR=(lnABWt−lnABWt₋)/Δ×100 ; CV from sample weights
Lunar molt:      MoltLikelihood=(cos(4π·phase)+1)/2 ; LunarLock=clamp((ABW−3)/17,.2,1)
Aeration:        requiredHP=biomass/500 ; powerCost=HP×0.746×hrs×₹/kWh
Harvest:         netProfit(d)=biomass(d)×price(count(d)) − feedCost(0..d) − riskLoss(d)
Economics:       CoP=totalCost/harvestBiomass ; breakEven=count where price=CoP
                 profit=revenue−cost ; productivity_t/ha=biomass/area×10
```
Full derivations & validation: companion specs listed in the header.

---
*End of Master PRD v1.0. This document supersedes scattered notes and is the single
source of truth for scope; detailed formulas/UX live in the four companion specs.*