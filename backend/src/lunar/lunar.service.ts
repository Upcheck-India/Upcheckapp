import { Injectable } from '@nestjs/common';

export interface MoonPhase {
  jd: number;
  phase: number; // 0=new … 0.5=full … →1=new
  ageDays: number;
  illumination: number; // 0..1
  name: string;
  moltLikelihood: number; // 0..1, =1 at new & full, =0 at quarters
  daysToSpringTide: number; // unsigned days to nearest new/full
  signedDaysToSpringTide: number; // <0 = approaching (pre), >0 = just passed (post)
  inMoltWindow: boolean; // within ±windowDays of a spring tide

  /**
   * TRUE phase instants (E5.1), corrected per Meeus ch. 49 and reported as
   * IST calendar days. The mean-phase figures above can be up to ±14 h out,
   * which is enough to name the wrong date — and this audience checks the
   * app against the Panchang.
   */
  /** `YYYY-MM-DD` in IST — what the farmer's calendar says. */
  nextNewMoonIst: string;
  nextFullMoonIst: string;
  /** The same instants, unconverted, for any caller that wants the time. */
  nextNewMoonAt: string;
  nextFullMoonAt: string;
  /** Distance to the nearest true spring tide, in days. */
  trueDaysToSpringTide: number;
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
  /** Latest salinity (ppt). Low salinity (< 5) sharply raises soft-shell risk. */
  salinity?: number;
}

export type StepCategory =
  | 'mineral'
  | 'aeration'
  | 'feed'
  | 'handling'
  | 'biosecurity'
  | 'water'
  | 'monitoring'
  | 'general';

export type StepPriority = 'critical' | 'important' | 'routine';

export interface PlaybookStep {
  category: StepCategory;
  priority: StepPriority;
  /** Farmer-facing English text, for clients older than `key` (M1.6). */
  text: string;
  /** App i18n key (engines.ts) + interpolation params. */
  key: string;
  params?: Record<string, string | number>;
  /** Which datum triggered a data-driven step (transparency); absent for baseline. */
  trigger?: string;
}

export interface LunarPlaybook {
  /** Position relative to the nearest spring tide. */
  phaseRel: 'pre' | 'peak' | 'post' | 'inter';
  /** Short phase label, e.g. "Molt peak — protect the pond". */
  phaseLabel: string;
  /** One-line summary with timing + risk band. */
  headline: string;
  /** Honesty rule (spec §1): molt timing is a refined prediction, not a certainty. */
  note: string;
  steps: PlaybookStep[];
  /** i18n keys beside the English above (M1.6). */
  phaseLabelKey: string;
  headlineKey: string;
  headlineParams: Record<string, string | number>;
  /** Append engines.lunar.pb_headlineCritical to the headline. */
  headlineCritical: boolean;
  noteKey: string;
}

export interface MoltRisk {
  moltPressure: number; // 0..1
  vulnerability: number; // 0..1
  score: number; // 0..100
  band: 'Low' | 'Watch' | 'Critical';
  phaseRel: 'pre' | 'peak' | 'post' | 'none';
  /** How many vulnerability factors had a reading (0 → vulnerability is the unknown 0.5). */
  vulnerabilityKnown: number;
  /** How many factors the model has. */
  vulnerabilityTotal: number;
}

/**
 * Molt pressure by true-phase window (molt-window.ts) — the same windows the
 * checklist, alerts and playbook use.
 * ponytail: field rule of thumb, uncalibrated (E4) — tune from logged soft-shell
 * observations once there are enough of them.
 */
const WINDOW_LIKELIHOOD: Record<'pre' | 'peak' | 'post' | 'inter', number> = {
  peak: 1.0,
  pre: 0.6,
  post: 0.6,
  inter: 0,
};

/** Vulnerability factor weights (sum 1). Unlogged factors are dropped and the rest renormalised. */
const WEIGHTS = {
  do: 0.22,
  mineral: 0.22,
  disease: 0.15,
  temp: 0.12,
  nh3: 0.1,
  density: 0.08,
  appetite: 0.06,
  ph: 0.05,
};

