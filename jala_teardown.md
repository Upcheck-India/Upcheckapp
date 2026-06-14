# JALA Shrimp-Farming App — Backend Feature Teardown & Build Spec

Reverse-engineered from the "Jala features.pdf" screen capture (53 screens).
Goal: implementable spec — data models, validation, and the scientific formulas
behind each feature. Currency in source is IDR (Rp). Species: *Penaeus vannamei*
(whiteleg) and *P. monodon* (black tiger).

The whole app rests on one hard biological constraint: **you cannot directly count
live shrimp in a pond.** Almost every "smart" number (population, survival rate,
biomass, FCR) is therefore *back-calculated* from things you CAN measure — feed
consumption, feeding-tray residue, and periodic body-weight sampling. Keep that in
mind; it explains every formula below.

---

## 0. Core entity model

```
Farm 1───* Pond 1───* Cycle 1───* (all the daily log tables below)

Pond:   name, type{square|circle}, length_m, width_m, depth_m, area_m2 (derived), rfid?
Cycle:  pond_id, total_seed (tails), seed_type{net|gross|actual},
        stocking_date, initial_age_days?, preparation_days?, total_feeding_trays,
        hatchery, species, broodstock, feed_price,
        carrying_capacity_kg_m2, target_cultivation_days, target_size,
        target_sr_pct, sr_prediction_method, notes
```

Daily log tables (all keyed by cycle_id + datetime): WaterQuality, Chemical,
Plankton, Microbiology, Feed, FeedingTray, Sampling, Treatment, Mortality,
Disease, Harvest.

---

## 1. Pond geometry → area & volume

**Inputs:** type, length, width, depth (all metres).

```
Square/Rect:  area = length × width
Circle:       area = π × (diameter/2)²          # "length" reused as diameter
Volume (m³)   = area × depth
Volume (L)    = area × depth × 1000
```

Screen confirms: 50 m × 100 m → 5,000 m². Area feeds stocking-density, dosing,
and the simulation. Note the in-app warning: changing area only affects *future*
cycles' estimates, never closed cycles — i.e. area is snapshotted onto each cycle.

**Stocking density** (used everywhere downstream):
```
density (PL/m²) = total_seed / area
```

---

## 2. Cycle creation — seed types & targets

