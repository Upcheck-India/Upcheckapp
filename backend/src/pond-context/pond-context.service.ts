import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SamplingData } from '../sampling/sampling-data.entity';
import { MortalityRecord } from '../mortality/mortality-record.entity';
import { FeedRecord } from '../feed-records/feed-record.entity';
import { FeedingTrayCheck } from '../feeding-tray-checks/feeding-tray-check.entity';
import { WaterQualityRecord } from '../water-quality/water-quality-record.entity';
import { PondsService } from '../ponds/ponds.service';
import { CropsService } from '../crops/crops.service';
import { ShrimpCalculationsService } from '../shrimp-calculations/shrimp-calculations.service';

export interface PondContext {
  pondId: string;
  cropId: string | null;
  /** Cultured species (free text, e.g. "Penaeus monodon") — tunes the engines. */
  species: string | null;
  areaM2: number | null;
  /** Total installed aerator power (HP) — auto-fills the Aeration optimizer. */
  installedAeratorHp: number | null;
  doc: number | null;
  /**
   * Latest value of EACH water-quality parameter. Daily params (DO, pH,
   * salinity, temp — probe-measured) come from the newest entry; periodic
   * chemistry (ammonia, nitrite, nitrate, alkalinity — test-kit/lab) is the
   * latest NON-NULL value, carried forward from whenever it was last measured.
   */
  waterQuality: {
    dissolvedOxygen: number | null;
    ph: number | null;
    temperature: number | null;
    salinity: number | null;
    ammonia: number | null;
    nitrite: number | null;
    nitrate: number | null;
    alkalinity: number | null;
    /** When the daily probe params were last logged. */
    recordedAt: string | null;
    /** When ammonia (chemistry) was last measured — may be older. */
    chemistryAsOf: string | null;
  } | null;
  /** Free (un-ionised) NH3 derived from latest ammonia(TAN)+pH+temp. */
  freeAmmoniaMgL: number | null;
  /** Latest sampled average body weight (g). */
  abwG: number | null;
  /** Mortality-adjusted live population estimate. */
  livePopulation: number | null;
  /** Standing biomass estimate (kg). */
  biomassKg: number | null;
  /** Crop targets the engines consume. */
  crop: {
    stockingCount: number | null;
    carryingCapacityKgM2: number | null;
    feedPriceRpPerKg: number | null;
    targetSrPercent: number | null;
    targetSize: number | null;
    targetCultivationDays: number | null;
  } | null;
  // ── Continuous loop metrics (feed in → tray feedback → FCR) ──
  /** Cumulative feed fed this crop (kg). */
  cumulativeFeedKg: number | null;
  /** Running FCR = cumulative feed / standing biomass (jala §10). */
  runningFcr: number | null;
  /** Latest feeding-tray residue → prefills the Feed Advisor's tray input. */
  latestTrayResidue: 'empty' | 'few_left' | 'a_lot_left' | null;
  /** Timestamps of the most recent feed log / tray check (for "done today"). */
  lastFeedAt: string | null;
  lastTrayAt: string | null;
  /** When the latest sampling (ABW) was taken. */
  samplingAt: string | null;
  /**
   * Data confidence the engines attach to their output — driven by how complete
   * and fresh the pond's logged inputs are. More current values → higher score.
   */
  confidence: DataConfidence;
}

export interface DataConfidence {
  score: number; // 0..100
  band: 'high' | 'medium' | 'low';
  /** Inputs not logged yet (raise these to improve accuracy). */
  missing: string[];
  /** Inputs present but older than their freshness window. */
  stale: string[];
}

interface ConfidenceFactor {
  key: string;
  present: boolean;
  ageDays: number | null;
  weight: number;
  freshWindowDays: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Single source of the farmer's latest inputs for a pond (PRD "capture once,
 * reuse everywhere"). Engines read this snapshot instead of re-asking the
 * farmer for DO / NH3 / temp / ABW / population they already logged.
 */
@Injectable()
export class PondContextService {
  constructor(
    @InjectRepository(SamplingData)
    private readonly samplingRepo: Repository<SamplingData>,
    @InjectRepository(MortalityRecord)
    private readonly mortalityRepo: Repository<MortalityRecord>,
    @InjectRepository(FeedRecord)
    private readonly feedRepo: Repository<FeedRecord>,
    @InjectRepository(FeedingTrayCheck)
    private readonly trayRepo: Repository<FeedingTrayCheck>,
    @InjectRepository(WaterQualityRecord)
    private readonly wqRepo: Repository<WaterQualityRecord>,
    private readonly pondsService: PondsService,
    private readonly cropsService: CropsService,
    private readonly calc: ShrimpCalculationsService,
  ) {}

