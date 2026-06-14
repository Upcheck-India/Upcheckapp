# Lunar-Cycle Molt Management Module — Build Spec

Companion to `jala_teardown.md` + `jala_teardown_india.md`. Adds a moon-phase-aware
molt-risk scheduler that issues **pond-specific** action steps. The lunar signal is
generic; the *actions are personalized* by each pond's latest collected data (DO,
minerals, temperature, ABW, tray residue, vibrio, density).

---

## 1. The science (why this is real, and where to be careful)

**Solid, physiological — drives the whole module:**
- Penaeid shrimp (vannamei/monodon) molt on a **semi-lunar rhythm**: molting peaks
  around **new moon and full moon** (spring tides), troughs at the quarters (neap
  tides). So there are ~2 molt surges per lunar month.
- **Molt = maximum vulnerability:** the shrimp sheds its exoskeleton, sits soft for
  hours, **stops feeding**, has elevated O₂ demand, and must **recalcify the new
  shell** — a sharp demand for **Ca, Mg, K, and carbonate/bicarbonate alkalinity.**
- In **low-salinity / inland** ponds (the Indian belt) those minerals are already
  scarce → molt windows are exactly when **soft-shell / molt-death / Loose-Shell
  Syndrome** strike. This is the strongest integration point with the mineral
  module (`india §5`).
- Larger shrimp lock more tightly to the lunar cycle; small shrimp molt every few
  days and are less lunar-synchronized (see molt-frequency table §3).

**Precautionary (treat as elevated-risk flags, not certainties):**
- **WSSV and general disease outbreaks** cluster around molt windows — molt stress
  + DO swings open a susceptibility window. Present as a *heightened-biosecurity*
  advisory, not a guarantee.
- **Coastal tidal ponds:** spring tides (new/full) bring the largest water exchange
  → bigger salinity/turbidity swings; relevant only for tide-fed farms.

**Honesty rule for the UI:** label molt-timing as a *prediction* the app refines
from the pond's own observations (§7). Don't overstate the disease link.

---

## 2. Moon-phase computation (deterministic — no external API)

Compute from the measurement date + farm location (location only affects local
date/tide, not phase). Pure astronomy:

```
SYNODIC = 29.530588853            # mean synodic month (days)
REF_NEW_MOON_JD = 2451550.26      # 2000-01-06 18:14 UTC, a known new moon

JD          = julian_day(date_utc)
phase       = frac((JD - REF_NEW_MOON_JD) / SYNODIC)     # 0=new … 0.5=full … →1=new
age_days    = phase × SYNODIC
illumination= (1 - cos(2π × phase)) / 2                   # 0=new(0%) … 1=full(100%)

name = bucket(phase): New | Waxing Crescent | First Quarter | Waxing Gibbous |
                      Full | Waning Gibbous | Last Quarter | Waning Crescent
days_to_next_new  = ((1   - phase) mod 1) × SYNODIC
days_to_next_full = ((0.5 - phase) mod 1) × SYNODIC
```

**Semi-lunar molt likelihood (the key derived signal):** peaks at BOTH new and full,
zero at quarters — period = half the synodic month:
```
MoltLikelihood = (cos(4π × phase) + 1) / 2        # 0..1, =1 at new & full, =0 at quarters
days_to_spring_tide = min(|signed_days_to_new|, |signed_days_to_full|)
```
A **molt window** = `days_to_spring_tide ≤ 2` (i.e. within ±2 days of new or full).
Make the ±window width a per-farm tunable (default 2 d) that §7 calibration adjusts.

---

## 3. Molt frequency by size — how lunar-locked is THIS pond right now?

Intermolt period grows with body weight. Use latest sampling ABW:

| ABW (g) | Intermolt period | Lunar synchronization |
|---|---|---|
| < 3 (PL/early) | 3–5 days | weak — molts several times/cycle |
| 3–10 | 6–9 days | moderate |
| 10–20 | 9–12 days | strong — ~1 molt per spring tide |
| > 20 | 12–16 days | strongest — tightly lunar-locked |

