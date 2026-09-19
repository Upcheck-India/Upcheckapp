import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExpensesService } from '../finances/expenses.service';
import { Harvest } from '../harvests/harvest.entity';
import { Crop } from '../crops/crop.entity';
import { EconomicsService } from '../india/economics.service';
import { PricingService } from '../india/pricing.service';
import { FarmAccessService } from '../farm-access/farm-access.service';

export interface CropPnl {
  cropId: string;
  totalCost: number;
  costBreakdown: Record<string, number>;
  revenue: number;
  harvestBiomassKg: number;
  coPerKg: number;
  breakEvenCount: number | null;
  profit: number;
  marginPct: number;
  roiPct: number;
  productivityTPerHa: number | null;
  harvestComplete: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Crop P&L / Cost Accounting + Break-Even (farmer_features_spec.md §5).
 * Aggregates the expense ledger and harvest revenue for a crop and rolls them
 * through the India {@link EconomicsService}. The headline numbers banks,
 * insurers and farmers all want.
 */
@Injectable()
export class PnlService {
  constructor(
    @InjectRepository(Harvest)
    private readonly harvestRepo: Repository<Harvest>,
    @InjectRepository(Crop)
    private readonly cropRepo: Repository<Crop>,
    private readonly economics: EconomicsService,
    private readonly pricing: PricingService,
    private readonly farmAccess: FarmAccessService,
    private readonly expenses: ExpensesService,
  ) {}

  async computeCropPnl(
    cropId: string,
    userId: string,
    opts?: { areaM2?: number },
  ): Promise<CropPnl> {
    // Authorize via VIEW_FINANCIALS on the crop's pond — same capability as
    // expenses.getCycleFinancials, so an owner OR manager who can see the
    // cycle financials can also see the P&L rollup of the same crop (was
    // owner-only, which 403'd managers on their own farm's financials).
    const crop = await this.cropRepo.findOne({
      where: { id: cropId },
      relations: ['pond'],
    });
    if (!crop) {
      throw new NotFoundException(`Crop with ID ${cropId} not found`);
    }
    await this.farmAccess.assertCanAccessPond(
      userId,
      crop.pondId,
      'VIEW_FINANCIALS',
    );

    // C5: ONE basis for cycle money. `getCycleFinancials` counts the expense
    // ledger AND the pond-tagged Money-screen transactions in the cycle's
    // window; this used to read `expenses` alone, so Crop P&L and Cycle
    // financials printed two different profits for one cycle.
    const fin = await this.expenses.getCycleFinancials(cropId, userId);
    const totalCost = fin.totalExpenses;
    const revenue = fin.totalRevenue;
    const harvestBiomassKg = fin.totalHarvestKg;
    const costBreakdown: Record<string, number> = {};
    for (const [cat, amt] of Object.entries(fin.expensesByCategory)) {
      costBreakdown[cat] = round2(Number(amt) || 0);
    }
    // Only a SOLD full harvest completes the cycle's numbers.
    const hasFullHarvest =
      (await this.harvestRepo.count({
        where: { cropId, status: 'sold', harvestType: 'full' },
      })) > 0;

    // C3: no caller passed areaM2, so t/ha was always null. Default to the
    // pond's own area (every caller gets it, none has to remember).
    const pondArea = Number(
      crop.pond?.overrideAreaM2 ?? crop.pond?.calculatedAreaM2,
    );
    const areaM2 = opts?.areaM2 ?? (pondArea > 0 ? pondArea : undefined);

    // H5: break-even count against the farm's own current buyer quote (≤30
    // days old). No usable quote → null, never a regional guess.
    const priceBands = crop.pond?.farmId
      ? await this.pricing.usableBands(crop.pond.farmId)
      : undefined;

    const econ = this.economics.compute({
      totalCost: round2(totalCost),
      harvestBiomassKg: round2(harvestBiomassKg),
      revenue: round2(revenue),
      areaM2,
      priceBands,
    });

    return {
      cropId,
      totalCost: round2(totalCost),
      costBreakdown,
      revenue: round2(revenue),
      harvestBiomassKg: round2(harvestBiomassKg),
      coPerKg: round2(econ.coPerKg),
      breakEvenCount: econ.breakEvenCount,
      // The cycle-financials number itself, not a re-derivation that could
      // round a paisa apart: one profit per cycle, everywhere.
      profit: fin.netProfit,
      marginPct: round2(econ.marginPct),
      roiPct: round2(econ.roiPct),
      productivityTPerHa:
        econ.productivityTPerHa === null
          ? null
          : round2(econ.productivityTPerHa),
      harvestComplete: hasFullHarvest,
    };
  }
}
