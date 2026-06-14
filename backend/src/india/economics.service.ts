import { Injectable } from '@nestjs/common';

/** A region's count→₹/kg price point. */
export interface CountPriceBand {
  count: number;
  price: number;
}

export interface CropEconomics {
  totalCost: number;
  harvestBiomassKg: number;
  revenue: number;
  coPerKg: number;
  breakEvenCount: number | null;
  profit: number;
  marginPct: number;
  roiPct: number;
  productivityTPerHa: number | null;
}

/**
 * Indian INR economics (jala_teardown_india.md §8): Cost-of-Production ₹/kg,
 * break-even count, profit/margin/ROI, productivity t/ha. Pure functions —
 * the headline numbers farmers, banks and insurers want.
 */
@Injectable()
export class EconomicsService {
  /** Cost of production ₹/kg = total cost / harvested biomass. */
  coPerKg(totalCost: number, harvestBiomassKg: number): number {
    if (harvestBiomassKg <= 0) return 0;
    return totalCost / harvestBiomassKg;
  }

  profit(revenue: number, totalCost: number): number {
    return revenue - totalCost;
  }

  marginPct(revenue: number, totalCost: number): number {
    if (revenue <= 0) return 0;
    return ((revenue - totalCost) / revenue) * 100;
  }

  roiPct(revenue: number, totalCost: number): number {
    if (totalCost <= 0) return 0;
    return ((revenue - totalCost) / totalCost) * 100;
  }

  /** Productivity t/ha. 1 kg/m² = 10 t/ha, so t/ha = biomassKg/areaM2 × 10. */
  productivityTPerHa(harvestBiomassKg: number, areaM2: number): number | null {
    if (areaM2 <= 0) return null;
    return (harvestBiomassKg / areaM2) * 10;
  }

  /**
   * Break-even count: the count band at which ₹/kg price equals the CoP/kg.
   * Prices fall as count rises (bigger shrimp = lower count = higher ₹/kg), so
   * we find the adjacent bands that bracket CoP in price and interpolate the
   * count linearly (india §8 "break-even at count X").
   *
   * Returns null with fewer than two bands. When CoP lies outside the priced
   * range it clamps to the nearest band's count (can't break even in-range).
   */
  breakEvenCount(coPerKg: number, bands: CountPriceBand[]): number | null {
    if (!bands || bands.length < 2) return null;
    const sorted = [...bands].sort((a, b) => a.count - b.count); // count↑, price↓
    for (let i = 0; i < sorted.length - 1; i++) {
      const hi = sorted[i]; // lower count, higher price
      const lo = sorted[i + 1]; // higher count, lower price
      if (coPerKg <= hi.price && coPerKg >= lo.price && hi.price !== lo.price) {
        const frac = (hi.price - coPerKg) / (hi.price - lo.price);
        return hi.count + frac * (lo.count - hi.count);
      }
    }
    // Out of range: CoP above the highest price → need an even bigger size than
    // priced (clamp to smallest count); below the lowest → clamp to largest.
    if (coPerKg > sorted[0].price) return sorted[0].count;
    return sorted[sorted.length - 1].count;
  }

  /** Full per-crop economics roll-up. */
  compute(input: {
    totalCost: number;
    harvestBiomassKg: number;
    revenue: number;
    areaM2?: number;
    priceBands?: CountPriceBand[];
  }): CropEconomics {
    const coPerKg = this.coPerKg(input.totalCost, input.harvestBiomassKg);
    return {
      totalCost: input.totalCost,
      harvestBiomassKg: input.harvestBiomassKg,
      revenue: input.revenue,
      coPerKg,
      breakEvenCount: input.priceBands
        ? this.breakEvenCount(coPerKg, input.priceBands)
        : null,
      profit: this.profit(input.revenue, input.totalCost),
      marginPct: this.marginPct(input.revenue, input.totalCost),
      roiPct: this.roiPct(input.revenue, input.totalCost),
      productivityTPerHa:
        input.areaM2 !== undefined
          ? this.productivityTPerHa(input.harvestBiomassKg, input.areaM2)
          : null,
    };
  }
}
