import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PondContext, PondContextService } from '../pond-context/pond-context.service';
import { PondsService } from '../ponds/ponds.service';
import { istDayRangeUtc, toIstDateString } from '../common/ist-date';
import { addDays } from '../molt/molt-window';
import { isMineralTreatment } from '../molt/molt.service';
import { isMissingSchema } from '../health-observations/health.constants';
import { BIOSECURITY_ITEMS } from '../crops/biosecurity.service';
import { ThresholdParam, classify, thresholdFor } from '../common/wq-thresholds';
import {
  ALL_INDICATORS,
  DiseaseIndicators,
  DiseaseRisk,
  DiseaseWarningService,
  IndicatorEvidence,
  IndicatorKey,
  coverageOf,
} from './disease-warning.service';

/*
 * Every threshold below is a FIELD RULE OF THUMB, UNCALIBRATED (spec E4).
 * Pending aquaculture-health review; calibrate against D6 outcomes later.
 */
const TEMP_DROP_C = 2; // fell ≥ 2 °C …
const TEMP_PAIR_MS = 24 * 3_600_000; // … between readings < 24 h apart
const DO_LOW = 4; // mg/L
const DO_FRESH_MS = 24 * 3_600_000;
const WINTER_MONTHS = [11, 12, 1, 2]; // IST calendar months
const DOC_EARLY = 35;
const YELLOW_VIBRIO_CFU = 1_000; // > 10³ CFU/ml
const GREEN_SHARE_OF_TVC = 0.1;
const VIBRIO_RISE_X = 10;
const SIZE_CV = 0.3;
const ADG_LOW_G = 0.1; // g/day …
const ADG_AFTER_DOC = 30; // … after DOC 30
const CHRONIC_MORTALITY_DAYS = 5; // of the last 7
const ALKALINITY_LOW = 100; // ppm
const MINERAL_LOOKBACK_DAYS = 14;
const PREP_DONE_SHARE = 0.5;
const OBS_DAYS = 3; // health observations (today + 2 before)
const MICRO_DAYS = 7;
const STRESS_PARAMS: ThresholdParam[] = [
  'do', 'ph', 'temperature', 'salinity', 'alkalinity', 'ammonia', 'nitrite',
];
const WQ_FIELD: Record<string, string> = {
  do: 'dissolvedOxygen', ph: 'ph', temperature: 'temperature', salinity: 'salinity',
  alkalinity: 'alkalinity', ammonia: 'ammonia', nitrite: 'nitrite',
};
const OBS_SIGNS: Record<string, IndicatorKey> = {
  red_body: 'redBody',
  empty_gut: 'emptyGut',
  pale_hp: 'paleHp',
  white_feces: 'whiteFecesTray',
  loose_shell: 'looseShellObs',
  luminescence: 'nightGlow',
};
const PREP_KEYS: string[] = BIOSECURITY_ITEMS.filter((i) => i.stage === 'prep').map((i) => i.key);

/** "2026-09-18" → "18/09" (day-first, no month names to localise). */
const dayMonth = (d: string) => d.slice(0, 10).split('-').reverse().slice(0, 2).join('/');
const round1 = (n: number) => Math.round(n * 10) / 10;
const why = (i: IndicatorKey, params?: Record<string, string | number>) => ({
  key: `engines.disease.why_${i}`,
  ...(params ? { params } : {}),
});

export interface PondDerivation {
  indicators: DiseaseIndicators;
  evidence: IndicatorEvidence;
}

export interface PondDiseaseRisk extends PondDerivation {
  pondId: string;
  farmId: string;
  cropId: string | null;
  risks: DiseaseRisk[];
  /** Over every indicator: "based on 9 of 23 signs". */
  coverage: { known: number; total: number };
}

/**
 * D7: turns a pond's logs into DiseaseIndicators. SET-BASED — a fixed number
 * of queries whatever the pond count (it runs inside the alert-center build).
 * No access checks: callers pass contexts they already authorised.
 */
@Injectable()
export class DiseaseIndicatorsService {
  private readonly logger = new Logger(DiseaseIndicatorsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly engine: DiseaseWarningService,
    private readonly pondContext: PondContextService,
    private readonly ponds: PondsService,
  ) {}

