# Data Collection Audit — ML-Readiness & Gap Analysis

Companion to the four build specs. Goal: capture every datapoint a farmer *can*
provide, structured so a future ML model (disease prediction, growth/SR/FCR
forecasting, harvest-timing, yield & profit prediction, computer-vision) can train
on it. Audited against `jala_teardown.md`, `jala_teardown_india.md`,
`lunar_module_spec.md`, `farmer_features_spec.md`.

**Core principle:** ML value ≠ number of fields. It = **labelled + provenance-tagged
+ consistently-structured + granular** data. A field with no units, no timestamp,
no "why missing", and no outcome to predict is noise. And **over-asking kills
adoption** — so §7 defines a tiered strategy (core / optional / auto-captured) to
maximize data *without* burdening the farmer.

Legend: ✓ covered · ◑ partial · ✗ missing.

---

## 1. Coverage matrix (what we already have)

| Domain | Status | Notes |
|---|---|---|
| Farm geo / CAA-MPEDA / water source / farm type | ✓ | india §2 |
| **Pond construction** (lined/earthen, liner age) | ✗ | strong disease/quality predictor |
| **Pond history** (age, # prior crops, prior outcome/disease) | ✗ | disease carry-over — high value |
| Pond geometry / area / volume | ✓ | base §1 |
| Aerator inventory (HP/type/placement) | ◑ | feature §4 has HP; add count/placement |
| **Biosecurity infra** (crab fence, bird net, foot bath, reservoir) | ✗ | predictor + benchmarking |
| Pond prep tasks / lime / fill | ✓ | feature §7 |
| **Soil/sediment** (bottom pH, organic matter, sludge, black-soil, texture) | ◑ | only prep soil-pH; add sediment over cycle |
| Seed hatchery / broodstock / species / PCR | ◑ | india §2,3 — see PL quality below |
| **PL quality** (stress-test survival, uniformity, PL stage, count accuracy) | ✗ | top setup-time predictor of crop success |
| **Nursery phase** (if used) | ✗ | growing in India |
| Stocking density / date / total | ✓ | base §2 |
| **Stocking conditions** (time, temp/salinity at stock, acclimation mins) | ◑ | |
| Water quality (pH, sal, temp, DO, DO%, ORP, EC, turbidity, transparency, height, color, weather) | ✓ | base §4 — comprehensive |
| **H₂S** | ✗ | critical bottom toxin — add to chemistry |
| **Quantitative rainfall (mm), air temp, wind, humidity, pressure** | ✗ | env drivers; weather is only qualitative now |
| **Silicate, Fe, BOD/COD** | ✗ | minor; silicate = diatom nutrient |
| Chemistry (NH3/NO2/NO3/alk/hardness/Ca/Mg/K/Na/Cl/CO3/HCO3/TOM/NH4/PO4) | ✓ | base §5 + india §5 minerals |
| Plankton species counts | ✓ | base §6 |
| Microbiology (vibrio, total bacteria) | ✓ | base §6 |
| Feed qty / cumulative / fasting / brand / bag | ✓ | base §7, india §4 |
| **Feed metadata** (protein %, grade/size, feedings/day, method: hand/boat/auto-feeder, additives top-dressed) | ◑ | grade implied; add method & protein |
| Feeding-tray residue | ✓ | base §7 |
| Sampling MBW/ABW + photo | ✓ | base §8 |
| **Size variation / CV** (capture *individual* sample weights, not just mean) | ✗ | EHP/uniformity signal — high value, cheap |
| **Length, gut fullness, HP colour/condition, gill, shell, muscle, molt stage** | ✗ | structured shrimp-condition exam |
| Mortality events (count / multiplier) | ◑ | base §9 — add daily baseline mortality |
| **Daily clinical-signs checklist** (red body, white spot, empty gut, loose shell, white feces, black gill, cramped tail, fouling, behaviour/surfacing, feeding response) | ✗ | gold for disease ML + early warning |
| **In-cycle lab/PCR results** (WSSV/EHP/vibrio counts over time) | ✗ | strong labels |
| Treatment (text / product) | ◑ | base §9 — structure: product, active ingr, dose, method, reason, withdrawal (india §2) |
| **Water-exchange events** (volume, source, %) | ✗ | structured |
| Disease event (name/photo) | ✓ | base §9, india §6 |
| Harvest (date/type/weight/count/price/buyer) | ✓ | base §9 |
| **Post-harvest** (method, size distribution, processor grade, rejection reason) | ✗ | |
| Aerator runtime / power cost | ✓ | feature §4 |
| Expenses (full categories) | ✓ | feature §5 |
| Inventory / supplier / batch / credit | ✓ | feature §6 |
| Labour / task-by-whom | ✗ | ops + accountability |
| Moon phase / tide / molt observation | ✓ | lunar module |
| Regional disease context | ✓ | feature §9 |
| **Crop OUTCOME label record** (final SR, FCR, count, yield, t/ha, profit, CoP, disease-onset DOC, success/fail, emergency-harvest flag) | ◑ | derivable but must be an explicit, frozen label record — see §5 |

---

## 2. High-value missing datapoints — prioritized by ML predictive power

Ranked by expected lift for the core targets (disease, growth/SR, FCR, yield/profit):

1. **Daily clinical-signs checklist** (structured, tap-to-log): red body, white
   spots, soft/loose shell, empty/half/full gut, white feces, black gill, cramped
   tail, fouling/epibionts, swimming/surfacing, feeding response. → the richest
   *early* disease signal AND the label source for disease-onset models. Cheap to
   collect (checkboxes), huge value.
2. **PL quality at stocking**: formalin/salinity **stress-test survival %**, size
   uniformity (CV), PL stage (PL10–12), PCR panel result. → best DOC-0 predictor of
   whether the crop succeeds; set once, high leverage.
3. **Pond history**: pond age, number of previous crops, previous crop's
   outcome/disease, days fallow/dried between crops. → disease carry-over &
   sediment-load predictor.
4. **Size variation / CV** at each sampling: store **individual sampled weights**
   (e.g. 30 shrimp), not just the mean. CV is an EHP/competition/health signal and
   costs nothing extra at sampling time.
5. **H₂S** (and bottom sediment: pH, organic matter, sludge depth, black-soil
   patches): the classic silent killer at the pond bottom; absent from current
   chemistry set.
6. **Quantitative weather**: rainfall mm, air temp, wind, humidity, pressure. →
   environmental driver for DO crashes, salinity dilution, WSSV cold snaps. (Can be
   farmer-logged now, free-API-fed later.)
7. **Water-exchange events**: volume in/out, source, % exchanged, date. → confounder
   you must record to interpret water-quality changes.
8. **Daily baseline mortality** (continuous low-level count), not just outbreak
   events → mortality-trend models (RMS/chronic).
9. **Feed metadata**: protein %, grade/size, feedings per day, delivery method
   (hand/boat/auto-feeder), additives top-dressed → FCR & growth modelling.
10. **Gut fullness & feeding response** (daily, from check tray) → appetite/health
    leading indicator.

---

## 3. The ML metadata / provenance layer (the part most apps skip)

Every datapoint should carry metadata, or it's much weaker for training. Wrap all
measurements in an envelope:

```
Measurement {
  value, unit,                       # enforced units (already validated)
  measured_at (timestamp, tz),       # not just date — time-of-day matters (diurnal DO/pH)
  time_of_day {dawn|morning|noon|evening|night},
  source {manual | sensor | derived | photo-AI | lab},
  instrument {test_kit | probe | titration | refractometer | ...},   # method bias
  entered_by (user_id, role),        # quality weighting
  device_id,                         # sensor calibration tracking
  confidence,                        # for AI/photo-derived values
  is_missing_reason {not_measured | not_applicable | sensor_fail | null},  # null ≠ 0
  edited_from (audit link)           # keep raw; never overwrite (base already warns on edits)
}
```

Why each matters for ML:
- **time_of_day** — DO/pH/ammonia are diurnal; a value without time is half-useless.
- **source/instrument** — manual test-kit vs probe vs lab have different bias/noise;
  the model (and data cleaning) needs to know.
- **is_missing_reason** — distinguishing "not measured" from "measured zero" is
  critical; imputing them the same corrupts training.
- **edited_from / raw retention** — keep the immutable event log; never destroy raw
  readings (enables relabeling and leak-free backfills later).

---

## 4. Granularity & frequency rules

- Store **per-pond, per-event**, never pre-aggregated to daily/weekly (you can always
  roll up; you can't un-aggregate).
- Capture **multiple readings/day** where farmers do (dawn + evening DO/pH) — the app
  already supports measurement hours; make AM/PM explicit.
- Keep **continuous time series** intact (feed daily, mortality daily) so sequence
  models (LSTM/temporal transformers) can use them.
- Tag each record with **DOC** and **crop_id** so everything aligns to a culture
  timeline.

---

## 5. Outcome labels — the ML targets (must be explicit, not just derivable)

Create a frozen **CropOutcome** record at harvest close (the supervised targets):

```
CropOutcome {
  crop_id,
  final_SR_pct, final_FCR, final_count, total_yield_kg, productivity_t_ha,
  ADG_mean, cultivation_days,
  disease_occurred {none | [diseases]}, disease_onset_DOC, disease_confirmed_by,
  emergency_harvest {Y/N}, crash {Y/N},
  revenue, total_cost, profit, CoP_per_kg, margin_pct, ROI,
  outcome_class {success | partial | failure},      # derived but stored
  data_completeness_score                            # how much of the cycle was logged
}
```
Without these frozen at the right time, every model is unsupervised guesswork.
**`data_completeness_score`** also lets you weight/clean training rows by how
well-logged each crop was.

---

## 6. Image / CV data strategy

Photos are a first-class data asset — capture them *structured* for future vision
models, even before you build the models:
- **Sampling photos** → shrimp weight/length & count estimation (the "Photo Sampling"
  feature) — store with the measured MBW as the label.
- **Disease photos** → tag with confirmed disease, body part, clinical sign,
  DOC, lab-confirmation flag → disease-ID classifier training set.
- **Water-color photos** → label with measured plankton/transparency → bloom estimator.
- **Feeding-tray photos** → label with residue category → auto-residue scoring.
Each image: `{ pond_id, crop_id, DOC, type, labels[], linked_measurement_id }`.

---

## 7. Collection strategy — maximize data WITHOUT killing adoption

The tension: rich data vs low-literacy, low-connectivity farmers (#10). Resolve with
three tiers + progressive disclosure:

- **CORE (mandatory, ~10 fields):** stocking, daily feed, periodic DO/pH/temp/sal,
  sampling MBW, mortality, harvest. Few taps; works offline; drives the daily-feed &
  harvest engines. This alone yields a usable dataset.
- **OPTIONAL (progressive, power users / agronomists):** full chemistry, plankton,
  microbiology, clinical-signs checklist, individual sample weights, PL stress test.
  Surfaced via "Add more parameters" expanders (the app already does this).
- **AUTO-CAPTURED (zero farmer effort — the multiplier):** moon phase, weather
  (API later), derived KPIs, sensor/IoT feeds, photo-AI estimates, regional context,
  power runtime. Maximizes datapoints per crop without adding taps.

Incentivize optional data: tie **prediction accuracy / better advisories** to
completeness ("log clinical signs → sharper disease warnings"), and surface the
`data_completeness_score` as a gentle nudge.

---

## 8. Data governance (so the dataset stays trainable)

- **Versioned data dictionary / feature catalog:** every field has id, unit, range,
  enum, source, version. Schema changes are migrations, not silent renames.
- **Stable enums:** disease names, water colors, feed grades as coded IDs (not free
  text) so they're model-ready and translation-independent (#10 vernacular).
- **Raw immutability:** keep original readings; edits append, never overwrite.
- **Consent & privacy:** explicit opt-in for pooling data into training / the
  regional map (feature §9); anonymize farm identity; comply with Indian DPDP Act.
- **De-dup & idempotency:** offline-sync (#10) must not create duplicate rows.

---

## 9. Action list (what to add to the build)

1. Add **clinical-signs checklist**, **individual sample weights (CV)**, **H₂S +
   sediment**, **quantitative weather**, **water-exchange events**, **daily
   mortality baseline**, **feed metadata** to the respective log forms.
2. Add **PL-quality** + **pond-history** + **biosecurity-infra** fields to
   stocking/farm setup.
3. Wrap all measurements in the **Measurement metadata envelope** (§3).
4. Create the frozen **CropOutcome** label record + `data_completeness_score` (§5).
5. Structure **image capture with labels** (§6).
6. Implement the **tiered collection** UX (§7) and **versioned data dictionary** (§8).
```
Unit tests / checks:
  - null vs zero preserved end-to-end (is_missing_reason)
  - every measurement has unit + timestamp + source on write
  - CropOutcome frozen & immutable at harvest close
  - enums are coded ids, not free text
  - offline sync idempotent (no dup measurements)
```