  /**
   * Resolve each water-quality parameter to its latest NON-NULL value across
   * recent records (newest first). Daily probe params surface from the newest
   * entry; periodic chemistry carries forward from whenever it was last
   * measured — so a 4-day-old ammonia reading still reaches the engines instead
   * of being hidden behind today's probe-only entry.
   */
  resolveWaterQuality(records: WaterQualityRecord[]): PondContext['waterQuality'] {
    if (!records.length) return null;
    const latest = <K extends keyof WaterQualityRecord>(key: K) => {
      for (const r of records) {
        const v = r[key] as unknown as number | null | undefined;
        if (v != null) return { value: Number(v), at: r.recordedAt };
      }
      return { value: null as number | null, at: null as Date | null };
    };
    const amm = latest('ammonia');
    return {
      dissolvedOxygen: latest('dissolvedOxygen').value,
      ph: latest('ph').value,
      temperature: latest('temperature').value,
      salinity: latest('salinity').value,
      ammonia: amm.value,
      nitrite: latest('nitrite').value,
      nitrate: latest('nitrate').value,
      alkalinity: latest('alkalinity').value,
      recordedAt: records[0].recordedAt ? new Date(records[0].recordedAt).toISOString() : null,
      chemistryAsOf: amm.at ? new Date(amm.at).toISOString() : null,
    };
  }

  /** Live population = stocking count − cumulative (estimated) mortality, ≥ 0. */
  estimateLivePopulation(
    stockingCount: number | null | undefined,
    cumulativeMortality: number,
  ): number | null {
    if (stockingCount == null) return null;
    return Math.max(0, Math.round(stockingCount - cumulativeMortality));
  }

  /** Standing biomass (kg) = population × ABW / 1000. */
  biomass(livePopulation: number | null, abwG: number | null): number | null {
    if (livePopulation == null || abwG == null) return null;
    return round2((livePopulation * abwG) / 1000);
  }

  /** Running FCR = cumulative feed / standing biomass (jala §10). */
  runningFcr(cumulativeFeedKg: number, biomassKg: number | null): number | null {
    if (biomassKg == null || biomassKg <= 0) return null;
    return round2(cumulativeFeedKg / biomassKg);
  }

  /**
   * Data-confidence score from input completeness + freshness. A present value
   * within its freshness window scores full weight; an absent one scores 0; a
   * stale one decays toward a 0.3 floor. So "all values fed and current" → high
   * confidence, "ammonia missing or 3 weeks old" → lower.
   */
  computeConfidence(factors: ConfidenceFactor[]): DataConfidence {
    const freshness = (ageDays: number | null, window: number) => {
      if (ageDays == null) return 0;
      if (ageDays <= window) return 1;
      return Math.max(0.3, 1 - (ageDays - window) / window);
    };
    let got = 0;
    let total = 0;
    const missing: string[] = [];
    const stale: string[] = [];
    for (const f of factors) {
      total += f.weight;
      if (!f.present) {
        missing.push(f.key);
        continue;
      }
      const fr = freshness(f.ageDays, f.freshWindowDays);
      got += f.weight * fr;
      if (fr < 1) stale.push(f.key);
    }
    const score = total > 0 ? Math.round((got / total) * 100) : 0;
    const band: DataConfidence['band'] = score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low';
    return { score, band, missing, stale };
  }

