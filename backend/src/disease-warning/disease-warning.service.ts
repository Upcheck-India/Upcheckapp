import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiseaseRiskSnapshot } from './disease-risk-snapshot.entity';
import { PondsService } from '../ponds/ponds.service';
import type { TextKey } from '../molt/molt.service';

/**
 * Flat indicator set. `DiseaseIndicatorsService.derive` fills it from the
 * pond's logs (D7); the engine only maps indicators → per-disease scores, so
 * it stays pure and testable.
 *
 * `undefined` = UNKNOWN (no data), never "false": it lowers coverage, not the
 * score. `regionalWssv` / `regionWfd` / `hpStress` have no data source yet and
 * stay unknown (regional data needs the location strategy).
 */
export interface DiseaseIndicators {
  // WSSV
  /** Kept name: now "temperature fell ≥ 2 °C between readings < 24 h apart, last 3 IST days". */
  tempDrop3in48h?: boolean;
  doBelow4?: boolean;
  seasonWinter?: boolean;
  regionalWssv?: boolean;
  redBody?: boolean;
  /** Biosecurity prep < 50 % done, or seed not PCR-tested / positive for WSSV (D5). */
  entryRisk?: boolean;
  // AHPND
  docBelow35?: boolean;
  yellowVibrioUp?: boolean;
  emptyGut?: boolean;
  paleHp?: boolean;
  // EHP
  sizeCvUp?: boolean;
  adgBelowExpected?: boolean;
  whiteFecesTray?: boolean;
  regionWfd?: boolean;
  // WFD
  vibrioUp?: boolean;
  ehpRiskUp?: boolean;
  // Luminous
  luminousVibrioUp?: boolean;
  nightGlow?: boolean;
  // RMS
  chronicDailyMortality?: boolean;
  multiStress?: boolean;
  // LSS
  looseShellObs?: boolean;
  mineralDeficit?: boolean;
  hpStress?: boolean;
}

export type DiseaseName =
  | 'WSSV'
  | 'AHPND'
  | 'EHP'
  | 'WFD'
  | 'Luminous'
  | 'RMS'
  | 'LSS';

export type IndicatorKey = keyof DiseaseIndicators;

/** Why a TRUE indicator fired, as an app i18n key + params ("fell 2.4 °C on 18/09"). */
export type IndicatorEvidence = Partial<Record<IndicatorKey, TextKey>>;

export interface DiseaseRisk {
  disease: DiseaseName;
  score: number; // 0..100
  band: 'Low' | 'Watch' | 'Critical';
  triggers: Array<keyof DiseaseIndicators>;
  steps: string[];
  /** How many of this disease's indicators had data. */
  coverage: { known: number; total: number };
  /** One per trigger, in plain words (6 locales). */
  triggerKeys: TextKey[];
  /** One per step (6 locales); `steps` stays the English. */
  stepKeys: TextKey[];
}

/**
 * Per-disease weighted indicator signatures (farmer_features_spec.md §2).
 *
 * ponytail: hand weights, calibrate against disease outcomes (D6) later.
 * Rebalanced (D7) so every disease can reach Critical (≥ 60) from indicators
 * the app can derive — WFD was capped at 40 while vibrioUp / ehpRiskUp were
 * never set. Each disease's weights still sum to 1.
 */
const SIGNATURES: Record<
  DiseaseName,
  Array<{ indicator: keyof DiseaseIndicators; weight: number }>
> = {
  WSSV: [
    { indicator: 'tempDrop3in48h', weight: 0.3 },
    { indicator: 'doBelow4', weight: 0.1 },
    { indicator: 'seasonWinter', weight: 0.1 },
    { indicator: 'regionalWssv', weight: 0.15 },
    { indicator: 'redBody', weight: 0.2 },
    { indicator: 'entryRisk', weight: 0.15 },
  ],
  AHPND: [
    { indicator: 'docBelow35', weight: 0.25 },
    { indicator: 'yellowVibrioUp', weight: 0.3 },
    { indicator: 'emptyGut', weight: 0.25 },
    { indicator: 'paleHp', weight: 0.2 },
  ],
  EHP: [
    { indicator: 'sizeCvUp', weight: 0.3 },
    { indicator: 'adgBelowExpected', weight: 0.3 },
    { indicator: 'whiteFecesTray', weight: 0.25 },
    { indicator: 'regionWfd', weight: 0.15 },
  ],
  WFD: [
    { indicator: 'whiteFecesTray', weight: 0.4 },
    { indicator: 'vibrioUp', weight: 0.3 },
    { indicator: 'ehpRiskUp', weight: 0.3 },
  ],
  Luminous: [
    { indicator: 'luminousVibrioUp', weight: 0.6 },
    { indicator: 'nightGlow', weight: 0.4 },
  ],
  RMS: [
    { indicator: 'chronicDailyMortality', weight: 0.5 },
    { indicator: 'multiStress', weight: 0.5 },
  ],
  LSS: [
    { indicator: 'looseShellObs', weight: 0.4 },
    { indicator: 'mineralDeficit', weight: 0.4 },
    { indicator: 'hpStress', weight: 0.2 },
  ],
};

