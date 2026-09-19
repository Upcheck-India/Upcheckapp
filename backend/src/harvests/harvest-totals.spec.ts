import { harvestTotals } from './harvest-totals';

describe('harvestTotals', () => {
  it.each([
    [
      'two graded, priced lines',
      [
        { weightKg: 820, countPerKg: 40, pricePerKg: 430 },
        { weightKg: 160, countPerKg: 55, pricePerKg: 340 },
      ],
      15,
      { weightKg: 980, salePriceTotal: 407000, pieces: 41600, piecesEstimated: false, averageSize: 23.56 },
    ],
    [
      'a missing price → null total (never a partial sum)',
      [
        { weightKg: 500, countPerKg: 40, pricePerKg: 430 },
        { weightKg: 100, countPerKg: 60, pricePerKg: null },
      ],
      null,
      { weightKg: 600, salePriceTotal: null, pieces: 26000, piecesEstimated: false },
    ],
    [
      'mixed graded + ungraded → pieces estimated from ABW',
      [
        { weightKg: 400, countPerKg: 40, pricePerKg: 400 },
        { weightKg: 100, countPerKg: null, pricePerKg: 300 },
      ],
      20,
      { weightKg: 500, salePriceTotal: 190000, pieces: 25000, piecesEstimated: true, averageSize: 25 },
    ],
    [
      'no counts and no ABW → pieces unknown',
      [{ weightKg: 300, pricePerKg: 400 }],
      null,
      { weightKg: 300, salePriceTotal: 120000, pieces: null, piecesEstimated: false, averageSize: null },
    ],
  ])('%s', (_name, grades, abw, expected) => {
    expect(harvestTotals(grades as any, abw as any)).toEqual(expect.objectContaining(expected));
  });
});