  /**
   * GET /disease-risk/pond/:pondId/current — the read-out screen. Persists
   * the day's snapshot (best-effort) so outcomes can calibrate later.
   */
  async current(pondId: string, userId: string, now = new Date()) {
    await this.ponds.verifyAccess(pondId, userId, 'READ');
    const [ctx] = await this.pondContext.buildContextsFor([pondId]);
    const r = (await this.assess([ctx], now)).get(pondId)!;
    const date = toIstDateString(now);
    await this.engine
      .saveDaily(pondId, r.cropId, date, r.risks)
      .catch((err) => this.logger.warn(`Disease snapshot not saved for ${pondId}: ${err?.message ?? err}`));
    return { pondId, cropId: r.cropId, date, risks: r.risks, coverage: r.coverage };
  }

  private q(sql: string, params: unknown[]): Promise<any[]> {
    return this.dataSource.query(sql, params);
  }

  /** A not-yet-migrated table reads as "no data" (→ unknown), never a 500. */
  private safe(p: Promise<any[]>): Promise<any[] | null> {
    return p.catch((err) => {
      if (isMissingSchema(err)) return null;
      throw err;
    });
  }

  /** Derive + score every pond (the current per-pond score; H6 reads this). */
  async assess(contexts: PondContext[], now = new Date()): Promise<Map<string, PondDiseaseRisk>> {
    const derived = await this.derive(contexts, now);
    const out = new Map<string, PondDiseaseRisk>();
    for (const ctx of contexts) {
      const { indicators, evidence } = derived.get(ctx.pondId)!;
      const risks = this.engine.computeRisks(indicators, evidence);
      out.set(ctx.pondId, {
        pondId: ctx.pondId,
        farmId: ctx.farmId,
        cropId: ctx.cropId,
        indicators,
        evidence,
        risks,
        coverage: coverageOf(indicators, ALL_INDICATORS),
      });
    }
    return out;
  }