```
LunarLockFactor = clamp( (ABW_g - 3) / 17 , 0.2, 1.0 )   # 0.2 small … 1.0 large
```
Used to weight the lunar signal: the bigger the shrimp, the more the lunar window
dominates the advisory.

---

## 4. The personalization engine — pond data → molt-risk score

Pull each pond's **latest** logged values (with staleness check; flag if > 48 h old)
and combine with the lunar signal into a **Molt Risk Score (0–100)**.

### Vulnerability factors (each 0–1, higher = more vulnerable)
```
v_DO       = DO < 3 ?1 : DO < 4 ?0.7 : DO < 5 ?0.4 : 0.1        # mg/L, latest
v_mineral  = max over {Ca,Mg,K,alk}: deficit_vs_target / target  (0 if all met)
v_temp     = T > 33 ?0.8 : T > 31 ?0.5 : T < 26 ?0.4 : 0.1       # °C
v_ammonia  = freeNH3 > 0.3 ?1 : >0.1 ?0.5 : 0.1                  # mg/L (base §11.4)
v_pH       = pH_swing > 0.5 ?0.6 : 0.2
v_disease  = luminous/yellow-vibrio high OR WSSV-season ?0.8 : 0.2
v_density  = density / carrying_capacity_density   (crowding → O₂ competition)
v_appetite = tray "A Lot Left" ?0.6 : "Few Left" ?0.3 : 0.1     # already molting/off-feed
```

### Composite score
```
MoltPressure   = MoltLikelihood × LunarLockFactor               # 0..1, "is a molt due?"
Vulnerability  = weighted_mean(v_DO, v_mineral, v_temp, v_ammonia,
                               v_pH, v_disease, v_density, v_appetite)
                 # suggested weights: DO .22, mineral .22, disease .15, temp .12,
                 #                    ammonia .10, density .08, appetite .06, pH .05

MoltRiskScore  = 100 × MoltPressure × (0.4 + 0.6 × Vulnerability)
Band: 0–30 Low (green) · 30–60 Watch (amber) · 60–100 Critical (red)
```
The `0.4 + 0.6×Vuln` floor means an imminent molt always registers some risk even on
a perfectly managed pond, but a stressed pond (low DO, mineral-deficient) escalates
hard. Score is recomputed whenever new data is logged or the date rolls over.

---

## 5. Action playbook — phase × data (the "steps to take")

Three phases relative to the nearest spring tide; each has **baseline steps** plus
**data-driven escalations** with real numbers (reuse the mineral & dosing calcs).

### A) PRE-MOLT — `days_to_spring_tide` 3→1 (build reserves)
Baseline:
- Raise **alkalinity ≥ 120 ppm** and **hardness** toward target (shell carbonate).
- Top up **Ca, Mg, K** to molt targets *before* demand spikes.
- Add probiotic / immunostimulant; avoid introducing stressors.

Data-driven escalations:
```
if v_mineral > 0:  → "Dose <salt> <X> kg now" using mineral calc (india §5):
       dose_kg = deficit_ppm × pond_volume_m³ / 1000 / purity_fraction
       (MOP for K, dolomite/Epsom for Mg, gypsum/lime for Ca+hardness+alk)
if alk < 100 ppm:  → "Apply agricultural lime/dolomite to reach ≥120 ppm before molt"
if DO trend ↓ or density high: → "Service/添加 aerators; target night DO ≥ 4 mg/L"
```

### B) MOLT PEAK — `days_to_spring_tide` ≤ 1 (protect)
Baseline:
- **Reduce feed 15–30 %** (shrimp are off-feed; uneaten feed fouls water & burns O₂).
- **Maximize aeration**, especially **02:00–06:00** (pre-dawn DO minimum).
- **No handling:** suspend **sampling, netting, partial harvest, chemical/disinfectant
  treatments** — soft shrimp die from stress and are cannibalized.
- Hold mineral & alkalinity levels for hardening.

