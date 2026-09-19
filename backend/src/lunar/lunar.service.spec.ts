import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { LunarService } from './lunar.service';
import { ComputeRiskDto } from './lunar.controller';

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

  it('molt risk is 0 away from a spring tide (moltLikelihood 0)', () => {
    const p = svc.moonPhase(FIRST_QUARTER);
    const r = svc.computeMoltRisk(p, 25, { do: 2.5, mineralDeficitFrac: 1 });
    expect(r.score).toBe(0);
    expect(r.band).toBe('Low');
  });

  it('molt risk rises as DO drops and mineral deficit grows (at molt peak)', () => {
    const p = svc.moonPhase(NEW_MOON);
    const baseline = svc.computeMoltRisk(p, 25, { do: 6 }).score;
    const lowDO = svc.computeMoltRisk(p, 25, { do: 3.5 }).score;
    const lowDOplusMineral = svc.computeMoltRisk(p, 25, {
      do: 3.5,
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

describe('LunarService — window-based pressure + renormalised vulnerability', () => {
  const svc = new LunarService();
  // True new moon 2026-09-11 03:26 UTC → IST peak 10–12 Sep, post 13–14, inter 15+.
  const PEAK_EDGE = new Date('2026-09-12T12:00:00Z');
  const POST = new Date('2026-09-13T06:00:00Z');
  const INTER = new Date('2026-09-15T06:00:00Z');

  it('peak day, 20 g pond, no readings → pressure 1, vulnerability 0.5 (unknown) → 70 Critical', () => {
    const r = svc.computeMoltRisk(svc.moonPhase(PEAK_EDGE), 20, {});
    expect(r.phaseRel).toBe('peak');
    expect(r.moltPressure).toBe(1);
    expect(r.vulnerability).toBe(0.5);
    expect(r.vulnerabilityKnown).toBe(0);
    expect(r.vulnerabilityTotal).toBe(8);
    expect(r.score).toBe(70);
    expect(r.band).toBe('Critical');
  });

  it('10 g pond on a peak-window day: full window pressure (mean phase undercounted it)', () => {
    const p = svc.moonPhase(PEAK_EDGE);
    expect(p.moltLikelihood).toBeLessThan(1); // the old mean-phase curve, already falling
    const r = svc.computeMoltRisk(p, 10, {});
    expect(r.moltPressure).toBeCloseTo(svc.lunarLockFactor(10), 4);
    expect(r.phaseRel).toBe('peak');
    // Old: 100 × likelihood × lock × (0.4 + 0.6 × 0.106) with the "safe" defaults.
    const old = 100 * p.moltLikelihood * svc.lunarLockFactor(10) * (0.4 + 0.6 * 0.106);
    expect(r.score).toBeGreaterThan(old);
    expect(r.score).toBeCloseTo(100 * svc.lunarLockFactor(10) * 0.7, 1);
  });

  it('pre/post window days carry 0.6 pressure; inter days carry none', () => {
    const post = svc.computeMoltRisk(svc.moonPhase(POST), 20, {});
    expect(post.phaseRel).toBe('post');
    expect(post.moltPressure).toBe(0.6);
    const inter = svc.computeMoltRisk(svc.moonPhase(INTER), 20, { do: 2 });
    expect(inter.phaseRel).toBe('none');
    expect(inter.moltPressure).toBe(0);
    expect(inter.score).toBe(0);
    expect(inter.band).toBe('Low');
  });

  it('renormalises over known factors: only DO known and critical → vulnerability 1.0', () => {
    const r = svc.computeMoltRisk(svc.moonPhase(PEAK_EDGE), 20, { do: 2.5 });
    expect(r.vulnerability).toBe(1);
    expect(r.vulnerabilityKnown).toBe(1);
    expect(r.score).toBe(100);
  });

  it('coverage counts each provided factor', () => {
    const r = svc.computeMoltRisk(svc.moonPhase(PEAK_EDGE), 20, {
      do: 6, temp: 29, freeNh3: 0.05, mineralDeficitFrac: 0, densityRatio: 0.5, tray: 'few_left',
    });
    expect(r.vulnerabilityKnown).toBe(6);
    expect(r.vulnerabilityTotal).toBe(8);
    // (0.1·.22 + 0·.22 + 0.1·.12 + 0.1·.10 + 0.5·.08 + 0.3·.06) / 0.80
    expect(r.vulnerability).toBeCloseTo(0.1275, 4);
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
    expect(
      svc.moonPhase(TWO_DAYS_AFTER_FULL).signedDaysToSpringTide,
    ).toBeCloseTo(2, 1);
    expect(
      svc.moonPhase(TWO_DAYS_BEFORE_FULL).signedDaysToSpringTide,
    ).toBeCloseTo(-2, 1);
  });

  it('phase classification: peak at spring tide, pre before, post after, inter at quarter', () => {
    expect(playbookFor(NEW_MOON).phaseRel).toBe('peak');
    expect(playbookFor(TWO_DAYS_BEFORE_FULL).phaseRel).toBe('pre');
    expect(playbookFor(TWO_DAYS_AFTER_FULL).phaseRel).toBe('post');
    expect(playbookFor(FIRST_QUARTER).phaseRel).toBe('inter');
  });

  // R5: one phase model — the true-phase molt window, not mean phase.
  it('13 Sep 2026 (post of the 11 Sep new moon) is post in both playbook and risk', () => {
    const d = new Date('2026-09-13T06:00:00Z');
    const p = svc.moonPhase(d);
    const r = svc.computeMoltRisk(p, 25, {});
    expect(r.phaseRel).toBe('post');
    expect(svc.buildPlaybook(p, r, {}).phaseRel).toBe('post');
    expect(playbookFor(new Date('2026-09-15T06:00:00Z')).phaseRel).toBe('inter');
    expect(svc.computeMoltRisk(svc.moonPhase(new Date('2026-09-15T06:00:00Z')), 25, {}).phaseRel).toBe('none');
  });

  it('every phase yields at least one management step', () => {
    for (const d of [
      NEW_MOON,
      TWO_DAYS_BEFORE_FULL,
      TWO_DAYS_AFTER_FULL,
      FIRST_QUARTER,
    ]) {
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
    const pb = playbookFor(TWO_DAYS_BEFORE_FULL, 25, {
      mineralDeficitFrac: 0.5,
    });
    expect(
      pb.steps.some(
        (s) => s.category === 'mineral' && s.trigger === 'mineralDeficit',
      ),
    ).toBe(true);
  });

  it('post-molt leads with restoring feed for compensatory growth', () => {
    const pb = playbookFor(TWO_DAYS_AFTER_FULL);
    expect(pb.steps.some((s) => s.category === 'feed')).toBe(true);
  });
});

describe('M1.6/M1.7 playbook keys + /lunar/risk DTO', () => {
  const svc = new LunarService();

  it('every step and label carries an engines.lunar.pb_* key beside the English', () => {
    for (const d of [NEW_MOON, TWO_DAYS_BEFORE_FULL, TWO_DAYS_AFTER_FULL, FIRST_QUARTER]) {
      const p = svc.moonPhase(d);
      const v = { do: 2.5, mineralDeficitFrac: 0.5, salinity: 3, freeNh3: 0.4, temp: 34, diseaseHigh: true, tray: 'a_lot_left' as const };
      const pb = svc.buildPlaybook(p, svc.computeMoltRisk(p, 25, v), v);
      expect(pb.phaseLabelKey).toBe(`engines.lunar.pb_label_${pb.phaseRel}`);
      expect(pb.headlineKey).toMatch(/^engines\.lunar\.pb_headline_(inter|(pre|peak|post)_(new|full))$/);
      expect(pb.noteKey).toBe('engines.lunar.pb_note');
      for (const s of pb.steps) expect(s.key).toMatch(/^engines\.lunar\.pb_[a-z]+_[A-Za-z0-9]+$/);
    }
  });

  it('the note no longer claims the app learns from pond observations', () => {
    const p = svc.moonPhase(NEW_MOON);
    expect(svc.buildPlaybook(p, svc.computeMoltRisk(p, 25, {}), {}).note).toBe(
      'Molt timing follows the moon calendar. Your soft-shell observations are recorded for future tuning.',
    );
  });

  it('low-DO step passes the reading as a param', () => {
    const p = svc.moonPhase(NEW_MOON);
    const pb = svc.buildPlaybook(p, svc.computeMoltRisk(p, 25, { do: 2.5 }), { do: 2.5 });
    expect(pb.steps.find((s) => s.trigger === 'lowDO')).toMatchObject({ key: 'engines.lunar.pb_peak_lowDO', params: { do: 2.5 } });
  });

  it('rejects a body without abwG (used to return a NaN score)', async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });
    const meta = { type: 'body' as const, metatype: ComputeRiskDto };
    await expect(pipe.transform({ vulnerability: {} }, meta)).rejects.toBeInstanceOf(BadRequestException);
    await expect(pipe.transform({ abwG: 12, vulnerability: { do: 'low' } }, meta)).rejects.toBeInstanceOf(BadRequestException);
    await expect(pipe.transform({ abwG: 12, vulnerability: { do: 4.2, tray: 'few_left' } }, meta)).resolves.toMatchObject({ abwG: 12 });
  });
});
