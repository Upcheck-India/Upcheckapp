import { Injectable } from '@nestjs/common';

/**
 * India unit & money conversions (jala_teardown_india.md §1).
 *
 * Pure functions — UI accepts acres/cents/lakh and displays **count**, but all
 * engines compute in m² / PL / grams. These are the single source of truth for
 * those conversions so every screen and engine agrees.
 *
 * Hard-coded factors (india §1):
 *   1 acre = 4046.86 m² · 1 cent = 40.4686 m² · 1 hectare = 10,000 m²
 *   1 lakh = 100,000 · 1 crore = 10,000,000
 *   size (count) = 1000 / ABW_g
 */
@Injectable()
export class UnitsService {
  static readonly ACRE_M2 = 4046.86;
  static readonly CENT_M2 = 40.4686;
  static readonly HECTARE_M2 = 10000;
  static readonly LAKH = 100000;
  static readonly CRORE = 10000000;

  // ── Area ──────────────────────────────────────────────────────────────
  acresToM2(acres: number): number {
    return acres * UnitsService.ACRE_M2;
  }
  m2ToAcres(m2: number): number {
    return m2 / UnitsService.ACRE_M2;
  }
  centsToM2(cents: number): number {
    return cents * UnitsService.CENT_M2;
  }
  m2ToCents(m2: number): number {
    return m2 / UnitsService.CENT_M2;
  }
  hectaresToM2(ha: number): number {
    return ha * UnitsService.HECTARE_M2;
  }
  m2ToHectares(m2: number): number {
    return m2 / UnitsService.HECTARE_M2;
  }

  // ── Stocking counts ──────────────────────────────────────────────────
  lakhToCount(lakh: number): number {
    return lakh * UnitsService.LAKH;
  }
  countToLakh(count: number): number {
    return count / UnitsService.LAKH;
  }

  // ── Size ↔ count (the universal Indian harvest unit) ──────────────────
  /** count (pieces/kg) from average body weight in grams. */
  abwToCount(abwG: number): number {
    if (abwG <= 0) return 0;
    return 1000 / abwG;
  }
  /** ABW (g) from count (pieces/kg). */
  countToAbw(count: number): number {
    if (count <= 0) return 0;
    return 1000 / count;
  }

  // ── Density ───────────────────────────────────────────────────────────
  /** Stocking density PL/m² from total seed and pond area. */
  stockingDensity(totalSeed: number, areaM2: number): number {
    if (areaM2 <= 0) return 0;
    return totalSeed / areaM2;
  }

  /**
   * Convert an area expressed in any supported Indian unit to m².
   * Unknown units are returned unchanged (assumed already m²).
   */
  toM2(value: number, unit: 'acre' | 'cent' | 'hectare' | 'm2'): number {
    switch (unit) {
      case 'acre':
        return this.acresToM2(value);
      case 'cent':
        return this.centsToM2(value);
      case 'hectare':
        return this.hectaresToM2(value);
      default:
        return value;
    }
  }
}
