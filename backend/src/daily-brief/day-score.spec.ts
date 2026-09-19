import { CAP, DayScoreInput, bandFor, combineScores, combineValues, computeDayScore } from './day-score';
import { DayScore } from './daily-brief.types';

const mm = (min: number, max = min) => ({ min, max });

/** A perfect, fully logged day. Override pieces per test. */
const base = (over: Partial<DayScoreInput> = {}): DayScoreInput => ({
  pondId: 'p1',
  species: 'Penaeus vannamei',
  water: { do: mm(5.5, 7), ph: mm(7.8, 8.1), temperature: mm(29, 30), salinity: mm(15), alkalinity: mm(120), ammonia: mm(0.05), freeNh3: mm(0.01), nitrite: mm(0.2) },
  feed: { logged: true, kg: 20, prev3DayAvgKg: 20, trayWorst: 'few_left' },
  health: { mortality: 5, livePopulation: 100000, mortality7DayAvg: 4, bannedTreatment: false, treatmentLogged: false, handlingLogged: false },
  moltPhase: 'inter',
  care: { cycleActive: true, tasksDue: 2, tasksDone: 2, criticalAlertOpen: false },
  ...over,
});
const score = (over: Partial<DayScoreInput> = {}) => computeDayScore(base(over)) as DayScore;
const codes = (s: DayScore | null) => (s?.reasons ?? []).map((r) => r.code);
const noWater = {} as DayScoreInput['water'];
const noFeed = { logged: false, kg: 0, prev3DayAvgKg: null, trayWorst: null } as DayScoreInput['feed'];
const noHealth = { mortality: null, livePopulation: 100000, mortality7DayAvg: null, bannedTreatment: false, treatmentLogged: false, handlingLogged: false };

describe('computeDayScore — a perfect day', () => {
  it('scores 100, good, all four parts, no reasons', () => {
    const s = score();
    expect(s.value).toBe(100);
    expect(s.band).toBe('good');
    expect(s.capped).toBe(false);
    expect(s.basedOn).toEqual(['water', 'feeding', 'health', 'care']);
    expect(s.missing).toEqual([]);
    expect(s.reasons).toEqual([]);
    expect(s.parts).toEqual({
      water: { earned: 40, possible: 40, measured: true },
      feeding: { earned: 20, possible: 20, measured: true },
      health: { earned: 25, possible: 25, measured: true },
      care: { earned: 15, possible: 15, measured: true },
    });
  });
});

describe('water part', () => {
  it('DO weight 35%: caution DO halves 35% of 40 → 33, capped? no', () => {
    const s = score({ water: { ...base().water, do: mm(3.5, 6) } });
    expect(s.parts.water.earned).toBe(33);
    expect(s.reasons[0]).toMatchObject({ code: 'do_low', severity: 'watch', value: 3.5, limit: 4, pondId: 'p1' });
    expect(s.capped).toBe(false);
  });

  it('judges the WORST reading: min DO, max ammonia', () => {
    expect(codes(score({ water: { ...base().water, do: mm(2.5, 8) } }))).toContain('do_low');
    expect(score({ water: { ...base().water, ammonia: mm(0.05, 0.3) } }).reasons[0]).toMatchObject({ code: 'ammonia_high', value: 0.3, limit: 0.1 });
  });

  it('renormalises across logged parameters only', () => {
    // Only DO logged, caution → 50% of water.
    const s = score({ water: { do: mm(3.5) } });
    expect(s.parts.water).toEqual({ earned: 20, possible: 40, measured: true });
    // Only temperature logged, optimal → full 40, not 10% of 40.
    expect(score({ water: { temperature: mm(30) } }).parts.water.earned).toBe(40);
  });

  it('weights: ammonia 20, pH 20, temp 10, sal/alk/nitrite 5 each (critical ⇒ 0)', () => {
    const w = base().water;
    expect(score({ water: { ...w, ammonia: mm(0.8), freeNh3: mm(0.01) } }).parts.water.earned).toBe(32);
    expect(score({ water: { ...w, ph: mm(9.5) } }).parts.water.earned).toBe(32);
    expect(score({ water: { ...w, temperature: mm(20) } }).parts.water.earned).toBe(36);
    expect(score({ water: { ...w, salinity: mm(40) } }).parts.water.earned).toBe(38);
    expect(score({ water: { ...w, alkalinity: mm(30) } }).parts.water.earned).toBe(38);
    expect(score({ water: { ...w, nitrite: mm(5) } }).parts.water.earned).toBe(38);
  });

  it('ammonia takes the worse of total ammonia and free NH3', () => {
    const s = score({ water: { ...base().water, ammonia: mm(0.05), freeNh3: mm(0.35) } });
    expect(codes(s)).toContain('free_nh3_high');
    expect(s.parts.water.earned).toBe(32);
    const caution = score({ water: { ...base().water, ammonia: mm(0.05), freeNh3: mm(0.2) } });
    expect(caution.parts.water.earned).toBe(36);
    expect(caution.capped).toBe(false);
  });

  it('pH judged on min & max; swing > 0.5 ⇒ at least caution', () => {
    expect(score({ water: { ...base().water, ph: mm(6.8, 8) } }).reasons[0]).toMatchObject({ code: 'ph_out_of_range', value: 6.8, limit: 7 });
    const swing = score({ water: { ...base().water, ph: mm(7.6, 8.2) } });
    expect(codes(swing)).toEqual(['ph_swing']);
    expect(swing.parts.water.earned).toBe(36);
    expect(codes(score({ water: { ...base().water, ph: mm(7.6, 8.1) } }))).toEqual([]);
  });

  it('per-species limits: scampi salinity 20 is critical, vannamei optimal', () => {
    expect(codes(score({ species: 'Macrobrachium rosenbergii', water: { salinity: mm(20) } }))).toContain('salinity_out_of_range');
    expect(codes(score({ water: { salinity: mm(20) } }))).toEqual([]);
  });
});

