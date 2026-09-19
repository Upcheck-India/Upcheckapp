/**
 * One graded line of a buyer's weighing slip (harvest-and-molt H1).
 * `countPerKg` null = the buyer did not grade it; `pricePerKg` null = no price
 * yet (entered by someone without VIEW_FINANCIALS, or not settled).
 */
export interface GradeLine {
  countPerKg?: number | null;
  weightKg: number;
  pricePerKg?: number | null;
}

export interface HarvestTotals {
  weightKg: number;
  /** Null when any line lacks a price — a partial sum would understate revenue. */
  salePriceTotal: number | null;
  /** Weighted mean g/piece = 1000 / weighted count, over the graded lines. */
  averageSize: number | null;
  pieces: number | null;
  /** True when `pieces` came from ABW, not from the buyer's counts. */
  piecesEstimated: boolean;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * The harvest row's aggregate, derived from its grade lines. The row stays the
 * aggregate so every existing reader (P&L, reports, money) keeps working.
 * `abwG` is the latest weighed ABW at the harvest date, used only when some
 * line has no count.
 */
export function harvestTotals(
  grades: GradeLine[],
  abwG: number | null,
): HarvestTotals {
  const weightKg = r3(grades.reduce((s, g) => s + Number(g.weightKg), 0));
  const allPriced = grades.length > 0 && grades.every((g) => g.pricePerKg != null);
  const salePriceTotal = allPriced
    ? r2(grades.reduce((s, g) => s + Number(g.weightKg) * Number(g.pricePerKg), 0))
    : null;

  const graded = grades.filter((g) => g.countPerKg != null && Number(g.countPerKg) > 0);
  const gradedKg = graded.reduce((s, g) => s + Number(g.weightKg), 0);
  const gradedPieces = graded.reduce(
    (s, g) => s + Number(g.weightKg) * Number(g.countPerKg),
    0,
  );
  const averageSize = gradedPieces > 0 ? r2((1000 * gradedKg) / gradedPieces) : null;

  const allCounted = grades.length > 0 && graded.length === grades.length;
  if (allCounted) {
    return { weightKg, salePriceTotal, averageSize, pieces: Math.round(gradedPieces), piecesEstimated: false };
  }
  if (abwG != null && abwG > 0 && weightKg > 0) {
    return {
      weightKg,
      salePriceTotal,
      averageSize,
      pieces: Math.round((weightKg * 1000) / abwG),
      piecesEstimated: true,
    };
  }
  return { weightKg, salePriceTotal, averageSize, pieces: null, piecesEstimated: false };
}
