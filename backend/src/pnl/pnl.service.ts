import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from '../finances/expense.entity';
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
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(Harvest)
    private readonly harvestRepo: Repository<Harvest>,
    @InjectRepository(Crop)
    private readonly cropRepo: Repository<Crop>,
    private readonly economics: EconomicsService,
    private readonly pricing: PricingService,
    private readonly farmAccess: FarmAccessService,
  ) {}

  async computeCropPnl(
    cropId: string,
    userId: string,
    opts?: { region?: string; areaM2?: number },
  ): Promise<CropPnl> {
    // Authorize via VIEW_FINANCIALS on the crop's pond — same capability as
    // expenses.getCycleFinancials, so an owner OR manager who can see the
    // cycle financials can also see the P&L rollup of the same crop (was
    // owner-only, which 403'd managers on their own farm's financials).
    const crop = await this.cropRepo.findOne({ where: { id: cropId } });
    if (!crop) {
      throw new NotFoundException(`Crop with ID ${cropId} not found`);
    }
    await this.farmAccess.assertCanAccessPond(
      userId,
      crop.pondId,
      'VIEW_FINANCIALS',
    );

    const expenses = await this.expenseRepo.find({ where: { cropId } });
    const harvests = await this.harvestRepo.find({ where: { cropId } });

    const costBreakdown: Record<string, number> = {};
    let totalCost = 0;
    for (const e of expenses) {
      const amt = Number(e.amount) || 0;
      totalCost += amt;
      costBreakdown[e.category] = round2(
        (costBreakdown[e.category] ?? 0) + amt,
      );
    }

    let revenue = 0;
    let harvestBiomassKg = 0;
    let hasFullHarvest = false;
    for (const h of harvests) {
      revenue += Number(h.salePriceTotal) || 0;
      harvestBiomassKg += Number(h.weightKg) || 0;
      if (h.harvestType === 'full') hasFullHarvest = true;
    }

    let priceBands;
    if (opts?.region) {
      const feed = await this.pricing.latestForRegion(opts.region);
      priceBands = feed ? this.pricing.bandsFromPrices(feed.prices) : undefined;
    }

    const econ = this.economics.compute({
      totalCost: round2(totalCost),
      harvestBiomassKg: round2(harvestBiomassKg),
      revenue: round2(revenue),
      areaM2: opts?.areaM2,
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
      profit: round2(econ.profit),
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