describe('feeding part', () => {
  it('8 feed logged + 6 tray ok + 6 not a drop', () => {
    expect(score().parts.feeding.earned).toBe(20);
  });
  it('tray a_lot_left loses 6', () => {
    const s = score({ feed: { ...base().feed, trayWorst: 'a_lot_left' } });
    expect(s.parts.feeding.earned).toBe(14);
    expect(codes(s)).toContain('tray_a_lot_left');
  });
  it('tray not checked ⇒ those 6 unmeasured, renormalised (feed fine ⇒ full 20)', () => {
    expect(score({ feed: { ...base().feed, trayWorst: null } }).parts.feeding.earned).toBe(20);
  });
  it('feed < 70% of the 3-day average loses 6', () => {
    const s = score({ feed: { ...base().feed, kg: 13, prev3DayAvgKg: 20 } });
    expect(s.parts.feeding.earned).toBe(14);
    expect(s.reasons.find((r) => r.code === 'feed_drop')).toMatchObject({ value: 13, limit: 14 });
    expect(score({ feed: { ...base().feed, kg: 14, prev3DayAvgKg: 20 } }).parts.feeding.earned).toBe(20);
  });
  it('no baseline or molt peak ⇒ the 6 are full', () => {
    expect(score({ feed: { ...base().feed, kg: 1, prev3DayAvgKg: null } }).parts.feeding.earned).toBe(20);
    expect(score({ moltPhase: 'peak', feed: { ...base().feed, kg: 1 } }).parts.feeding.earned).toBe(20);
  });
  it('tray only (no feed log) is measured: 6 of 14 → 8.6', () => {
    const s = score({ feed: { ...noFeed, trayWorst: 'empty' } });
    expect(s.parts.feeding).toEqual({ earned: 8.6, possible: 20, measured: true });
    expect(codes(s)).toContain('feed_not_logged');
  });
});