  async derive(contexts: PondContext[], now = new Date()): Promise<Map<string, PondDerivation>> {
    const out = new Map<string, PondDerivation>();
    if (!contexts.length) return out;
    const pondIds = contexts.map((c) => c.pondId);
    const cropIds = contexts.map((c) => c.cropId).filter((id): id is string => !!id);
    const today = toIstDateString(now);
    const crops = cropIds; // an empty array matches nothing; same query count

    // Seven queries, regardless of how many ponds.
    const [temps, obs, micro, sampling, mortality, treatments, bio] = await Promise.all([
      this.q(
        `SELECT pond_id AS "pondId", recorded_at AS "at", temperature::float AS t
           FROM water_quality_records
          WHERE pond_id = ANY($1::uuid[]) AND temperature IS NOT NULL AND recorded_at >= $2
          ORDER BY pond_id, recorded_at`,
        [pondIds, istDayRangeUtc(addDays(today, -2)).start],
      ),
      this.safe(
        this.q(
          `SELECT pond_id AS "pondId", sign, level, observed_on::text AS day
             FROM health_observations
            WHERE pond_id = ANY($1::uuid[]) AND observed_on >= $2 AND sign = ANY($3::text[])`,
          [pondIds, addDays(today, -(OBS_DAYS - 1)), Object.keys(OBS_SIGNS)],
        ),
      ),
      this.q(
        `SELECT "cropId", day, tvc, yellow, green, lum FROM (
           SELECT crop_id AS "cropId", measurement_date::text AS day,
                  total_vibrio_count_tvc_cfu_ml::float AS tvc,
                  yellow_vibrio_count_tvc_cfu_ml::float AS yellow,
                  green_vibrio_count_tvc_cfu_ml::float AS green,
                  luminescent_bacteria_lb_cfu_ml::float AS lum,
                  row_number() OVER (PARTITION BY crop_id ORDER BY measurement_date DESC, created_at DESC) AS rn
             FROM microbiology_data WHERE crop_id = ANY($1::uuid[])) x
          WHERE rn <= 2 ORDER BY "cropId", rn`,
        [crops],
      ),
      this.q(
        `SELECT "cropId", day, mbw, sd FROM (
           SELECT crop_id AS "cropId", sampling_date::text AS day, mbw_g::float AS mbw,
                  std_deviation::float AS sd,
                  row_number() OVER (PARTITION BY crop_id ORDER BY sampling_date DESC, created_at DESC) AS rn
             FROM sampling_data WHERE crop_id = ANY($1::uuid[]) AND mbw_g IS NOT NULL) x
          WHERE rn <= 2 ORDER BY "cropId", rn`,
        [crops],
      ),
      this.q(
        `SELECT crop_id AS "cropId", count(DISTINCT record_date)::int AS days
           FROM mortality_records
          WHERE crop_id = ANY($1::uuid[]) AND record_date >= $2
          GROUP BY crop_id`,
        [crops, addDays(today, -6)],
      ),
      this.q(
        `SELECT crop_id AS "cropId", description, notes, category, ingredient_keys AS "ingredientKeys"
           FROM treatments WHERE crop_id = ANY($1::uuid[]) AND treatment_date >= $2`,
        [crops, addDays(today, -(MINERAL_LOOKBACK_DAYS - 1))],
      ).catch((err) => {
        // D2 columns not migrated (42703): text-only rows, keyword match.
        if (!isMissingSchema(err)) throw err;
        return this.q(
          `SELECT crop_id AS "cropId", description, notes FROM treatments
            WHERE crop_id = ANY($1::uuid[]) AND treatment_date >= $2`,
          [crops, addDays(today, -(MINERAL_LOOKBACK_DAYS - 1))],
        );
      }),
      this.safe(
        this.q(
          `SELECT c.id AS "cropId", c.pl_pcr_results AS pcr,
                  (SELECT count(*)::int FROM biosecurity_checks b
                    WHERE b.crop_id = c.id AND b.item_key = ANY($2::text[])) AS "prepDone"
             FROM crops c WHERE c.id = ANY($1::uuid[])`,
          [crops, PREP_KEYS],
        ),
      ),
    ]);

    const group = <T>(rows: any[] | null, key: string) => {
      const m = new Map<string, T[]>();
      for (const r of rows ?? []) {
        const list = m.get(r[key]);
        if (list) list.push(r);
        else m.set(r[key], [r]);
      }
      return m;
    };
    const tempsBy = group<any>(temps, 'pondId');
    const obsBy = group<any>(obs, 'pondId');
    const microBy = group<any>(micro, 'cropId');
    const sampBy = group<any>(sampling, 'cropId');
    const mortBy = new Map<string, number>(mortality.map((r: any) => [r.cropId, Number(r.days)]));
    const mineralCrops = new Set<string>(
      treatments.filter((t: any) => isMineralTreatment(t)).map((t: any) => t.cropId),
    );
    const bioBy = new Map<string, any>((bio ?? []).map((r: any) => [r.cropId, r]));
    const istMonth = Number(today.slice(5, 7));

    for (const ctx of contexts) {
      const ind: DiseaseIndicators = {};
      const ev: IndicatorEvidence = {};
      const set = (k: IndicatorKey, v: boolean | undefined, params?: Record<string, string | number>) => {
        ind[k] = v;
        if (v) ev[k] = why(k, params);
      };
      const wq: any = ctx.waterQuality;
      const cid = ctx.cropId;

      // tempDrop: consecutive readings < 24 h apart, fell ≥ 2 °C, last 3 IST days.
      const ts = tempsBy.get(ctx.pondId) ?? [];
      if (ts.length >= 2) {
        let best: { drop: number; at: Date } | null = null;
        for (let i = 1; i < ts.length; i++) {
          const a = ts[i - 1];
          const b = ts[i];
          const drop = a.t - b.t;
          const gap = new Date(b.at).getTime() - new Date(a.at).getTime();
          if (gap < TEMP_PAIR_MS && drop >= TEMP_DROP_C && (!best || drop > best.drop)) {
            best = { drop, at: new Date(b.at) };
          }
        }
        set('tempDrop3in48h', !!best, best
          ? { drop: round1(best.drop), date: dayMonth(toIstDateString(best.at)) }
          : undefined);
      }

      // doBelow4: the latest DO, only if logged within 24 h.
      const doAt = wq?.dissolvedOxygenAsOf ? new Date(wq.dissolvedOxygenAsOf).getTime() : null;
      if (wq?.dissolvedOxygen != null && doAt != null && now.getTime() - doAt < DO_FRESH_MS) {
        set('doBelow4', wq.dissolvedOxygen < DO_LOW, { value: wq.dissolvedOxygen });
      }

      // Calendar, labelled as such in the app.
      set('seasonWinter', WINTER_MONTHS.includes(istMonth));

      if (ctx.doc != null) set('docBelow35', ctx.doc < DOC_EARLY, { doc: ctx.doc });

      // Health observations (D6): seen (few/many) → true; only "checked, none" → false.
      const seen = new Map<IndicatorKey, { level: string; day: string }>();
      const checked = new Set<IndicatorKey>();
      for (const o of obsBy.get(ctx.pondId) ?? []) {
        const k = OBS_SIGNS[o.sign];
        checked.add(k);
        if (o.level !== 'none' && (!seen.has(k) || o.day > seen.get(k)!.day)) {
          seen.set(k, { level: o.level, day: o.day });
        }
      }
      for (const k of checked) {
        const s = seen.get(k);
        set(k, !!s, s ? { date: dayMonth(s.day) } : undefined);
      }

      // Microbiology (latest two readings per crop).
      const [m0, m1] = cid ? (microBy.get(cid) ?? []) : [];
      if (m0 && m0.day >= addDays(today, -(MICRO_DAYS - 1))) {
        const yellowHigh = m0.yellow != null ? m0.yellow > YELLOW_VIBRIO_CFU : undefined;
        const greenHigh =
          m0.green != null && m0.tvc > 0 ? m0.green / m0.tvc > GREEN_SHARE_OF_TVC : undefined;
        if (yellowHigh || greenHigh) {
          set('yellowVibrioUp', true, { date: dayMonth(m0.day) });
        } else if (yellowHigh === false || greenHigh === false) {
          set('yellowVibrioUp', false);
        }
        if (m0.lum != null) set('luminousVibrioUp', m0.lum > 0, { date: dayMonth(m0.day) });
        if (m1 && m0.tvc != null && m1.tvc > 0) {
          set('vibrioUp', m0.tvc >= VIBRIO_RISE_X * m1.tvc, {
            times: round1(m0.tvc / m1.tvc),
            date: dayMonth(m0.day),
          });
        }
      }

      // Sampling: size spread and growth.
      const [s0, s1] = cid ? (sampBy.get(cid) ?? []) : [];
      if (s0?.sd != null && s0.mbw > 0) {
        const cv = s0.sd / s0.mbw;
        set('sizeCvUp', cv > SIZE_CV, { cv: Math.round(cv * 100) });
      }
      if (ctx.doc != null && ctx.doc <= ADG_AFTER_DOC) {
        set('adgBelowExpected', false);
      } else if (ctx.doc != null && s0 && s1) {
        const days = (Date.parse(s0.day) - Date.parse(s1.day)) / 86_400_000;
        if (days > 0) {
          const adg = (s0.mbw - s1.mbw) / days;
          set('adgBelowExpected', adg < ADG_LOW_G, { adg: Math.round(adg * 100) / 100 });
        }
      }

      // Mortality logged on ≥ 5 of the last 7 days. No logs → unknown.
      const mortDays = cid ? (mortBy.get(cid) ?? 0) : 0;
      if (mortDays > 0) {
        set('chronicDailyMortality', mortDays >= CHRONIC_MORTALITY_DAYS, { days: mortDays });
      }

      // ≥ 2 logged WQ parameters outside their optimal band at once.
      if (wq) {
        const present = STRESS_PARAMS.filter((p) => wq[WQ_FIELD[p]] != null);
        if (present.length >= 2) {
          const off = present.filter(
            (p) => classify(Number(wq[WQ_FIELD[p]]), thresholdFor(ctx.species, p)) !== 'optimal',
          );
          set('multiStress', off.length >= 2, { count: off.length });
        }
      }

      // No mineral/lime treatment (D2 category) in 14 d AND alkalinity < 100.
      const alkAt = wq?.alkalinityAsOf ? Date.parse(wq.alkalinityAsOf) : null;
      const alk =
        wq?.alkalinity != null &&
        alkAt != null &&
        now.getTime() - alkAt < MINERAL_LOOKBACK_DAYS * 86_400_000
          ? Number(wq.alkalinity)
          : null;
      if (cid && mineralCrops.has(cid)) set('mineralDeficit', false);
      else if (cid && alk != null) set('mineralDeficit', alk < ALKALINITY_LOW, { value: alk });

      // WSSV entry risk (D5): prep < 50 % done, or seed not tested / positive.
      const b = cid ? bioBy.get(cid) : undefined;
      if (b) {
        const wssv: string | undefined = b.pcr?.wssv;
        const prepLow = Number(b.prepDone) / PREP_KEYS.length < PREP_DONE_SHARE;
        const seedRisk = wssv === 'not_tested' || wssv === 'positive';
        if (prepLow) {
          ind.entryRisk = true;
          ev.entryRisk = { key: 'engines.disease.why_entryRisk_prep', params: { done: Number(b.prepDone), total: PREP_KEYS.length } };
        } else if (seedRisk) {
          ind.entryRisk = true;
          ev.entryRisk = { key: `engines.disease.why_entryRisk_${wssv}` };
        } else if (wssv === 'negative') {
          ind.entryRisk = false;
        }
      }

      out.set(ctx.pondId, { indicators: ind, evidence: ev });
    }
    return out;
  }
}