const STEPS: Record<DiseaseName, string[]> = {
  WSSV: [
    'Raise biosecurity: stop water exchange, disinfect gear, no new inputs',
    'Stabilize temperature; deepen water; maximize aeration',
    'Reduce feed; PCR-test if mortality begins',
  ],
  AHPND: [
    'Reduce feed; check feeding trays for empty guts',
    'Apply probiotics; reduce yellow-vibrio load',
    'Improve bottom hygiene; siphon sludge',
  ],
  EHP: [
    'Confirm via PCR; quantify size variation (CV)',
    'Improve feed quality; add gut probiotics',
    'Disinfect/dry pond between crops to break the cycle',
  ],
  WFD: [
    'Cut feed 20–30%; add gut probiotics/binders',
    'Reduce vibrio load; improve water quality',
  ],
  Luminous: [
    'Reduce luminous vibrio: probiotics, partial water exchange',
    'Avoid night feeding; improve aeration',
  ],
  RMS: [
    'Reduce multi-stress: stabilize DO, ammonia and temperature',
    'Lower handling stress; add minerals + probiotics',
  ],
  LSS: [
    'Top up Ca/Mg/K to molt targets (use the mineral dose calc)',
    'Hold alkalinity ≥120 ppm; improve feed; reduce HP stress',
  ],
};

export const DISEASES = Object.keys(SIGNATURES) as DiseaseName[];

/** Every indicator any signature reads — the denominator of overall coverage. */
export const ALL_INDICATORS = [
  ...new Set(DISEASES.flatMap((d) => SIGNATURES[d].map((s) => s.indicator))),
];

/** No data source yet: always unknown (regional data needs district + k≥5). */
export const NOT_DERIVABLE: IndicatorKey[] = ['regionalWssv', 'regionWfd', 'hpStress'];

/** Field rule of thumb, uncalibrated (E4): score ≥ 60 Critical, ≥ 30 Watch. */
const CRITICAL_AT = 60;
const WATCH_AT = 30;
/** Field rule of thumb, uncalibrated: EHP at Watch or above feeds WFD. */
const EHP_FEEDS_WFD_AT = 30;

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Share of the indicators that have data (known = true or false). */
export const coverageOf = (indicators: DiseaseIndicators, keys: IndicatorKey[]) => ({
  known: keys.filter((k) => indicators[k] !== undefined).length,
  total: keys.length,
});

function scoreOne(
  disease: DiseaseName,
  indicators: DiseaseIndicators,
  evidence: IndicatorEvidence,
): DiseaseRisk {
  const triggers: IndicatorKey[] = [];
  let sum = 0;
  for (const { indicator, weight } of SIGNATURES[disease]) {
    if (indicators[indicator]) {
      sum += weight;
      triggers.push(indicator);
    }
  }
  const score = round1(100 * sum);
  const band: DiseaseRisk['band'] =
    score >= CRITICAL_AT ? 'Critical' : score >= WATCH_AT ? 'Watch' : 'Low';
  return {
    disease,
    score,
    band,
    triggers,
    steps: STEPS[disease],
    coverage: coverageOf(indicators, SIGNATURES[disease].map((s) => s.indicator)),
    triggerKeys: triggers.map(
      (i) => evidence[i] ?? { key: `engines.disease.why_${i}` },
    ),
    stepKeys: STEPS[disease].map((_, i) => ({
      key: `engines.disease.step_${disease}_${i}`,
    })),
  };
}

/**
 * `ehpRiskUp` = EHP scored ≥ 30 in the same run. TRUE when it did; FALSE only
 * when it could not have, even if every unknown EHP indicator were true;
 * otherwise unknown.
 */