describe('health part', () => {
  it('≤ 0.1% full; 0.1–0.3% half; > 0.3% zero', () => {
    const at = (deaths: number) => score({ health: { ...base().health, mortality: deaths, mortality7DayAvg: deaths } });
    expect(at(100).parts.health.earned).toBe(25);
    expect(at(200).parts.health.earned).toBe(12.5);
    expect(at(300).parts.health.earned).toBe(12.5);
    expect(at(301).parts.health.earned).toBe(0);
    expect(at(200).reasons[0]).toMatchObject({ code: 'mortality_high', severity: 'watch', limit: 0.1, value: 0.2 });
  });
  it('spike: > 3× 7-day avg and ≥ 10 animals ⇒ at least caution', () => {
    const s = score({ health: { ...base().health, mortality: 13, mortality7DayAvg: 4 } });
    expect(codes(s)).toContain('mortality_spike');
    expect(s.parts.health.earned).toBe(12.5);
    // 9 animals is below the floor.
    expect(codes(score({ health: { ...base().health, mortality: 9, mortality7DayAvg: 1 } }))).not.toContain('mortality_spike');
    // exactly 3× is not a spike
    expect(codes(score({ health: { ...base().health, mortality: 12, mortality7DayAvg: 4 } }))).not.toContain('mortality_spike');
  });
  it('livePopulation unknown ⇒ spike judgement only', () => {
    const s = score({ health: { ...base().health, livePopulation: null, mortality: 5000, mortality7DayAvg: 5000 } });
    expect(s.parts.health.earned).toBe(25);
    expect(s.capped).toBe(false);
  });
  it('sampling/harvest during molt peak ⇒ caution', () => {
    const s = score({ moltPhase: 'peak', health: { ...base().health, handlingLogged: true } });
    expect(codes(s)).toContain('molt_handling');
    expect(s.parts.health.earned).toBe(12.5);
    expect(score({ moltPhase: 'pre', health: { ...base().health, handlingLogged: true } }).parts.health.earned).toBe(25);
  });
  it('measured by sampling/treatment alone; unmeasured otherwise', () => {
    expect(score({ health: { ...noHealth, treatmentLogged: true } }).parts.health.measured).toBe(true);
    expect(score({ health: { ...noHealth, handlingLogged: true } }).parts.health.measured).toBe(true);
    expect(score({ health: noHealth }).parts.health).toEqual({ earned: 0, possible: 0, measured: false });
  });
});

describe('care part', () => {
  it('water 5, feed 4, tray 2, tasks 2, alerts 2', () => {
    expect(score({ water: { do: mm(6) }, care: { ...base().care } }).parts.care.earned).toBe(15);
    const s = score({ feed: { ...base().feed, trayWorst: null }, care: { cycleActive: true, tasksDue: 4, tasksDone: 1, criticalAlertOpen: true } });
    expect(s.parts.care.earned).toBe(9.5); // 5 + 4 + 0 + 0.5 + 0
    expect(codes(s)).toEqual(expect.arrayContaining(['tray_not_checked', 'task_missed', 'alert_open']));
    expect(s.reasons.find((r) => r.code === 'task_missed')?.value).toBe(3);
  });
  it('no tasks due ⇒ full 2', () => {
    expect(score({ care: { cycleActive: true, tasksDue: 0, tasksDone: 0, criticalAlertOpen: false } }).parts.care.earned).toBe(15);
  });
  it('water not logged costs 5 in care', () => {
    const s = score({ water: noWater });
    expect(s.parts.care.earned).toBe(10);
    expect(codes(s)).toContain('water_not_logged');
  });
  it('unmeasured without an active cycle', () => {
    expect(score({ care: { ...base().care, cycleActive: false } }).parts.care.measured).toBe(false);
  });
});

describe('rule 1 — not logged ⇒ not counted', () => {
  it('unlogged parts are excluded from the denominator', () => {
    // Perfect water + feed, health not logged, no cycle ⇒ still 100, not 60.
    const s = score({ health: noHealth, care: { ...base().care, cycleActive: false } });
    expect(s.value).toBe(100);
    expect(s.basedOn).toEqual(['water', 'feeding']);
    expect(s.missing).toEqual(['health', 'care']);
  });
  it('a missing part does not count as zero (caution DO only ⇒ 50, not 20)', () => {
    const s = score({ water: { do: mm(3.5) }, feed: noFeed, health: noHealth, care: { ...base().care, cycleActive: false } });
    expect(s.value).toBe(50);
  });
  it('no score unless water OR feeding measured', () => {
    expect(computeDayScore(base({ water: noWater, feed: noFeed }))).toBeNull();
    expect(computeDayScore(base({ water: noWater }))).not.toBeNull();
    expect(computeDayScore(base({ feed: noFeed }))).not.toBeNull();
  });
});

