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
const TWO_DAYS_BEFORE_FULL = jdToDate(REF_NEW_MOON_JD + SYNODIC / 2 - 2);
const TWO_DAYS_AFTER_FULL = jdToDate(REF_NEW_MOON_JD + SYNODIC / 2 + 2);

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

describe('LunarService — signed days + action playbook (spec §5)', () => {
  const svc = new LunarService();
  const playbookFor = (date: Date, abw = 25, v = {}) => {
    const p = svc.moonPhase(date);
    const r = svc.computeMoltRisk(p, abw, v);
    return svc.buildPlaybook(p, r, v);
  };

  it('signedDaysToSpringTide: ~0 at new, +2 just after full, −2 just before full', () => {
    expect(svc.moonPhase(NEW_MOON).signedDaysToSpringTide).toBeCloseTo(0, 3);
    expect(svc.moonPhase(TWO_DAYS_AFTER_FULL).signedDaysToSpringTide).toBeCloseTo(2, 1);
    expect(svc.moonPhase(TWO_DAYS_BEFORE_FULL).signedDaysToSpringTide).toBeCloseTo(-2, 1);
  });

  it('phase classification: peak at spring tide, pre before, post after, inter at quarter', () => {
    expect(playbookFor(NEW_MOON).phaseRel).toBe('peak');
    expect(playbookFor(TWO_DAYS_BEFORE_FULL).phaseRel).toBe('pre');
    expect(playbookFor(TWO_DAYS_AFTER_FULL).phaseRel).toBe('post');
    expect(playbookFor(FIRST_QUARTER).phaseRel).toBe('inter');
  });

  it('every phase yields at least one management step', () => {
    for (const d of [NEW_MOON, TWO_DAYS_BEFORE_FULL, TWO_DAYS_AFTER_FULL, FIRST_QUARTER]) {
      expect(playbookFor(d).steps.length).toBeGreaterThan(0);
    }
  });

  it('peak always includes the no-handling and aeration baseline steps', () => {
    const pb = playbookFor(NEW_MOON);
    expect(pb.steps.some((s) => s.category === 'handling')).toBe(true);
    expect(pb.steps.some((s) => s.category === 'aeration')).toBe(true);
  });

  it('low DO at peak escalates a critical aeration step tagged lowDO', () => {
    const pb = playbookFor(NEW_MOON, 25, { do: 2.5 });
    const crit = pb.steps.find((s) => s.trigger === 'lowDO');
    expect(crit).toBeDefined();
    expect(crit?.priority).toBe('critical');
    expect(crit?.category).toBe('aeration');
  });

  it('mineral deficit drives a mineral top-up step in pre-molt', () => {
    const pb = playbookFor(TWO_DAYS_BEFORE_FULL, 25, { mineralDeficitFrac: 0.5 });
    expect(pb.steps.some((s) => s.category === 'mineral' && s.trigger === 'mineralDeficit')).toBe(true);
  });

  it('post-molt leads with restoring feed for compensatory growth', () => {
    const pb = playbookFor(TWO_DAYS_AFTER_FULL);
    expect(pb.steps.some((s) => s.category === 'feed')).toBe(true);
  });
});
