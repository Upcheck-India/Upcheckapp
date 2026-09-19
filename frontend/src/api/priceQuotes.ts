import apiClient from './client';
import type { CountPriceBand } from './india';

/** One saved buyer quote (H5). `source: 'harvest'` = derived from a sale. */
export interface FarmPriceQuote {
  id: string;
  farmId: string;
  quotedOn: string;
  buyer: string | null;
  bands: CountPriceBand[];
  source: 'quote' | 'harvest';
  harvestId: string | null;
  createdAt: string;
}

/** GET /price-quotes/farm/:farmId/current — VIEW_FINANCIALS. */
export interface CurrentQuote {
  quote: FarmPriceQuote | null;
  ageDays: number | null;
  /** fresh ≤7d · stale >7d · missing: none, or >30d (Harvest Timing won't use it). */
  status: 'fresh' | 'stale' | 'missing';
  defaultCounts: number[];
}

export const priceQuotesApi = {
  current: (farmId: string) =>
    apiClient.get<CurrentQuote>(`/price-quotes/farm/${farmId}/current`),

  /** Online-only by design: a quote is not loggable pond data. */
  create: (farmId: string, body: { buyer?: string; bands: CountPriceBand[] }) =>
    apiClient.post<FarmPriceQuote>(`/price-quotes/farm/${farmId}`, body),
};

/** Sheet rows: the counts the farm sells, priced from the last quote. */
export const quoteRows = (
  current: CurrentQuote | null,
): { count: string; price: string }[] => {
  const bands = current?.quote?.bands ?? [];
  const counts = current?.defaultCounts?.length
    ? current.defaultCounts
    : [30, 40, 50, 60, 70, 80, 100];
  return counts.map((c) => {
    const band = bands.find((b) => Number(b.count) === Number(c));
    return { count: String(c), price: band ? String(band.price) : '' };
  });
};

/** Rows with a positive count AND price, as bands; blank rows are dropped. */
export const rowsToBands = (
  rows: { count: string; price: string }[],
): CountPriceBand[] => {
  const seen = new Set<number>();
  return rows
    .map((r) => ({ count: Number(r.count), price: Number(r.price) }))
    .filter(
      (b) =>
        Number.isFinite(b.count) && b.count > 0 &&
        Number.isFinite(b.price) && b.price > 0 &&
        !seen.has(b.count) && !!seen.add(b.count),
    )
    .sort((a, b) => a.count - b.count);
};
