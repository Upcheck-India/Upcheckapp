import apiClient from './client';

// ──────────────────────────────────────────────────────────────────────────────
// India unit conversions (client-side mirror of backend UnitsService).
// UI accepts acres/cents/lakh and shows count; engines use m²/PL/grams.
// ──────────────────────────────────────────────────────────────────────────────

export const ACRE_M2 = 4046.86;
export const CENT_M2 = 40.4686;
export const HECTARE_M2 = 10000;
export const LAKH = 100000;

export const units = {
  acresToM2: (a: number) => a * ACRE_M2,
  m2ToAcres: (m2: number) => m2 / ACRE_M2,
  centsToM2: (c: number) => c * CENT_M2,
  hectaresToM2: (h: number) => h * HECTARE_M2,
  lakhToCount: (l: number) => l * LAKH,
  countToLakh: (n: number) => n / LAKH,
  /** count (pcs/kg) from ABW grams: 1000/ABW. */
  abwToCount: (abwG: number) => (abwG > 0 ? 1000 / abwG : 0),
  /** ABW grams from count: 1000/count. */
  countToAbw: (count: number) => (count > 0 ? 1000 / count : 0),
  stockingDensity: (totalSeed: number, areaM2: number) =>
    areaM2 > 0 ? totalSeed / areaM2 : 0,
};

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface CountPriceBand {
  count: number;
  price: number;
}

export interface PriceFeed {
  id: string;
  region: string;
  date: string;
  prices: Record<string, number>;
  source: string;
  enteredBy: string | null;
  createdAt: string;
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

export interface ComputeEconomicsInput {
  totalCost: number;
  harvestBiomassKg: number;
  revenue: number;
  areaM2?: number;
  priceBands?: CountPriceBand[];
  region?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Client
// ──────────────────────────────────────────────────────────────────────────────

export const indiaApi = {
  /** Roll up crop economics (CoP/kg, break-even count, profit/margin/ROI, t/ha). */
  computeEconomics: (input: ComputeEconomicsInput) =>
    apiClient.post<CropEconomics>('/india/economics', input),

  /** ₹/kg for an achieved count in a region (nearest band, latest feed). */
  priceForCount: (region: string, count: number) =>
    apiClient.get<{ region: string; count: number; pricePerKg: number | null }>(
      '/india/price',
      { params: { region, count } },
    ),

  /** Recent crowdsourced price feeds for a region. */
  listFeeds: (region: string) =>
    apiClient.get<PriceFeed[]>('/india/price-feeds', { params: { region } }),

  /** Submit a crowdsourced price feed. */
  createFeed: (input: {
    region: string;
    date: string;
    prices: Record<string, number>;
    source?: string;
  }) => apiClient.post<PriceFeed>('/india/price-feeds', input),
};
