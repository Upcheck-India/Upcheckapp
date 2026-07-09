import { toIstDateString } from './ist-date';

/** DATE-1: bucket by IST-local day, not UTC. */
describe('toIstDateString', () => {
  it('keeps a pre-05:30-IST reading on its own IST calendar date', () => {
    // 2026-06-17 02:00 IST === 2026-06-16 20:30 UTC. UTC bucketing would give
    // 2026-06-16; IST bucketing must give 2026-06-17.
    expect(toIstDateString(new Date('2026-06-16T20:30:00.000Z'))).toBe(
      '2026-06-17',
    );
  });

  it('matches UTC when the instant is already the same IST/UTC day', () => {
    expect(toIstDateString(new Date('2026-06-17T09:00:00.000Z'))).toBe(
      '2026-06-17',
    );
  });

  it('rolls to the next day just after IST midnight', () => {
    // 2026-06-17T18:31:00Z === 2026-06-18 00:01 IST.
    expect(toIstDateString(new Date('2026-06-17T18:31:00.000Z'))).toBe(
      '2026-06-18',
    );
  });
});
