import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CropOutcome } from './crop-outcome.entity';
import { EconomicsService } from '../india/economics.service';

export interface OutcomeInputs {
  finalSrPct?: number;
  finalFcr?: number;
  finalCount?: number;
  totalYieldKg?: number;
  areaM2?: number;
  adgMean?: number;
  cultivationDays?: number;
  diseaseOccurred?: string[];
  diseaseOnsetDoc?: number;
  diseaseConfirmedBy?: string;
  emergencyHarvest?: boolean;
  crash?: boolean;
  revenue?: number;
  totalCost?: number;
  /** Which capture modules logged data this cycle, for the completeness score. */
  modulesCovered?: number;
  modulesTotal?: number;
  loggedDays?: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class CropOutcomeService {
  constructor(
    @InjectRepository(CropOutcome)
    private readonly repo: Repository<CropOutcome>,
    private readonly economics: EconomicsService,
  ) {}

  /**
   * Classify the crop (data_collection_audit.md §5). A crash, emergency
   * harvest, or very low survival is a failure; thin profit or middling
   * survival is partial; otherwise success.
   */
  classifyOutcome(
    srPct: number | undefined,
    profit: number,
    crash: boolean,
    emergencyHarvest: boolean,
  ): 'success' | 'partial' | 'failure' {
    if (crash || emergencyHarvest || (srPct !== undefined && srPct < 40)) {
      return 'failure';
    }
    if (profit <= 0 || (srPct !== undefined && srPct < 60)) {
      return 'partial';
    }
    return 'success';
  }

  /**
   * Data-completeness score in [0,1]: half from how many capture modules were
   * used, half from how many culture days were logged.
   */
  dataCompletenessScore(input: {
    modulesCovered?: number;
    modulesTotal?: number;
    loggedDays?: number;
    cultivationDays?: number;
  }): number {
    const moduleFrac =
      input.modulesTotal && input.modulesTotal > 0
        ? Math.min(1, (input.modulesCovered ?? 0) / input.modulesTotal)
        : 0;
    const dayFrac =
      input.cultivationDays && input.cultivationDays > 0
        ? Math.min(1, (input.loggedDays ?? 0) / input.cultivationDays)
        : 0;
    return round2(0.5 * moduleFrac + 0.5 * dayFrac);
  }

  /** Derive the full label record (pure) from aggregated inputs. */
  deriveOutcome(input: OutcomeInputs): Omit<CropOutcome, 'id' | 'cropId' | 'userId' | 'frozenAt'> {
    const totalCost = input.totalCost ?? 0;
    const revenue = input.revenue ?? 0;
    const yieldKg = input.totalYieldKg ?? 0;
    const profit = this.economics.profit(revenue, totalCost);
    const copPerKg = this.economics.coPerKg(totalCost, yieldKg);
    const marginPct = this.economics.marginPct(revenue, totalCost);
    const roiPct = this.economics.roiPct(revenue, totalCost);
    const productivityTPerHa =
      input.areaM2 !== undefined
        ? this.economics.productivityTPerHa(yieldKg, input.areaM2)
        : null;

    return {
      finalSrPct: input.finalSrPct ?? null,
      finalFcr: input.finalFcr ?? null,
      finalCount: input.finalCount ?? null,
      totalYieldKg: yieldKg || null,
      productivityTPerHa: productivityTPerHa === null ? null : round2(productivityTPerHa),
      adgMean: input.adgMean ?? null,
      cultivationDays: input.cultivationDays ?? null,
      diseaseOccurred: input.diseaseOccurred ?? null,
      diseaseOnsetDoc: input.diseaseOnsetDoc ?? null,
      diseaseConfirmedBy: input.diseaseConfirmedBy ?? null,
      emergencyHarvest: !!input.emergencyHarvest,
      crash: !!input.crash,
      revenue: round2(revenue),
      totalCost: round2(totalCost),
      profit: round2(profit),
      copPerKg: round2(copPerKg),
      marginPct: round2(marginPct),
      roiPct: round2(roiPct),
      outcomeClass: this.classifyOutcome(
        input.finalSrPct,
        profit,
        !!input.crash,
        !!input.emergencyHarvest,
      ),
      dataCompletenessScore: this.dataCompletenessScore({
        modulesCovered: input.modulesCovered,
        modulesTotal: input.modulesTotal,
        loggedDays: input.loggedDays,
        cultivationDays: input.cultivationDays,
      }),
    };
  }

  /** Freeze the label record. Immutable — re-freezing a crop is rejected. */
  async freeze(cropId: string, userId: string, input: OutcomeInputs): Promise<CropOutcome> {
    const existing = await this.repo.findOne({ where: { cropId } });
    if (existing) {
      throw new ConflictException('CropOutcome already frozen for this crop');
    }
    const derived = this.deriveOutcome(input);
    return this.repo.save(this.repo.create({ ...derived, cropId, userId }));
  }

  async get(cropId: string, userId: string): Promise<CropOutcome> {
    const row = await this.repo.findOne({ where: { cropId, userId } });
    if (!row) throw new NotFoundException('No frozen outcome for this crop');
    return row;
  }
}
