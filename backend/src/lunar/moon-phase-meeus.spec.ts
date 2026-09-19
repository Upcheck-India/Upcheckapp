/**
 * E5.1 — the lunar dates were wrong, and this is the half that is verifiable.
 *
 * The app used a MEAN synodic month: 29.530588 days from a fixed epoch. The
 * real Moon deviates from that by up to ±14 hours because its orbit is
 * elliptical — easily enough to put a predicted new moon on the wrong calendar
 * DATE. For an audience that reads Amavasya and Purnima off the Panchang (true
 * phase, local time), an app that disagrees with the Panchang is an app that
 * gets ignored.
 *
 * These assert against published astronomical instants, so they fail if the
 * series is mistyped — which is the only realistic way this breaks.
 */
import {
  nextPhase,
  toJulianDay,
  fromJulianDay,
  daysToNearestSpringTide,
} from './moon-phase-meeus';

/** Minutes between two instants, unsigned. */
const minutesApart = (a: Date, b: Date) =>
  Math.abs(a.getTime() - b.getTime()) / 60_000;

describe('true lunar phases (Meeus ch. 49)', () => {
  it('round-trips a Julian Day', () => {
    const d = new Date('2026-09-06T12:00:00.000Z');
    expect(fromJulianDay(toJulianDay(d)).toISOString()).toBe(d.toISOString());
  });

  /**
   * Published new moons (UTC). Tolerance is generous at 20 minutes — the
   * truncated series is good to about a minute, and the point of the test is
   * to catch a mistyped coefficient, not to certify an ephemeris.
   */
  it.each([
    ['2026-01-18T19:52:00Z', '2026-01-10T00:00:00Z'],
    ['2026-06-15T02:54:00Z', '2026-06-05T00:00:00Z'],
    ['2026-09-11T03:26:00Z', '2026-09-05T00:00:00Z'],
  ])('finds the new moon at %s', (expected, from) => {
    const got = nextPhase(new Date(from), true);
    expect(minutesApart(got, new Date(expected))).toBeLessThan(20);
  });

  it.each([
    ['2026-01-03T10:03:00Z', '2025-12-28T00:00:00Z'],
    ['2026-09-26T16:49:00Z', '2026-09-20T00:00:00Z'],
  ])('finds the full moon at %s', (expected, from) => {
    const got = nextPhase(new Date(from), false);
    expect(minutesApart(got, new Date(expected))).toBeLessThan(20);
  });

  /**
   * M1.7: the full-moon series has its OWN coefficients (Meeus table 49.A),
   * not the new-moon ones. Expected times are UT, fetched 2026-09-19 from the
   * US Naval Observatory: https://aa.usno.navy.mil/api/moon/phases/year?year=2026
   * (published to the minute, so ±0.5 min rounding). With the new-moon terms
   * reused and no ΔT, full moons were off by up to 2.4 min and this failed.
   */
  const USNO_2026 = {
    full: ['01-03T10:03', '02-01T22:09', '03-03T11:38', '04-02T02:12', '05-01T17:23', '05-31T08:45', '06-29T23:56',
      '07-29T14:36', '08-28T04:18', '09-26T16:49', '10-26T04:12', '11-24T14:53', '12-24T01:28'],
    new: ['01-18T19:52', '02-17T12:01', '03-19T01:23', '04-17T11:52', '05-16T20:01', '06-15T02:54', '07-14T09:43',
      '08-12T17:37', '09-11T03:27', '10-10T15:50', '11-09T07:02', '12-09T00:52'],
  };
  it.each([
    ...USNO_2026.full.map((s) => [s, false] as const),
    ...USNO_2026.new.map((s) => [s, true] as const),
  ])('matches USNO 2026-%s (new=%s) within 1.5 min', (s, isNew) => {
    const expected = new Date(`2026-${s}:00Z`);
    const got = nextPhase(new Date(expected.getTime() - 5 * 86_400_000), isNew);
    expect(minutesApart(got, expected)).toBeLessThan(1.5);
  });

  /**
   * THE BUG, stated as a test.
   *
   * Compares the corrected instant against the MEAN one the app used to use —
   * computed here from the same series with the periodic terms switched off,
   * so this cannot drift out of step with the implementation the way a
   * hard-coded figure would.
   *
   * The gap is hours. That is what put a predicted new moon on the wrong
   * calendar date, and what made the app contradict the Panchang.
   */
  it('differs from the mean-phase answer by hours, not seconds', () => {
    const from = new Date('2026-09-05T00:00:00Z');
    const trueNewMoon = nextPhase(from, true);

    // Mean lunation: fixed 29.530588861-day month from the 2000 epoch.
    const k = Math.round((toJulianDay(trueNewMoon) - 2451550.09766) / 29.530588861);
    const meanJd = 2451550.09766 + 29.530588861 * k;
    const meanNewMoon = fromJulianDay(meanJd);

    const gap = minutesApart(trueNewMoon, meanNewMoon);
    expect(gap).toBeGreaterThan(60);
    // ...and inside the ±14 h the elliptical orbit can produce, so a wildly
    // wrong correction fails here rather than looking like a success.
    expect(gap).toBeLessThan(14 * 60);
  });

  it('never returns a phase in the past', () => {
    const from = new Date('2026-09-06T00:00:00Z');
    expect(nextPhase(from, true).getTime()).toBeGreaterThanOrEqual(from.getTime());
    expect(nextPhase(from, false).getTime()).toBeGreaterThanOrEqual(from.getTime());
  });

  it('walks a whole year without producing an invalid date or skipping a month', () => {
    let prev = 0;
    for (let m = 0; m < 12; m++) {
      const from = new Date(Date.UTC(2026, m, 1));
      const nm = nextPhase(from, true);
      expect(Number.isNaN(nm.getTime())).toBe(false);
      // Each month's next new moon must be within one synodic month.
      expect((nm.getTime() - from.getTime()) / 86_400_000).toBeLessThan(30);
      expect(nm.getTime()).toBeGreaterThan(prev);
      prev = from.getTime();
    }
  });

  describe('distance to the nearest spring tide', () => {
    it('is ~0 at a new moon', () => {
      expect(daysToNearestSpringTide(new Date('2026-09-11T03:26:00Z'))).toBeLessThan(0.1);
    });

    it('is ~0 at a full moon', () => {
      expect(daysToNearestSpringTide(new Date('2026-09-26T16:49:00Z'))).toBeLessThan(0.1);
    });

    /** Half-way between the two is the quarter — the furthest you can be. */
    it('peaks near a quarter moon, and never exceeds a quarter month', () => {
      const d = daysToNearestSpringTide(new Date('2026-09-19T00:00:00Z'));
      expect(d).toBeGreaterThan(5);
      expect(d).toBeLessThan(29.53 / 4 + 0.5);
    });
  });
});
