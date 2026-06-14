import { LunarService } from './lunar.service';

const SYNODIC = 29.530588853;
const REF_NEW_MOON_JD = 2451550.26;
const JD_UNIX_EPOCH = 2440587.5;
const MS_PER_DAY = 86400000;

/** Construct a UTC Date at a given Julian Day (inverse of LunarService.julianDay). */
const jdToDate = (jd: number) => new Date((jd - JD_UNIX_EPOCH) * MS_PER_DAY);

const NEW_MOON = jdToDate(REF_NEW_MOON_JD);
const FULL_MOON = jdToDate(REF_NEW_MOON_JD + SYNODIC / 2);
const FIRST_QUARTER = jdToDate(REF_NEW_MOON_JD + SYNODIC / 4);

describe('LunarService — moon phase (spec §2)', () => {
  const svc = new LunarService();

  it('new moon: illumination ≈ 0, moltLikelihood ≈ 1', () => {
    const p = svc.moonPhase(NEW_MOON);
    expect(p.illumination).toBeCloseTo(0, 4);
    expect(p.moltLikelihood).toBeCloseTo(1, 4);
    expect(p.daysToSpringTide).toBeCloseTo(0, 4);
    expect(p.inMoltWindow).toBe(true);
  });

  it('full moon: illumination ≈ 1, moltLikelihood ≈ 1', () => {
    const p = svc.moonPhase(FULL_MOON);
    expect(p.illumination).toBeCloseTo(1, 4);
    expect(p.moltLikelihood).toBeCloseTo(1, 4);
    expect(p.daysToSpringTide).toBeCloseTo(0, 4);
  });

  it('first quarter: illumination ≈ 0.5, moltLikelihood ≈ 0, outside molt window', () => {
    const p = svc.moonPhase(FIRST_QUARTER);
    expect(p.illumination).toBeCloseTo(0.5, 4);
    expect(p.moltLikelihood).toBeCloseTo(0, 4);
    expect(p.daysToSpringTide).toBeCloseTo(SYNODIC / 4, 3); // ≈7.38 d
    expect(p.inMoltWindow).toBe(false);
  });
});

describe('LunarService — lock factor, mineral dose, risk (spec §3/§5/§8)', () => {
  const svc = new LunarService();

  it('LunarLockFactor: 2g→0.2, 20g→1.0, midpoint', () => {
    expect(svc.lunarLockFactor(2)).toBeCloseTo(0.2, 6); // clamped
    expect(svc.lunarLockFactor(20)).toBeCloseTo(1.0, 6);
    expect(svc.lunarLockFactor(11.5)).toBeCloseTo(0.5, 6); // (11.5-3)/17
  });

  it('mineral dose: raise K by 10ppm in 1000 m³ with MOP (50% K) → 20 kg', () => {
    expect(svc.mineralDoseKg(10, 1000, 0.5)).toBe(20);
  });

  it('molt risk is 0 away from a spring tide (moltLikelihood 0)', () => {
    const p = svc.moonPhase(FIRST_QUARTER);
    const r = svc.computeMoltRisk(p, 25, { do: 2.5, mineralDeficitFrac: 1 });
    expect(r.score).toBe(0);
    expect(r.band).toBe('Low');
  });

  it('molt risk rises as DO drops and mineral deficit grows (at molt peak)', () => {
    const p = svc.moonPhase(NEW_MOON);
    const baseline = svc.computeMoltRisk(p, 25, {}).score;
    const lowDO = svc.computeMoltRisk(p, 25, { do: 2.5 }).score;
    const lowDOplusMineral = svc.computeMoltRisk(p, 25, {
      do: 2.5,
      mineralDeficitFrac: 1,
    }).score;
    expect(lowDO).toBeGreaterThan(baseline);
    expect(lowDOplusMineral).toBeGreaterThan(lowDO);
    expect(p.inMoltWindow).toBe(true);
  });

  it('bands escalate with stress', () => {
    const p = svc.moonPhase(NEW_MOON);
    const stressed = svc.computeMoltRisk(p, 25, {
      do: 2.5,
      mineralDeficitFrac: 1,
      diseaseHigh: true,
      temp: 34,
      freeNh3: 0.4,
      tray: 'a_lot_left',
    });
    expect(stressed.score).toBeGreaterThan(60);
    expect(stressed.band).toBe('Critical');
    expect(stressed.phaseRel).toBe('peak');
  });
});