import { nextPhase, daysToNearestSpringTide } from './moon-phase-meeus';
import { toIstDateString } from '../common/ist-date';
import { currentMoltWindow } from '../molt/molt-window';

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

  /** The instant a MoonPhase was computed for (inverse of julianDay). */
  private dateOf(phase: MoonPhase): Date {
    return new Date((phase.jd - JD_UNIX_EPOCH) * MS_PER_DAY);
  }

  private moltWindowAt(phase: MoonPhase) {
    return currentMoltWindow(this.dateOf(phase));
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
    // Signed days to the nearest spring tide: negative = approaching it (pre-molt),
    // positive = just passed it (post-molt). Springs sit at phase 0, 0.5 and 1.
    const nearestSpring = [0, 0.5, 1].reduce(
      (best, s) => (Math.abs(phase - s) < Math.abs(phase - best) ? s : best),
      0,
    );
    const signedDaysToSpringTide = (phase - nearestSpring) * SYNODIC;

    /**
     * The TRUE next new and full moon, and the true distance to the nearest
     * spring tide (E5.1).
     *
     * Everything above is MEAN phase — a fixed 29.53-day month — which is fine
     * for illumination and the shape of the molt curve, but wrong by up to
     * ±14 hours for the instant of a new or full moon. That is enough to put
     * the date on the wrong day, and this audience reads Amavasya and Purnima
     * off the Panchang, which uses true phase at local time. See
     * `moon-phase-meeus.ts`.
     *
     * The dates are emitted as IST CALENDAR DAYS, not as raw instants. The
     * September 2026 new moon is 03:26 UTC on the 11th — which is 08:56 IST on
     * the 11th — but a phase falling between 18:30 and 24:00 UTC lands on the
     * NEXT day in IST, and formatting the instant without converting is how
     * the app came to disagree with the farmer's own calendar.
     */
    const trueNextNewMoon = nextPhase(date, true);
    const trueNextFullMoon = nextPhase(date, false);

    return {
      jd,
      phase,
      ageDays,
      nextNewMoonIst: toIstDateString(trueNextNewMoon),
      nextFullMoonIst: toIstDateString(trueNextFullMoon),
      nextNewMoonAt: trueNextNewMoon.toISOString(),
      nextFullMoonAt: trueNextFullMoon.toISOString(),
      /** True distance, which is what the molt window should key on. */
      trueDaysToSpringTide: daysToNearestSpringTide(date),
      illumination,
      name: this.phaseName(phase),
      moltLikelihood,
      daysToSpringTide,
      signedDaysToSpringTide,
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
   * Molt Risk Score (spec §4): 100 × MoltPressure × (0.4 + 0.6 × Vulnerability).
   * The 0.4 floor means an imminent molt always registers some risk, but a
   * stressed pond escalates hard.
   */
  computeMoltRisk(
    phase: MoonPhase,
    abwG: number,
    v: MoltVulnerabilityInput,
  ): MoltRisk {
    // One phase model: the true-phase molt window (molt-window.ts) drives both
    // the pressure and phaseRel, so the score can't disagree with the badge.
    const windowPhase = this.moltWindowAt(phase).phase;
    const moltPressure = WINDOW_LIKELIHOOD[windowPhase] * this.lunarLockFactor(abwG);

    // Each factor is null when there is no reading — a pond with nothing
    // logged is unknown, not safe.
    const factors: Record<keyof typeof WEIGHTS, number | null> = {
      do:
        v.do == null ? null : v.do < 3 ? 1 : v.do < 4 ? 0.7 : v.do < 5 ? 0.4 : 0.1,
      temp:
        v.temp == null
          ? null
          : v.temp > 33
            ? 0.8
            : v.temp > 31
              ? 0.5
              : v.temp < 26
                ? 0.4
                : 0.1,
      nh3:
        v.freeNh3 == null ? null : v.freeNh3 > 0.3 ? 1 : v.freeNh3 > 0.1 ? 0.5 : 0.1,
      ph: v.phSwing == null ? null : v.phSwing > 0.5 ? 0.6 : 0.2,
      disease: v.diseaseHigh == null ? null : v.diseaseHigh ? 0.8 : 0.2,
      density: v.densityRatio == null ? null : clamp01(v.densityRatio),
      mineral: v.mineralDeficitFrac == null ? null : clamp01(v.mineralDeficitFrac),
      appetite:
        v.tray == null ? null : v.tray === 'a_lot_left' ? 0.6 : v.tray === 'few_left' ? 0.3 : 0.1,
    };

    let weightSum = 0;
    let weighted = 0;
    let known = 0;
    for (const k of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]) {
      const f = factors[k];
      if (f == null) continue;
      known++;
      weightSum += WEIGHTS[k];
      weighted += f * WEIGHTS[k];
    }
    const vulnerability = known === 0 ? 0.5 : weighted / weightSum;

    const score = 100 * moltPressure * (0.4 + 0.6 * vulnerability);
    const band: MoltRisk['band'] =
      score >= 60 ? 'Critical' : score >= 30 ? 'Watch' : 'Low';

    const phaseRel: MoltRisk['phaseRel'] = windowPhase === 'inter' ? 'none' : windowPhase;

    return {
      moltPressure: round4(moltPressure),
      vulnerability: round4(vulnerability),
      score: round2(score),
      band,
      phaseRel,
      vulnerabilityKnown: known,
      vulnerabilityTotal: Object.keys(WEIGHTS).length,
    };
  }

  /**
   * Phase × pond-data action playbook (spec §5). Maps the pond's position in the
   * semi-lunar cycle to concrete management steps — baseline steps for the phase
   * plus data-driven escalations from the pond's latest readings. This is the
   * "which management during which phase" layer on top of the raw phase data.
   *
   * Every string carries an app i18n key (`engines.lunar.pb_*`) beside the
   * English (M1.6): current clients render the key, old clients the English.
   */
  buildPlaybook(
    phase: MoonPhase,
    risk: MoltRisk,
    v: MoltVulnerabilityInput,
  ): LunarPlaybook {
    // Phase and target from the true-phase molt window — the same model the
    // checklist and alerts use. Mean phase is only for illumination/drawing.
    const now = this.moltWindowAt(phase);
    const phaseRel: LunarPlaybook['phaseRel'] = now.phase;
    const w = now.window ?? now.next;
    const target = w.kind === 'full' ? 'full moon' : 'new moon';
    const days = Math.abs(
      (Date.parse(`${w.peakDate}T00:00:00Z`) -
        Date.parse(`${toIstDateString(this.dateOf(phase))}T00:00:00Z`)) /
        MS_PER_DAY,
    );
    const d = days.toFixed(0);

    const steps: PlaybookStep[] = [];
    const add = (
      category: StepCategory,
      priority: StepPriority,
      key: string,
      text: string,
      trigger?: string,
      params?: Record<string, string | number>,
    ) =>
      steps.push({
        category,
        priority,
        text,
        key: `engines.lunar.pb_${key}`,
        ...(params ? { params } : {}),
        trigger,
      });

    // Shared data flags.
    const lowDO = v.do !== undefined && v.do < 4;
    const hotWater = v.temp !== undefined && v.temp > 33;
    const highNh3 = v.freeNh3 !== undefined && v.freeNh3 > 0.1;
    const mineralLow = (v.mineralDeficitFrac ?? 0) > 0;
    const crowded = (v.densityRatio ?? 0) > 0.8;
    const lowSalinity = v.salinity !== undefined && v.salinity < 5;
    const heavyResidue = v.tray === 'a_lot_left';

    let phaseLabel: string;
    let headline: string;
    // Headline keys carry the moon kind; inter names none.
    let headlineKey = `engines.lunar.pb_headline_${phaseRel}_${w.kind}`;

    if (phaseRel === 'pre') {
      phaseLabel = 'Pre-molt — build reserves';
      headline = `Molt surge expected in ~${d} day(s) around the ${target}. Build mineral and oxygen reserves now.`;
      add('mineral', 'important', 'pre_minerals', 'Top up calcium, magnesium & potassium to molt targets now, before demand spikes.');
      add('water', 'important', 'pre_alkalinity', 'Raise alkalinity toward ≥ 120 ppm (agricultural lime / dolomite) for shell hardening.');
      add('biosecurity', 'routine', 'pre_probiotic', 'Add probiotic / immunostimulant and avoid introducing stressors before the window.');
      if (mineralLow)
        add('mineral', lowSalinity ? 'critical' : 'important', 'pre_mineralDeficit', 'Mineral deficit detected — dose Ca/Mg/K via the mineral calculator before the molt window opens.', 'mineralDeficit');
      if (lowSalinity)
        add('mineral', 'important', 'pre_lowSalinity', 'Low salinity: soft-shell risk is high at molt — prioritise potassium & magnesium top-up.', 'salinity');
      if (lowDO || crowded)
        add('aeration', 'important', 'pre_aeration', 'Service aerators now and target night DO ≥ 4 mg/L — molting sharply raises oxygen demand.', lowDO ? 'lowDO' : 'density');
      if (highNh3)
        add('water', 'important', 'pre_nh3', 'Bring ammonia down before the molt — trim feed / exchange water; toxic NH₃ stresses molting shrimp.', 'freeNh3');
    } else if (phaseRel === 'peak') {
      phaseLabel = 'Molt peak — protect the pond';
      headline = `Molt window is open (${target}). Shrimp are soft and vulnerable — protect, don't disturb.`;
      add('feed', 'important', 'peak_feed', 'Reduce feed 15–30% — shrimp go off-feed while molting and uneaten feed fouls water.');
      add('aeration', 'critical', 'peak_aeration', 'Maximise aeration, especially 02:00–06:00 (pre-dawn DO minimum).');
      add('handling', 'critical', 'peak_noHandling', 'No handling — suspend sampling, netting, partial harvest and chemical treatments; soft shrimp die from stress and cannibalism.');
      add('mineral', 'important', 'peak_holdMinerals', 'Hold calcium, magnesium, potassium and alkalinity levels to support shell hardening.');
      if (lowDO)
        add('aeration', 'critical', 'peak_lowDO', `DO is ${v.do} mg/L — run ALL aerators continuously and keep emergency oxygen / peroxide on standby.`, 'lowDO', { do: v.do as number });
      if (heavyResidue)
        add('feed', 'important', 'peak_tray', 'Heavy tray residue confirms the molt — cut feed 30% until appetite returns.', 'tray');
      if (v.diseaseHigh)
        add('biosecurity', 'critical', 'peak_biosecurity', 'Biosecurity lockdown: no water exchange, no new inputs, disinfect all gear — molt stress widens the disease window.', 'disease');
      if (mineralLow)
        add('mineral', 'critical', 'peak_mineralDeficit', 'Soft-shell risk HIGH — immediate K/Mg/Ca top-up (especially in low-salinity ponds).', 'mineralDeficit');
      if (hotWater)
        add('water', 'important', 'peak_heat', 'Heat + molt — deepen the water and add extra night aeration to ease stress.', 'temp');
    } else if (phaseRel === 'post') {
      phaseLabel = 'Post-molt — recover & grow';
      headline = `Past the ${target} molt by ~${d} day(s). Shells are hardening — feed the growth window.`;
      add('feed', 'important', 'post_feed', 'Restore feed and add +5–10% — the fastest growth happens right after molt; ride the compensatory window.');
      add('monitoring', 'routine', 'post_softShell', 'Watch for soft-shell / Loose-Shell Syndrome and cannibalism over the next 2–3 days.');
      add('monitoring', 'routine', 'post_sample', 'Safe window to sample for a weight check once shells have hardened (~3 days after the tide).');
      add('mineral', 'routine', 'post_minerals', 'Confirm Ca/Mg/K held through hardening; top up if levels dropped.');
      if (mineralLow)
        add('mineral', 'important', 'post_mineralDeficit', 'Minerals still low post-molt — top up to support new-shell hardening and prevent soft-shell.', 'mineralDeficit');
      if (v.tray === 'empty')
        add('feed', 'important', 'post_trayEmpty', 'Trays emptying fast — shrimp are feeding hard; raise the ration to capture growth.', 'tray');
    } else {
      phaseLabel = 'Between molts — routine operations';
      headlineKey = 'engines.lunar.pb_headline_inter';
      headline = `No molt surge near — next window in ~${d} day(s). Good time for routine work.`;
      add('general', 'routine', 'inter_routine', 'Routine feeding and management — no molt surge in the immediate window.');
      add('monitoring', 'routine', 'inter_ops', 'Best window for sampling, grading, partial harvest and pond operations.');
      if (mineralLow)
        add('mineral', 'routine', 'inter_minerals', 'Start building mineral reserves now, ahead of the next molt window.', 'mineralDeficit');
      if (lowDO)
        add('aeration', 'important', 'inter_lowDO', 'Low DO — service aeration regardless of phase.', 'lowDO');
    }

    const critical = risk.band === 'Critical';
    return {
      phaseRel,
      phaseLabel,
      phaseLabelKey: `engines.lunar.pb_label_${phaseRel}`,
      headline: `${headline}${critical ? ' Risk is CRITICAL — act today.' : ''}`,
      headlineKey,
      headlineParams: { days: d },
      headlineCritical: critical,
      note: 'Molt timing follows the moon calendar. Your soft-shell observations are recorded for future tuning.',
      noteKey: 'engines.lunar.pb_note',
      steps,
    };
  }
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;