function withEhpRisk(
  indicators: DiseaseIndicators,
  evidence: IndicatorEvidence,
): [DiseaseIndicators, IndicatorEvidence] {
  if (indicators.ehpRiskUp !== undefined) return [indicators, evidence];
  const ehp = scoreOne('EHP', indicators, evidence);
  const unknownWeight = SIGNATURES.EHP.filter(
    (s) => indicators[s.indicator] === undefined,
  ).reduce((a, s) => a + s.weight, 0);
  const ehpRiskUp =
    ehp.score >= EHP_FEEDS_WFD_AT
      ? true
      : ehp.score + 100 * unknownWeight < EHP_FEEDS_WFD_AT
        ? false
        : undefined;
  return [
    { ...indicators, ehpRiskUp },
    ehpRiskUp
      ? {
          ...evidence,
          ehpRiskUp: { key: 'engines.disease.why_ehpRiskUp', params: { score: ehp.score } },
        }
      : evidence,
  ];
}

@Injectable()
export class DiseaseWarningService {
  constructor(
    @InjectRepository(DiseaseRiskSnapshot)
    private readonly repo: Repository<DiseaseRiskSnapshot>,
    private readonly pondsService: PondsService,
  ) {}

  /**
   * Score every disease from the indicator set and return them ranked
   * high→low. score = 100 × Σ(weight where indicator matched).
   */
  computeRisks(
    indicators: DiseaseIndicators,
    evidence: IndicatorEvidence = {},
  ): DiseaseRisk[] {
    const [ind, ev] = withEhpRisk(indicators, evidence);
    return DISEASES.map((d) => scoreOne(d, ind, ev)).sort(
      (a, b) => b.score - a.score,
    );
  }

  /**
   * Cumulative disease risk in [0,1] — the max single-disease score scaled to a
   * fraction. Consumed by the Harvest-Timing engine's riskLoss term.
   */
  cumulativeRisk(indicators: DiseaseIndicators): number {
    const top = this.computeRisks(indicators)[0];
    return top ? top.score / 100 : 0;
  }

  /**
   * Linear-regression slope over a series — used upstream to set the `*Up`
   * trend indicators (positive slope above a threshold ⇒ rising).
   */
  linearSlope(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;
    const meanX = (n - 1) / 2;
    const meanY = values.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - meanX) * (values[i] - meanY);
      den += (i - meanX) ** 2;
    }
    return den === 0 ? 0 : num / den;
  }

  // ── Persistence ─────────────────────────────────────────────────────────
  async snapshot(
    pondId: string,
    date: string,
    indicators: DiseaseIndicators,
    userId: string,
    cropId?: string,
  ): Promise<DiseaseRiskSnapshot> {
    // Persisting a risk snapshot is field-level output — WRITE_OPERATIONAL.
    const pond = await this.pondsService.findOneAccessible(
      pondId,
      userId,
      'WRITE_OPERATIONAL',
    );
    // The access check covers the pond only; a cropId must be that pond's
    // active cycle or the snapshot could land on another farm's crop (S4).
    if (cropId && cropId !== pond.activeCycleId) {
      throw new BadRequestException("cropId is not this pond's active crop");
    }
    const risks = this.computeRisks(indicators);
    const snap = this.repo.create({
      pondId,
      cropId: cropId ?? null,
      date,
      risks,
    });
    return this.repo.save(snap);
  }

  /**
   * Keep ONE derived snapshot per pond per IST day (the latest read wins), so
   * outcomes (D6) can later be checked against what the app said that day.
   * No access check: the caller already cleared the pond.
   */
  async saveDaily(
    pondId: string,
    cropId: string | null,
    date: string,
    risks: DiseaseRisk[],
  ): Promise<void> {
    const existing = await this.repo.findOne({ where: { pondId, date } });
    await this.repo.save(
      existing
        ? Object.assign(existing, { cropId, risks })
        : this.repo.create({ pondId, cropId, date, risks }),
    );
  }

  async recent(pondId: string, userId: string): Promise<DiseaseRiskSnapshot[]> {
    await this.pondsService.verifyAccess(pondId, userId, 'READ');
    return this.repo.find({
      where: { pondId },
      order: { date: 'DESC' },
      take: 30,
    });
  }

  async latest(pondId: string, userId: string): Promise<DiseaseRiskSnapshot> {
    await this.pondsService.verifyAccess(pondId, userId, 'READ');
    const snap = await this.repo.findOne({
      where: { pondId },
      order: { date: 'DESC' },
    });
    if (!snap) throw new NotFoundException('No risk snapshot for this pond');
    return snap;
  }
}
