import { Injectable } from '@nestjs/common';

export interface MoonPhase {
  jd: number;
  phase: number; // 0=new … 0.5=full … →1=new
  ageDays: number;
  illumination: number; // 0..1
  name: string;
  moltLikelihood: number; // 0..1, =1 at new & full, =0 at quarters
  daysToSpringTide: number; // unsigned days to nearest new/full
  inMoltWindow: boolean; // within ±windowDays of a spring tide
}

export interface MoltVulnerabilityInput {
  do?: number;
  temp?: number;
  freeNh3?: number;
  phSwing?: number;
  /** Mineral deficit as a fraction of target (0..1), max over Ca/Mg/K/alk. */
  mineralDeficitFrac?: number;
  diseaseHigh?: boolean;
  /** density / carrying-capacity density (0..1+). */
  densityRatio?: number;
  tray?: 'empty' | 'few_left' | 'a_lot_left' | null;
}

export interface MoltRisk {
  moltPressure: number; // 0..1
  vulnerability: number; // 0..1
  score: number; // 0..100
  band: 'Low' | 'Watch' | 'Critical';
  phaseRel: 'pre' | 'peak' | 'post' | 'none';
}

const SYNODIC = 29.530588853;
const REF_NEW_MOON_JD = 2451550.26; // 2000-01-06 18:14 UTC new moon
const MS_PER_DAY = 86400000;
const JD_UNIX_EPOCH = 2440587.5;

const frac = (x: number) => x - Math.floor(x);

/**
 * Lunar-cycle molt management (lunar_module_spec.md). Pure, deterministic — no
 * external API. Moon phase drives a semi-lunar molt-likelihood; the *risk* is
 * personalized by each pond's latest data.
 */
@Injectable()
export class LunarService {
  /** Julian Day from a UTC date. */
  julianDay(date: Date): number {
    return date.getTime() / MS_PER_DAY + JD_UNIX_EPOCH;
  }

  /** Full moon-phase computation for a date (spec §2). */
  moonPhase(date: Date, windowDays = 2): MoonPhase {
    const jd = this.julianDay(date);
    const phase = frac((jd - REF_NEW_MOON_JD) / SYNODIC);
    const ageDays = phase * SYNODIC;
    const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;
    const moltLikelihood = (Math.cos(4 * Math.PI * phase) + 1) / 2;
    // Distance (in phase) to the nearest spring tide at phase 0, 0.5 or 1.
    const distPhase = Math.min(phase, Math.abs(phase - 0.5), 1 - phase);
    const daysToSpringTide = distPhase * SYNODIC;
    return {
      jd,
      phase,
      ageDays,
      illumination,
      name: this.phaseName(phase),
      moltLikelihood,
      daysToSpringTide,
      inMoltWindow: daysToSpringTide <= windowDays,
    };
  }

  private phaseName(phase: number): string {
    const names = [
      'New',
      'Waxing Crescent',
      'First Quarter',
      'Waxing Gibbous',
      'Full',
      'Waning Gibbous',
      'Last Quarter',
      'Waning Crescent',
    ];
    // 8 buckets centered on the 8 principal phases.
    const idx = Math.round(phase * 8) % 8;
    return names[idx];
  }

  /**
   * How lunar-locked this pond is right now, from latest ABW (spec §3):
   * clamp((ABW − 3) / 17, 0.2, 1.0). Bigger shrimp → tighter lunar lock.
   */
  lunarLockFactor(abwG: number): number {
    return Math.max(0.2, Math.min(1.0, (abwG - 3) / 17));
  }

  /**
   * Mineral dose to correct a deficit (india §5 / spec §8):
   *   dose_kg = deficit_ppm × volume_m³ / 1000 / purity_fraction
   * e.g. raise K by 10 ppm in 1000 m³ with MOP (50% K) → 20 kg.
   */
  mineralDoseKg(deficitPpm: number, volumeM3: number, purityFraction: number): number {
    if (purityFraction <= 0) return 0;
    return (deficitPpm * volumeM3) / 1000 / purityFraction;
  }

  /**
   * Molt Risk Score (spec §4): 100 × MoltPressure × (0.4 + 0.6 × Vulnerability).
   * The 0.4 floor means an imminent molt always registers some risk, but a
   * stressed pond escalates hard.
   */
  computeMoltRisk(
    phase: MoonPhase,
    abwG: number,
    v: MoltVulnerabilityInput,
  ): MoltRisk {
    const moltPressure = phase.moltLikelihood * this.lunarLockFactor(abwG);

    const vDO =
      v.do === undefined ? 0.1 : v.do < 3 ? 1 : v.do < 4 ? 0.7 : v.do < 5 ? 0.4 : 0.1;
    const vTemp =
      v.temp === undefined
        ? 0.1
        : v.temp > 33
          ? 0.8
          : v.temp > 31
            ? 0.5
            : v.temp < 26
              ? 0.4
              : 0.1;
    const vNh3 =
      v.freeNh3 === undefined ? 0.1 : v.freeNh3 > 0.3 ? 1 : v.freeNh3 > 0.1 ? 0.5 : 0.1;
    const vPh = (v.phSwing ?? 0) > 0.5 ? 0.6 : 0.2;
    const vDisease = v.diseaseHigh ? 0.8 : 0.2;
    const vDensity = Math.max(0, Math.min(1, v.densityRatio ?? 0.2));
    const vMineral = Math.max(0, Math.min(1, v.mineralDeficitFrac ?? 0));
    const vAppetite =
      v.tray === 'a_lot_left' ? 0.6 : v.tray === 'few_left' ? 0.3 : 0.1;

    const vulnerability =
      vDO * 0.22 +
      vMineral * 0.22 +
      vDisease * 0.15 +
      vTemp * 0.12 +
      vNh3 * 0.1 +
      vDensity * 0.08 +
      vAppetite * 0.06 +
      vPh * 0.05;

    const score = 100 * moltPressure * (0.4 + 0.6 * vulnerability);
    const band: MoltRisk['band'] =
      score >= 60 ? 'Critical' : score >= 30 ? 'Watch' : 'Low';

    // Phase relative to the nearest spring tide (waxing→pre, etc.).
    let phaseRel: MoltRisk['phaseRel'] = 'none';
    if (phase.inMoltWindow) {
      phaseRel = phase.daysToSpringTide <= 1 ? 'peak' : 'pre';
    }

    return {
      moltPressure: round4(moltPressure),
      vulnerability: round4(vulnerability),
      score: round2(score),
      band,
      phaseRel,
    };
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;