Data-driven escalations:
```
if DO < 4:        → CRITICAL "Run ALL aerators continuously; emergency O₂/peroxide on standby"
if tray=A Lot Left:→ "Cut feed 30% — molt confirmed by residue"
if v_disease high OR WSSV-season+full moon:
                  → "Lockdown biosecurity: no water exchange, no new inputs, disinfect gear"
if low-salinity & v_mineral>0: → "Soft-shell risk HIGH — immediate K/Mg/Ca top-up <X kg>"
if T > 33:        → "Heat + molt: deepen water, extra night aeration"
```

### C) POST-MOLT — 1→3 days after spring tide (recover & grow)
Baseline:
- **Restore feed and add +5–10 % (compensatory growth window)** — fastest growth is
  right after molt; ride it.
- Watch for **soft-shell / Loose-Shell Syndrome** and cannibalism; sample now if a
  weight check is due (safe window).
- Confirm mineral levels held; log any observed molt-death for §7 calibration.

Every generated step carries: pond id, phase, the data that triggered it, the
computed number (dose kg / feed %), and a done-checkbox for audit.

---

## 6. Data model & surfaces

```
LunarAdvisory (generated, per pond per day or per window):
  pond_id, crop_id, date, moon_phase_name, illumination_pct, age_days,
  molt_likelihood, days_to_spring_tide, lunar_lock_factor,
  molt_risk_score, band, phase{pre|peak|post},
  triggers: [ {factor, value, threshold} ],
  steps:    [ {category, text, computed_value, status} ]

MoltObservation (farmer/feedback, feeds calibration):
  pond_id, date, soft_shell_seen{Y/N}, molt_intensity{none|light|heavy},
  molt_death_count, source{tray|visual|sampling}
```

UI surfaces:
- **Lunar calendar** per pond/farm: month grid with new/full marked, molt windows
  shaded, risk band per day.
- **Today card** on the pond dashboard: phase icon, risk band, top 3 steps.
- **Push notifications:** fire at pre-molt T-3 and at peak T-0, e.g.
  *"A1 — Full-moon molt peak in 2 days. DO 3.8 (marginal), K 22 ppm below target.
  Steps: dose 6 kg MOP today; service aerators; cut feed 20% Fri–Sat."*
- Hook into the **crop calendar** (`india §9`): overlay molt windows on the season;
  flag full-moon-in-WSSV-season as compound risk.

---

## 7. Adaptive calibration (make it pond-specific over time)

The generic semi-lunar curve is a starting prior. Refine per pond from observations:
```
- Log MoltObservation (soft-shell seen, tray spikes, molt-death) with its date.
- Fit observed molt events vs lunar phase → estimate this pond/region/season's
  phase offset and window width; update the per-farm window (default ±2 d).
- Correlate ABW-at-event with intermolt period → refine LunarLockFactor curve.
- Over a few crops the advisory shifts from generic prior → farm-tuned schedule.
```
This is what makes it "tailored based on the pond data we collect" rather than a
static moon calendar.

---

## 8. Integration & build notes

Reuses, no new science:
- Pond **volume** (base §1) for all dosing.
- **Mineral dose** kg = deficit_ppm × volume_m³ / 1000 / purity (india §5).
- **Free NH₃** & DO thresholds (base §4, §11.4).
- **Feeding-tray** residue (base §7) as molt confirmation + feed-cut trigger.
- **Sampling ABW** (base §8) for molt frequency / lunar-lock.
- **Vibrio / disease** (base §6, india §6) for the biosecurity escalation.

Build priority: ship after the mineral module (it depends on it). Start with the
moon-phase calc + calendar (pure, testable), then the risk engine, then adaptive
calibration last.

### Unit tests
```
- phase(known new/full moon dates) → illumination ≈ 0 / ≈ 1
- MoltLikelihood = 1 at new & full, ≈ 0 at quarters
- days_to_spring_tide correct sign/magnitude across a synodic month
- LunarLockFactor: 2 g→0.2, 20 g→1.0
- MoltRiskScore monotonic ↑ as DO↓, mineral-deficit↑, near molt window
- mineral dose kg matches india §5 for a given deficit & volume
- advisory phase transitions pre→peak→post across the window
```
```