describe('rule 2 — cap at 59 for every critical condition', () => {
  const w = base().water;
  const cases: [string, Partial<DayScoreInput>][] = [
    ['do_low', { water: { ...w, do: mm(2.9, 9) } }],
    ['ammonia_high', { water: { ...w, ammonia: mm(0.6), freeNh3: mm(0.01) } }],
    ['free_nh3_high', { water: { ...w, freeNh3: mm(0.31) } }],
    ['ph_out_of_range', { water: { ...w, ph: mm(9.1) } }],
    ['mortality_high', { health: { ...base().health, mortality: 301, mortality7DayAvg: 301 } }],
    ['banned_treatment', { health: { ...base().health, bannedTreatment: true, treatmentLogged: true } }],
  ];
  it.each(cases)('%s caps the score at 59', (code, over) => {
    const s = score(over);
    expect(s.value).toBeLessThanOrEqual(CAP);
    expect(s.value).toBe(59);
    expect(s.capped).toBe(true);
    expect(s.capReasons.map((r) => r.code)).toEqual([code]);
    expect(s.band).toBe('attention');
    expect(s.reasons[0]).toMatchObject({ code, severity: 'critical' });
  });
  it('critical temperature/salinity/nitrite do NOT cap', () => {
    for (const over of [{ temperature: mm(20) }, { salinity: mm(40) }, { nitrite: mm(5) }]) {
      const s = score({ water: { ...w, ...over } });
      expect(s.capped).toBe(false);
      expect(s.value).toBeGreaterThan(59);
    }
  });
  it('a score already below the cap is left alone', () => {
    const s = score({ water: { do: mm(2) }, feed: noFeed, health: noHealth, care: { ...base().care, cycleActive: false } });
    expect(s.value).toBe(0);
    expect(s.capped).toBe(true);
  });
});

describe('rule 3 — bands', () => {
  it('≥ 80 good, 60–79 watch, < 60 attention', () => {
    expect(bandFor(100)).toBe('good');
    expect(bandFor(80)).toBe('good');
    expect(bandFor(79)).toBe('watch');
    expect(bandFor(60)).toBe('watch');
    expect(bandFor(59)).toBe('attention');
    expect(bandFor(0)).toBe('attention');
  });
});

describe('rule 6 — reasons worst first, max 5', () => {
  it('criticals before watches, capped at five', () => {
    const s = score({
      water: { do: mm(3.5), ph: mm(7.6, 8.4), temperature: mm(26), salinity: mm(8), alkalinity: mm(80), nitrite: mm(2), ammonia: mm(0.6) },
      feed: { logged: true, kg: 1, prev3DayAvgKg: 20, trayWorst: 'a_lot_left' },
    });
    expect(s.reasons).toHaveLength(5);
    expect(s.reasons[0].severity).toBe('critical');
    expect(s.reasons.slice(1).every((r) => r.severity === 'watch')).toBe(true);
  });
});

describe('rule 4 — farm score, area weighted', () => {
  const s = (value: number, over: Partial<DayScore> = {}): DayScore => ({ ...score(), value, band: bandFor(value), ...over });
  it('weights by areaM2, missing area ⇒ weight 1, names the weakest pond', () => {
    const { score: farm, weakestPondId } = combineScores([
      { pondId: 'a', areaM2: 3000, score: s(90) },
      { pondId: 'b', areaM2: 1000, score: s(50) },
      { pondId: 'c', areaM2: null, score: null },
    ]);
    expect(farm?.value).toBe(80);
    expect(farm?.band).toBe('good');
    expect(weakestPondId).toBe('b');
    expect(combineScores([{ pondId: 'a', areaM2: null, score: s(90) }, { pondId: 'b', areaM2: 0, score: s(60) }]).score?.value).toBe(75);
  });
  it('no scored ponds ⇒ null', () => {
    expect(combineScores([{ pondId: 'a', areaM2: 10, score: null }])).toEqual({ score: null, weakestPondId: null });
  });
  it('carries pond reasons worst first', () => {
    const capped = score({ water: { ...base().water, do: mm(2) } });
    const { score: farm } = combineScores([{ pondId: 'a', areaM2: 1, score: s(90) }, { pondId: 'p1', areaM2: 1, score: capped }]);
    expect(farm?.reasons[0]).toMatchObject({ code: 'do_low', pondId: 'p1' });
  });
});

describe('rule 5 — previousScore (area-weighted values)', () => {
  it('combines previous-day values the same way', () => {
    expect(combineValues([{ areaM2: 3000, value: 90 }, { areaM2: 1000, value: 50 }, { areaM2: 5, value: null }])).toBe(80);
    expect(combineValues([{ areaM2: 1, value: null }])).toBeNull();
  });
});