  async getContext(pondId: string, userId: string): Promise<PondContext> {
    const pond = await this.pondsService.findOne(pondId, userId); // ownership
    const areaM2 = Number(pond.overrideAreaM2 ?? pond.calculatedAreaM2) || null;
    const installedAeratorHp = pond.installedAeratorHp != null ? Number(pond.installedAeratorHp) : null;
    const cropId = pond.activeCycleId ?? null;

    const crop = cropId ? await this.cropsService.findOne(cropId, userId) : null;

    // Latest non-null value per WQ parameter across recent records.
    const wqRecords = await this.wqRepo.find({
      where: { pondId },
      order: { recordedAt: 'DESC' },
      take: 60,
    });
    const wq = this.resolveWaterQuality(wqRecords);

    // Latest sampling for this pond (prefer the active crop).
    const sampling = await this.samplingRepo.findOne({
      where: cropId ? { pondId, cropId } : { pondId },
      order: { samplingDate: 'DESC' },
    });
    const abwG = sampling?.mbwG != null ? Number(sampling.mbwG) : null;
    const samplingAt = sampling?.samplingDate ? new Date(sampling.samplingDate).toISOString() : null;

    // Cumulative estimated mortality for the active crop.
    let cumulativeMortality = 0;
    if (cropId) {
      const deaths = await this.mortalityRepo.find({ where: { cropId } });
      cumulativeMortality = deaths.reduce(
        (a, d) => a + (Number((d as any).estimatedTotal) || 0),
        0,
      );
    }
    const livePopulation = this.estimateLivePopulation(
      crop?.stockingCount,
      cumulativeMortality,
    );

    const freeAmmoniaMgL =
      wq?.ammonia != null && wq?.ph != null && wq?.temperature != null
        ? this.calc.calculateFreeAmmonia(
            Number(wq.ammonia),
            Number(wq.ph),
            Number(wq.temperature),
            wq?.salinity != null ? Number(wq.salinity) : 0,
          ).unionizedAmmonia
        : null;

    const biomassKg = this.biomass(livePopulation, abwG);

    // Continuous loop metrics: cumulative feed, running FCR, latest tray residue.
    let cumulativeFeedKg: number | null = null;
    let latestTrayResidue: PondContext['latestTrayResidue'] = null;
    let lastFeedAt: string | null = null;
    let lastTrayAt: string | null = null;
    if (cropId) {
      const feeds = await this.feedRepo.find({ where: { cropId } });
      cumulativeFeedKg = round2(
        feeds.reduce((a, f) => a + (Number(f.quantityKg) || 0), 0),
      );
      const lastFeed = feeds.reduce<Date | null>((latest, f) => {
        const d = f.recordedAt ? new Date(f.recordedAt) : null;
        return d && (!latest || d > latest) ? d : latest;
      }, null);
      lastFeedAt = lastFeed ? lastFeed.toISOString() : null;

      const tray = await this.trayRepo.findOne({
        where: { cropId },
        order: { checkDate: 'DESC' },
      });
      const status = tray?.remainingFeedStatus;
      if (status === 'empty' || status === 'few_left' || status === 'a_lot_left') {
        latestTrayResidue = status;
      }
      lastTrayAt = tray?.checkDate ? new Date(tray.checkDate).toISOString() : null;
    }
    const runningFcr =
      cumulativeFeedKg != null ? this.runningFcr(cumulativeFeedKg, biomassKg) : null;

    // Confidence from input completeness + freshness. Daily probe params have a
    // 1-day window; weekly chemistry ~10d; ABW ~14d.
    const now = Date.now();
    const ageDays = (iso: string | null) =>
      iso ? (now - new Date(iso).getTime()) / 86400000 : null;
    const confidence = this.computeConfidence([
      { key: 'DO', present: wq?.dissolvedOxygen != null, ageDays: ageDays(wq?.recordedAt ?? null), weight: 2, freshWindowDays: 1 },
      { key: 'pH', present: wq?.ph != null, ageDays: ageDays(wq?.recordedAt ?? null), weight: 1.5, freshWindowDays: 1 },
      { key: 'Temperature', present: wq?.temperature != null, ageDays: ageDays(wq?.recordedAt ?? null), weight: 1.5, freshWindowDays: 1 },
      { key: 'Salinity', present: wq?.salinity != null, ageDays: ageDays(wq?.recordedAt ?? null), weight: 1, freshWindowDays: 1 },
      { key: 'Ammonia', present: wq?.ammonia != null, ageDays: ageDays(wq?.chemistryAsOf ?? null), weight: 2, freshWindowDays: 10 },
      { key: 'Alkalinity', present: wq?.alkalinity != null, ageDays: ageDays(wq?.chemistryAsOf ?? null), weight: 1, freshWindowDays: 14 },
      { key: 'Body weight', present: abwG != null, ageDays: ageDays(samplingAt), weight: 2, freshWindowDays: 14 },
      { key: 'Population', present: livePopulation != null, ageDays: 0, weight: 1, freshWindowDays: 9999 },
    ]);

    return {
      pondId,
      cropId,
      species: (crop?.species?.scientificName ?? crop?.speciesType) ?? null,
      areaM2,
      installedAeratorHp,
      doc: crop?.computedDOC ?? null,
      waterQuality: wq,
      freeAmmoniaMgL,
      abwG,
      livePopulation,
      biomassKg,
      crop: crop
        ? {
            stockingCount: crop.stockingCount != null ? Number(crop.stockingCount) : null,
            carryingCapacityKgM2: crop.carryingCapacityKgM2 != null ? Number(crop.carryingCapacityKgM2) : null,
            feedPriceRpPerKg: crop.feedPriceRpPerKg != null ? Number(crop.feedPriceRpPerKg) : null,
            targetSrPercent: crop.targetSrPercent != null ? Number(crop.targetSrPercent) : null,
            targetSize: crop.targetSize != null ? Number(crop.targetSize) : null,
            targetCultivationDays: crop.targetCultivationDays != null ? Number(crop.targetCultivationDays) : null,
          }
        : null,
      cumulativeFeedKg,
      runningFcr,
      latestTrayResidue,
      lastFeedAt,
      lastTrayAt,
      samplingAt,
      confidence,
    };
  }
}
