# Indianized Shrimp-Farming App — Build Spec (JALA → India adaptation)

Companion to `jala_teardown.md`. The **science is unchanged** (growth model, NH₃,
dosing, FCR, SR back-calculation — all universal biology). This document overrides
only the *India-specific* layers: units, currency, regulation, reference data,
disease profile, water chemistry for inland low-salinity culture, and economics.

Context: India is the world's largest shrimp **exporter**; ~95 % of cultured
shrimp is *Penaeus vannamei* (whiteleg). Production is dominated by **Andhra
Pradesh** (~65–70 %), then Tamil Nadu, Gujarat, Odisha, West Bengal. A huge and
growing share is **inland, low-salinity** vannamei (Andhra "freshwater" belts) —
this is the single biggest divergence from the Indonesian model.

---

## 1. Units, money, and how Indian farmers actually count

| Concept | Indonesia (JALA) | India (use this) |
|---|---|---|
| Currency | IDR (Rp) | **INR (₹)** |
| Area | m² | **acre / cent / hectare** (store m² internally) |
| Stocking | "tails" | **lakh** PL (1 lakh = 100,000) |
| Harvest size | g or pcs/kg | **count** (pieces/kg) — universal Indian unit |
| Feed packaging | kg | **25 kg bags** + kg |
| Crop | "cycle" | **crop** (farmers run 1–2 crops/yr) |

**Conversions to hard-code:**
```
1 acre     = 4046.86 m²   (≈ 4047)
1 cent     = 40.4686 m²   (1/100 acre)
1 hectare  = 10,000 m²
1 lakh     = 100,000
1 crore    = 10,000,000
Size (count) = 1000 / ABW_g          # "count 30" = 30 pcs/kg = 33.3 g
```
UI must accept area in **acres/cents** and stocking in **lakhs**, convert to
m²/PL for all formulas, and display sizes as **count**, not grams. Indian farmers
say "I stocked 4 lakh in 1 acre, harvesting at count 40."

**Density norms (India):**
```
Extensive / traditional      :  5–15  PL/m²
Semi-intensive (most common) : 25–40  PL/m²   (≈ 1–1.6 lakh/acre)
Intensive (lined, aerated)   : 40–80  PL/m²   (≈ 1.6–3.2 lakh/acre)
```

---

## 2. NEW: Regulatory & compliance layer (mandatory in India)

This does not exist in JALA but is **legally required** for Indian farms and for
export traceability. Add to the **Farm** and **Crop** entities:

```
Farm:
  caa_registration_no        # Coastal Aquaculture Authority (CAA Act) — mandatory
  caa_valid_till
  mpeda_registration_no      # Marine Products Export Development Authority
  survey_no / land_record    # village, mandal/taluk, district, state
  water_source {creek|estuary|borewell|canal|reservoir}
  farm_type {coastal_brackish | inland_low_saline}

Crop:
  pre_stocking_pcr_done {Y/N}     # WSSV/EHP/IHHNV PCR on seed — best practice/required
  pcr_lab, pcr_report_id
  seed_certificate                # hatchery SPF/PCR cert
  antibiotic_free_declaration     # for export — see below
```

**Antibiotic / banned-substance compliance** (export-critical — EU/US/Japan reject
consignments on residue):
- Maintain a **banned-substance lock-list**: nitrofurans (AOZ, AMOZ, SEM, AHD),
  chloramphenicol, nitroimidazoles, fluoroquinolones, etc.
- In the **Treatment** log (§9 base doc), if `based_on = product_usage`, validate
  the product against the banned list and the **Pre-Harvest Interval (PHI/withdrawal
  period)** before any logged harvest. Block/flag harvests inside withdrawal.
- Surface a **"export-eligible"** badge per crop driven by: PCR done, no banned
  inputs, withdrawal periods cleared, traceability complete.

Reference bodies to cite in-app help: **CAA, MPEDA, CIBA** (ICAR, Chennai),
**NaCSA** (farmer societies), **RGCA**, **EIA/EIC** (residue monitoring).

---

## 3. Species, broodstock & hatcheries — Indian reference data

**Species enum:** `Penaeus vannamei` (default), `Penaeus monodon` (black tiger,
premium/traditional), `Macrobrachium rosenbergii` (scampi, freshwater prawn —
optional separate module).

**Broodstock (SPF lines imported into India — seed this list):**
Kona Bay (Speed/Balance/Strength), Shrimp Improvement Systems (SIS), American
Penaeid, Benchmark Genetics, Sea Products Development (SPF), Primo Broodstock,
Hendrix Genetics. (JALA's broodstock list is largely reusable — these lines are
sold globally.)

