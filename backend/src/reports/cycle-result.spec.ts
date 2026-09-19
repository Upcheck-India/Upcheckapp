import {
  fcrBand,
  gradeStats,
  inMoltWindow,
  inPeak,
  moltWindowsBetween,
  nextCycleLines,
  srBand,
  worstMortalitySpike,
} from './cycle-result';

describe('cycle-result pure pieces (H3)', () => {
  it('bands: FCR ≤1.3 good / ≤1.6 fair; SR ≥80 / ≥65', () => {
    expect([1.3, 1.31, 1.6, 1.61].map(fcrBand)).toEqual(['good', 'fair', 'fair', 'poor']);
    expect([80, 79.9, 65, 64.9].map(srBand)).toEqual(['good', 'fair', 'fair', 'poor']);
    expect(fcrBand(null)).toBeNull();
  });

  it('avg count and grade mix are weight-weighted', () => {
    const r = gradeStats([
      {
        harvestDate: '2026-09-10', weightKg: 1000, averageSize: null, pieces: null,
        piecesEstimated: false, rejectedKg: null, rejectedReason: null,
        grades: [{ countPerKg: 40, weightKg: 800 }, { countPerKg: 60, weightKg: 200 }],
      },
    ]);
    expect(r.avgCount).toBe(44);
    expect(r.gradeMix).toEqual([
      { countPerKg: 40, kg: 800, pct: 80 },
      { countPerKg: 60, kg: 200, pct: 20 },
    ]);
  });

  it('finds the 26 Sep 2026 full-moon peak (spec §4)', () => {
    const ws = moltWindowsBetween('2026-09-01', '2026-09-30');
    expect(inPeak(ws, '2026-09-26')).toBe(true);
    expect(inPeak(ws, '2026-09-19')).toBe(false);
    expect(inMoltWindow(ws, '2026-09-28')).toBe(true); // post
  });

  it('the worst mortality spike day, or null with none', () => {
    const quiet = [1, 2, 3, 4, 5, 6, 7].map((d) => ({ day: `2026-07-0${d}`, count: 5 }));
    expect(worstMortalitySpike(quiet)).toBeNull();
    expect(worstMortalitySpike([...quiet, { day: '2026-07-08', count: 60 }])).toBe('2026-07-08');
  });

  it('next-cycle lines only from real deltas, at most three', () => {
    const none = nextCycleLines({
      fcr: 1.2, feedKg: 1200, harvestedKg: 1000,
      survival: { pct: 50, low: null, high: null, estimated: false },
      spikeDay: null, softShellRejectedKgInMolt: 0,
    });
    expect(none).toEqual([]);

    const all = nextCycleLines({
      fcr: 2, feedKg: 2000, harvestedKg: 1000,
      survival: { pct: 50, low: 45, high: 55, estimated: true },
      spikeDay: '2026-07-08', softShellRejectedKgInMolt: 12,
    });
    expect(all.map((l) => l.key)).toEqual(['feedOver', 'mortalitySpike', 'softShellMolt']);
    expect(all[2].params).toEqual({ kg: 12 });

    // Survival low only at a point estimate whose range reaches "fair" is not low.
    const unsure = nextCycleLines({
      fcr: 1.2, feedKg: 1200, harvestedKg: 1000,
      survival: { pct: 62, low: 56, high: 68, estimated: true },
      spikeDay: '2026-07-08', softShellRejectedKgInMolt: 0,
    });
    expect(unsure).toEqual([]);
  });
});
