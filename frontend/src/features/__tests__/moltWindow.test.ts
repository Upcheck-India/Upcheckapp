import { addDays, istDateString, phaseOn, windowContaining, type MoltWindow } from '../moltWindow';

const SEP: MoltWindow = {
  key: '2026-09-11-new',
  kind: 'new',
  preStart: '2026-09-08',
  peakStart: '2026-09-10',
  peakDate: '2026-09-11',
  peakEnd: '2026-09-12',
  postEnd: '2026-09-14',
};
const LATE_SEP: MoltWindow = {
  key: '2026-09-26-full',
  kind: 'full',
  preStart: '2026-09-23',
  peakStart: '2026-09-25',
  peakDate: '2026-09-26',
  peakEnd: '2026-09-27',
  postEnd: '2026-09-29',
};

describe('moltWindow helpers', () => {
  it('phaseOn is inclusive at every edge', () => {
    expect(phaseOn(SEP, '2026-09-07')).toBe('inter');
    expect(phaseOn(SEP, '2026-09-08')).toBe('pre');
    expect(phaseOn(SEP, '2026-09-10')).toBe('peak');
    expect(phaseOn(SEP, '2026-09-12')).toBe('peak');
    expect(phaseOn(SEP, '2026-09-13')).toBe('post');
    expect(phaseOn(SEP, '2026-09-14')).toBe('post');
    expect(phaseOn(SEP, '2026-09-15')).toBe('inter');
  });

  it('windowContaining finds the window a date falls in, across a list', () => {
    expect(windowContaining([SEP, LATE_SEP], '2026-09-26')).toEqual({ window: LATE_SEP, phase: 'peak' });
    expect(windowContaining([SEP, LATE_SEP], '2026-09-18')).toBeNull();
    expect(windowContaining(undefined, '2026-09-11')).toBeNull();
  });

  it('istDateString rolls over at 18:30 UTC', () => {
    expect(istDateString(new Date('2026-09-09T18:29:00Z'))).toBe('2026-09-09');
    expect(istDateString(new Date('2026-09-09T18:30:00Z'))).toBe('2026-09-10');
  });

  it('addDays crosses month edges', () => {
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
  });
});