**Hatcheries (replace JALA's Indonesian list with Indian majors):**
CP Aquaculture (India), Avanti / TUF hatchery, BMR Group, Vaisakhi Bio-Marine,
Devi Sea Foods, Sapthagiri, Coastal Aquaculture (Nellore), Growel, Unibio,
Sea-Pearl, Karthikeya. Store as editable master list (region-tagged: AP/TN/GJ/OD).

---

## 4. Feed — Indian brands & bag logic

Replace JALA's "Beryl / CJ Feed" products with the **Indian feed master**
(grade-staged, 25 kg bags). Seed brands and their grade ladders:

| Brand | Typical grade ladder (starter → grower → finisher) |
|---|---|
| **Avanti** (largest) | Manamei 9001/9002/9003/9004/9005 … |
| **CP India** | CP Turbo / Hi-Pro grades 9101–9105 |
| **Growel** | Growel 01/02/03/04 |
| **The Waterbase (Karam)** | Karam starter/grower/finisher |
| **Godrej Agrovet** | aqua grades |
| **Nexus / Uno (Devi)** | grade-staged |

Feed record additions:
```
feed_product (brand+grade), bag_count, bag_size_kg (default 25),
total_feed_kg = bag_count × bag_size_kg
feed_price_per_bag → feed_price_per_kg = price_per_bag / bag_size_kg
```
Grade auto-suggestion by MBW (starter < 3 g, grower 3–15 g, finisher > 15 g) —
maps onto the `FR(MBW)` curve in §12 of base doc.

---

## 5. Water chemistry — the BIG India change: inland low-salinity minerals

Coastal brackish farms behave like JALA. But India's **inland low-saline** belt
(borewell water 1–5 ppt, "freshwater vannamei") is mineral-deficient and is the
#1 source of soft-shell, molting death, and stunting. The app must add **ionic
balance management** that JALA lacks.

Extend the **Chemical** log and add derived checks:

```
Measured (ppm): Ca, Mg, K, Na, Cl, Total Hardness, Alkalinity (already in base)

Derived ratios & targets (low-salinity vannamei):
  Na:K   target ≈ 28 : 1        # K deficiency → molting mortality
  Mg:Ca  target ≈ 3 : 1         # (seawater ratio); Mg often deficient inland
  Ca:K   monitored
  Min K (ppm)  ≈ salinity(ppt) × ~11   (rule-of-thumb floor)
  Hardness:Alkalinity balance for buffering
```

**Mineral-dose calculator** (NEW, India-specific — extends the Product-Amount calc
§11.3 of base doc). Given current vs target ion concentration:
```
deficit_ppm   = target_ppm − measured_ppm
dose_kg       = deficit_ppm × pond_volume_m³ / 1000 / purity_fraction
                # purity_fraction = elemental content of the salt used
# e.g. Muriate of Potash (MOP, KCl) ≈ 50% K; raise K by X ppm:
#   MOP_kg = (X ppm × volume_m³ / 1000) / 0.50
```
Provide presets for common Indian inputs: **MOP (KCl)** for K, **Magnesium
chloride / Mag sulphate (Epsom)** for Mg, **agricultural lime / gypsum** for Ca &
hardness, **dolomite** for Ca+Mg+alkalinity. Each preset carries its elemental %.

Salinity validation bound: keep ≤ 42 ppt, but inland farms operate **0.5–8 ppt** —
make low-salinity a first-class farm type that *enables the mineral module*.

---

## 6. Disease library — Indianized profile

Keep JALA's global set but **re-rank by Indian prevalence** and add India-prominent
syndromes the Indonesian list omits:

| Disease | India relevance |
|---|---|
| **WSSV** (White Spot) | #1 viral killer in India, esp. winter/temperature crashes |
| **EHP** (*Enterocytozoon hepatopenaei*) | Massive in India — growth retardation, no mortality but ruins count/economics |
| **WFD** (White Feces Disease) | Very common; multifactorial (EHP + vibrio + gregarines) |
| **RMS — Running Mortality Syndrome** | **India-specific**, multifactorial chronic mortality — ADD |
| **LSS — Loose Shell Syndrome** | **India-specific**, nutritional/HP stress — ADD |
| **AHPND/EMS** (vibrio *parahaemolyticus*) | Present, early-cycle |
| **IHHNV / IMNV / Vibriosis / Black Gill** | Reuse from base list |

Add **RMS** and **LSS** to the disease enum + reference content. Tie disease risk
to the data you already log: rising luminous/yellow vibrio (§6 base), white-feces
in feeding trays, EHP-linked size variation in sampling, WSSV risk on temperature
drop + WBC.

---

## 7. Pricing — count-based ₹/kg market feed

Indian shrimp is priced **by count**, not a single ₹/kg. Replace JALA's single
"Shrimp Price / location list" with a **count-price matrix**:

```
PriceFeed:
  date, region {AP-West Godavari | AP-Nellore | TN | Gujarat | Odisha | ...}
  prices: { count_30: ₹, count_40: ₹, count_50: ₹, count_60: ₹,
            count_70: ₹, count_80: ₹, count_100: ₹, count_120: ₹ }
  source {processor | local_agent | self}
```
Bigger shrimp (lower count) = higher ₹/kg. Harvest & simulation revenue must look
up price **by achieved count**:
```
harvest_count   = 1000 / ABW_g
price_per_kg    = PriceFeed.lookup(region, nearest_count_band)
harvest_revenue = biomass_kg × price_per_kg
```
This makes "grow to a bigger count" an explicit economic lever the simulation can
optimize — far more relevant in India than JALA's flat price.

---

## 8. Economics — realistic Indian cost model (INR)

Replace JALA's feed-only cost with the standard Indian cost stack (per crop):

```
Cost components:
  seed     = total_PL × seed_rate         (₹0.30–0.60 / PL typical)
  feed     = cumulative_feed_kg × ₹/kg     (≈ 50–60% of total cost)
  power    = aerator_HP × hours × ₹/unit   (paddlewheel/aerator electricity — major)
  minerals = inland mineral dosing (§5)    (significant for low-saline)
  probiotics/health, labour, lease, misc, harvest & marketing

KPIs (INR):
  Cost of production ₹/kg = total_cost / harvest_biomass_kg
  Profit            = Σ(harvest_biomass × count_price) − total_cost
  Margin %          = profit / revenue × 100
  Productivity      = harvest_biomass / area_ha   (tons/ha; India often 4–10 t/ha)
```
Show **break-even count/price** so farmer sees "at count 40 you break even at
₹X/kg." This is the headline number Indian farmers and bank/insurance want.

---

## 9. Crop calendar & seasonality

Indian farming is seasonal — bake a crop-calendar helper:
```
Crop 1 (main)  : stock Jan–Mar, harvest Apr–Jun   (summer, faster growth)
Crop 2         : stock Jun–Aug, harvest Sep–Nov    (monsoon risk: salinity drop,
                 WSSV on temperature swings)
Winter         : high WSSV risk; many farms idle Dec–Jan
```
Feed the calendar into risk flags (monsoon dilution → salinity/mineral alerts;
winter → WSSV temperature-drop alert).

---

## 10. What stays identical (do NOT re-derive)

All core math from `jala_teardown.md` is universal — reuse verbatim:
- Cultivation Performance (Biomass = Feed/FR; Population = Biomass×1000/ABW; FCR; SR).
- Daily Feed = InitStock × SR × ABW × FR with unit handling.
- Product dose kg = Area × Level × ppm / 1000.
- Free Ammonia: NH₃ = TAN / (1 + 10^(pKa−pH)), pKa = 0.09018 + 2729.92/(T+273.15).
- Day-by-day **simulation engine** (§12 base) — growth curve anchored on size/count
  target, FR(MBW) table, survival decay, partial-harvest schedule.

**Simulation calibration for India:** anchor the growth curve on **target count**
instead of "size at 100 days" (`MBW_target = 1000/target_count`), set realistic
Indian survival (semi-intensive SR commonly 60–80 %, lower with disease pressure),
and use a feed FR ladder from your chosen Indian brand. Validate against a real
Andhra crop record before trusting outputs.

---

## 11. Build-priority delta vs base doc

1. Units/currency/count layer (§1) — touches every screen; do first.
2. Count-based pricing + INR economics (§7–8) — the headline farmer value.
3. Inland low-salinity mineral module (§5) — the true Indian differentiator.
4. Regulatory/compliance + export-eligibility (§2) — needed for traceability/finance.
5. Indianized master data: hatcheries, feed brands, diseases (§3,4,6) — seed data.
6. Everything else identical to base spec.
```
Unit tests to add:
  acres↔m², lakh↔PL, ABW↔count round-trips
  MOP_kg to raise K by N ppm in V m³
  count-band price lookup
  cost-of-production ₹/kg and break-even count
```