### Seed type semantics (affects which population number is "truth")
- **Net** — number of larvae actually ordered.
- **Gross** — as per hatchery shipment (includes the hatchery's overcount buffer).
- **Actual** — back-calculated from in-pond estimation (the app's own number).

### Target block (drives estimation precision)
| Field | Meaning | Example |
|---|---|---|
| Carrying Capacity | max sustainable standing biomass | 1.25 kg/m² |
| Target Cultivation Time | planned DoC at harvest | 120 d |
| Target Size | pieces/kg or g at harvest | 55 |
| Target SR % | expected survival | 75 % |
| SR Prediction Method | how live population is inferred | see §3 |

`DoC` (Day of Cycle) = `today − stocking_date + initial_age` (shown as "DoC 10",
"DoC 100" etc.).

---

## 3. SR (Survival Rate) prediction methods — the heart of the app

Because you can't count shrimp, the app offers 6 strategies to infer live
population `N(t)` and hence `SR = N(t)/N₀`:

1. **Feed Ratio (FR)** — infer biomass from feed given ÷ assumed FR, then
   population from biomass ÷ ABW. (See Cultivation-Performance calc, §11.1.)
2. **Feed Ratio + Feeding Tray + Mortality** — same, corrected by tray residue
   (over/under-feeding signal) and logged mortalities.
3. **Fixed** — assume a constant daily survival; pure exponential decay curve.
4. **By Measurements** — use sampling/biomass measurements directly.
5. **STP FR Table** — standard (vendor) feeding-rate-vs-size lookup table.
6. **Custom FR Table** — farmer's own FR-vs-size table.

All of them ultimately resolve to: estimate biomass → divide by ABW → population →
SR. The methods differ only in *how FR and biomass are obtained*.

---

## 4. Water Quality logging + validation ranges

Captured per measurement (date + hour):

| Field | Unit | Hard max (validation) | Healthy target (vannamei) |
|---|---|---|---|
| pH | – | ≤ 14 | 7.5–8.5, diurnal swing < 0.5 |
| Salinity | ppt | ≤ 42 | 15–25 (tolerates 0.5–45) |
| Temperature | °C | ≤ 100 | 28–32 |
| DO | mg/L | ≤ 20 | > 4, ideally 5–7 |
| Transparency | cm | ≤ 1000 | 30–40 (Secchi) |
| ORP | mV | ≤ 10000 | +200 to +300 |
| DO Percent | % | ≤ 200 | 80–100 % sat |
| Electrical Conductivity | µS | ≤ 100000 | tracks salinity |
| Turbidity | NTU | – | |
| Water Height | cm | ≤ 1000 | |
| Water Color | enum | 15 swatches | green/brown = healthy bloom |
| Weather | enum | 7 states | |

The red inline errors in the PDF ("pH should be ≤ 14", "Salinity ≤ 42", "Temp ≤
100", "DO ≤ 20", "Transparency ≤ 1000", "ORP ≤ 10000", "DO% ≤ 200", "EC ≤
100000", "Water Height ≤ 1000") are exactly the upper validation bounds — bake
these in as field constraints.

**Derived alerts you should compute** (not shown but standard):
- DO % saturation from DO mg/L, T, salinity (Benson–Krause / Weiss solubility).
- Diurnal DO swing and pH swing (min/max over 24 h) → bloom-crash early warning.

---

## 5. Chemistry & nutrients (Add Chemical Data)

Logged (ppm): NH₃, NO₂, Alkalinity, NO₃, Hardness, Ca, Mg, CO₃, HCO₃, TOM,
NH₄, PO₄, Total Ammonia, K.

Backend should derive:
- **TAN** = NH₃ + NH₄ (total ammonia nitrogen) → feeds Free-Ammonia calc (§11.4).
- **Free (un-ionized) NH₃** from TAN, pH, T (§11.4) — the actually toxic fraction.
- **Mg:Ca ratio** and **K:Mg** — critical in low-salinity vannamei culture
  (target Ca:Mg ≈ 1:3, Na:K ≈ 28:1).
- **Alkalinity/hardness balance** for pH buffering.

---

## 6. Plankton & Microbiology counts

**Plankton (cell/mL):** Green Algae, Blue-Green Algae (BGA), Dinoflagellata,
Diatom, Protozoa, Floc, Golden Brown, Euglenophyta, Zoo, Haptyophyta, Golden
Green, Yellow Green, Other. **Total Plankton = Σ all** (auto-summed field).

Derived health signal: **diatom : dinoflagellate/BGA ratio** — high diatom good,
high BGA/dino = toxic-bloom risk.

**Microbiology (CFU/mL):** Yellow Vibrio, Green Vibrio, Black Vibrio, Luminance
(luminous vibrio). **Total Vibrio = Σ vibrios**; plus Total Bacteria.

Derived: **Vibrio : Total-Bacteria ratio** — green-colony dominance good,
yellow/luminous dominance = pathogenic-vibrio alarm (AHPND/luminescent disease).

---

## 7. Feed logging & Feeding Tray (anco) method

### Feed record
`feeding_date, time, fasting{Y/N}, feed_product, stock, total_feed_kg, notes`
→ maintains **cumulative feed** per cycle (the "Cumulative" column).

### Feeding Tray (anco) — feed-adjustment control loop
Per tray (1..N), 30 min–2 h after feeding, residue is scored:
```
Empty     : < 10 % left
Few Left  : 10–50 % left
A Lot Left: > 50 % left
```
**Backend adjustment rule** (standard anco logic — implement as the next-feed
multiplier):
```
all Empty            → increase next ration  (+5 to +10 %)   # shrimp under-fed
mostly Few Left      → hold ration
any A Lot Left       → decrease next ration  (−10 to −30 %)  # over-fed / stress
```
This is also a key input to SR-prediction method #2: persistent residue ⇒ lower
live biomass than the FR model assumes ⇒ revise population/SR down.

---

## 8. Sampling → growth metrics (MBW/ABW)

`sampling_date, MBW_g, photo(AI weight via "Photo Sampling"), attachments, notes`

**MBW** (Mean Body Weight) = ABW (Average Body Weight). The two consecutive
samplings give the growth rate everything else needs:

```
ADG (Average Daily Gain, g/day) = (MBW_t − MBW_{t-Δ}) / Δdays
Weekly Growth (g/week)          = ADG × 7
SGR (Specific Growth Rate, %/d) = (ln MBW_t − ln MBW_{t-Δ}) / Δ × 100
Size (pieces/kg)                = 1000 / MBW_g
```

The "Photo Sampling (Plus)" feature is CV-based weight estimation from an image —
out of scope for v1; expose a manual MBW field and treat the photo path as an
optional ML service.

---

## 9. Mortality, Treatment, Disease, Harvest

### Mortality
Two modes:
- **Quantity (pcs):** `total_weight_kg`, `total_quantity(est)`, **Multiplier**
  (predicts unseen/uncollected dead shrimp).
  ```
  dead_count = total_quantity_est × multiplier      # e.g. ×1.5
  ```
- **Count:** count tails directly.
Each mortality event decrements the running live-population estimate `N(t)`.

### Treatment
`date, based_on{written_notes | product_usage}, treatment_text, notes`. If
product-usage, link to Product-Amount dosing calc (§11.3).

### Disease
`date, disease_name(enum), photos, notes` + a built-in **Shrimp Disease
Information** reference library: AHPND/EMS, Black Gill, Black Spot, CMD/CMNV,
EHP, IHHNV, IMNV/Myo, TSV, WFD, WSSV, Yellow Head. (Static reference content;
ship as seed data.)

### Harvest
`date, harvest_type{partial|total|emergency}, total_weight_kg, count(tail/kg),
price_per_kg, buyer, notes`
```
Total Price        = total_weight_kg × price_per_kg
Size (pieces/kg)   = count
ABW at harvest (g) = 1000 / count
```
Partial harvests remove biomass+population from the live cohort and feed the
simulation's partial-harvest schedule (§12).

---

## 10. Derived KPIs you must maintain per cycle (running)

```
DoC                = today − stocking_date + initial_age
Biomass (kg)       = N(t) × ABW(g) / 1000
Density            = N(t) / area            (pcs/m²)
Standing biomass   = Biomass / area         (kg/m²)  ← compare to carrying capacity
ADG                = ΔABW / Δdays
FCR                = cumulative_feed_kg / biomass_gain_kg
SR %               = N(t) / N₀ × 100
Feeding Rate (FR%) = daily_feed_kg / Biomass_kg × 100
Projected harvest  = simulation (§12)
Est. revenue       = projected_biomass × shrimp_price
Est. cost          = cumulative_feed × feed_price (+ other)
```

---

## 11. FARM CALCULATOR — the four explicit formulas (verbatim from app)

### 11.1 Cultivation Performance
Inputs: Feed/Day (kg), ABW (g), FR (%), Cumulative Feed (kg), Initial Stocking (PL).
```
Biomass (kg)    = Daily Feed (kg) ÷ FR (%)                 # FR as fraction, i.e. /(FR/100)
Population (PL) = Biomass (kg) ÷ ABW (g)                   # with kg→g ×1000 internally
FCR             = Cumulative Feed (kg) ÷ Biomass (kg)
Survival Rate   = Population ÷ Initial Stocking × 100
```
⚠ **Unit handling to replicate exactly:** "Biomass ÷ ABW" only yields a real
count if biomass is converted to grams first. Worked example:
Daily Feed 60 kg, FR 2 % → Biomass = 60 / 0.02 = **3,000 kg**.
Population = 3,000 kg × 1000 / 25 g = **120,000 shrimp**. SR vs 1,000,000 stocked
= 12 %. Implement Population = `Biomass_kg × 1000 / ABW_g`.

This calculator IS the FR-based SR-prediction engine (§3 method 1) exposed
standalone.

### 11.2 Daily Feed
Inputs: Initial Stocking (PL), ABW (g), FR (%), SR (%).
```
Live population   = Initial Stocking × SR/100
Biomass (kg)      = Live population × ABW(g) / 1000
Feed per Day (kg) = Biomass (kg) × FR/100
```
i.e. `Feed/Day = InitStock × (SR/100) × ABW × (FR/100) / 1000`.

### 11.3 Product Amount (dosing disinfectant / probiotic / etc.)
Two product types (Solid/Powder vs Liquid). Formula shown for solid:
```
Amount (kg) = (Pond Area [m²] × Water Level [m] × Dosage [ppm]) / 1000
```
Derivation: Volume(m³) = Area × Level; ppm = g/m³; so grams = Area·Level·Dosage;
÷1000 → kg. For **liquid** products the same volume × ppm applies, output in L
(density ≈ 1). Always compute pond volume first, then mass/volume = volume × dose.

### 11.4 Free Ammonia (NH₃) — toxic fraction
```
NH₃ (mg/L) = TAN × 1 / (1 + 10^(pKa − pH))
```
- **TAN** (mg/L) = total ammonia N (NH₃ + NH₄⁺), from test kit / §5.
- **pKa** = ammonia ionization constant — **temperature dependent**. Use Emerson
  et al. (1975):
  ```
  pKa = 0.09018 + 2729.92 / (T_°C + 273.15)
  ```
  (The app exposes Temperature + pH + TAN inputs, confirming pKa is computed from
  T, not a constant.)
- Output also a **Toxicity Level** band. Suggested thresholds for vannamei
  (un-ionized NH₃-N): `<0.1 safe · 0.1–0.3 caution · >0.3 toxic`.

Optional refinement: add salinity correction (Bower & Bidwell 1978) if you log
salinity — JALA's simple version omits it.

---

## 12. SIMULATION ENGINE — day-by-day growth/feed/harvest model

This is the most valuable and the only undocumented piece (no formula shown), so
here is the model reconstructed from the data tables (Feed/Biomass/Harvest tabs).

### 12.1 Inputs
```
farm_area_m2, stocking_date, total_stocking N₀,
cultivation_period D (days), max_biomass_kg_m2 (carrying capacity),
target_sr_pct, size_at_100d (pieces/kg), feed_price, shrimp_price,
partial_harvest_plan: [(age, pct_of_population), ...]   # e.g. (69,41%),(95,20%),(120,39%)
```

### 12.2 Growth curve (MBW vs age) — anchored on "size at 100 days"
The single calibration anchor is **Size at 100 Days**:
```
MBW(100) = 1000 / size_at_100d        # 45 pcs/kg → 22.2 g at day 100
```
Fit a monotonic growth curve through (0, ~PL weight ≈ 0.001–0.01 g) and
(100, MBW(100)), continuing to D. The table data (MBW 24.94 g @ d107 …) is
consistent with near-linear late-stage ADG ≈ **0.40 g/day** that slowly
decelerates. Practical model — daily ADG declining with size:
```
ADG(t) = a − b·MBW(t-1)           # linear-plateau; calibrate a,b so MBW(100)=anchor
MBW(t) = MBW(t-1) + ADG(t)
```
(A Gompertz / von Bertalanffy curve fits even better; linear-plateau matches the
~0.40 g/d shown and is simplest to ship.)

### 12.3 Feeding Rate table (FR vs body weight) — declines as shrimp grow
FR is a lookup/curve on MBW (verified in table: bigger shrimp → lower FR%):
```
MBW ~25 g → FR ≈ 2.17 %     MBW ~28 g → FR ≈ 2.05 %
```
Early PL stages run much higher FR (8–10 %). Use the **STP FR table** (standard)
or farmer's **Custom FR table** as the source curve `FR(MBW)`.

### 12.4 Survival curve
Distribute mortality from 100 % to `target_sr` across D days. Either:
```
Fixed daily survival s:  s = (target_sr)^(1/D);  N(t) = N(t-1) · s
```
or a front-loaded curve (higher early mortality). The Biomass-Alive table shows
population (in thousands) declining 38.23 → 32.89 k over d110–120, i.e. a smooth
daily decay consistent with fixed-rate survival.

### 12.5 Daily loop
```
N[0] = N₀;  MBW[0] = PL weight
for t in 1..D:
    MBW[t] = MBW[t-1] + ADG(MBW[t-1])
    N[t]   = N[t-1] × daily_survival
    # carrying-capacity / planned partial harvest:
    if t in partial_harvest_plan or biomass/area > max_biomass:
        removed = N[t] × pct
        N[t]   -= removed
        record_harvest(date=stock+t, count=1000/MBW[t], biomass=removed×MBW[t]/1000)
    biomass[t] = N[t] × MBW[t] / 1000            # kg, "Total Biomass Alive"
    FR[t]      = FR_table(MBW[t])                 # %
    feed[t]    = biomass[t] × FR[t]/100           # kg/day
    cum_feed  += feed[t]
```

### 12.6 Outputs (match the three result tabs)
```
Feed tab:    per-age (Feed kg, FR, MBW);  Total Feed = Σfeed;
             Total Feed Price = Total Feed × feed_price;
             FCR = Total Feed / total_harvested_biomass
Biomass tab: per-age (population_thousands, Total Biomass Alive kg)
Harvest tab: per partial/total harvest (date, count pcs/kg, biomass kg,
             Total Price = biomass × shrimp_price)
```
**Validation against the PDF's own numbers:** Total Feed 2,556.73 kg, FCR 1.227,
final standing biomass 2,084 kg, harvests at d69/d95/d120 (41/20/39 %) producing
492 / 407 / 1,185 kg. A correct re-implementation should reproduce these from the
Basic-Data inputs (N₀=100,000; area 1,000 m²; D=120; max biomass 1.2 kg/m²;
target SR 100 %; size@100d = 45; feed Rp15,000/kg; shrimp Rp50,000/kg).

### 12.7 Economics
```
Revenue   = Σ harvest_biomass × shrimp_price (location price list or self-priced)
Feed cost = Total Feed × feed_price
Profit    = Revenue − Feed cost − other costs
Productivity (ton/ha) = total_harvest_biomass / area × 10
```

---

## 13. Build checklist / priority

1. **Entities + pond geometry + cycle** (§0–2) — foundation.
2. **Daily log tables + validation bounds** (§4–9) — data capture.
3. **Running KPIs** (§10) — derived from logs.
4. **Farm Calculator** (§11) — 4 pure functions, fully specified, ship first
   (high value, low effort, exact formulas known).
5. **Simulation engine** (§12) — the differentiator; needs the growth-curve and
   FR-table calibration; validate against the PDF's reference run.
6. **Disease library + ML photo-weight** — static content + optional ML service,
   last.

### Reference formulas to unit-test
- Population = Biomass_kg × 1000 / ABW_g
- NH₃ = TAN / (1 + 10^(pKa − pH)), pKa = 0.09018 + 2729.92/(T+273.15)
- Product dose kg = Area × Level × ppm / 1000
- FCR = cumulative_feed / biomass_gain
- SR = N/N₀ × 100
