import {
  addDays,
  currentMoltWindow,
  phaseOn,
  upcomingWindows,
  windowForPeak,
} from './molt-window';

describe('molt-window', () => {
  it('addDays crosses month boundaries', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('buckets a phase after 18:30 UTC onto the NEXT IST day', () => {
    // True new moon 2026-05-16 20:02 UTC = 2026-05-17 01:32 IST.
    const w = windowForPeak(new Date('2026-05-16T20:02:23Z'), 'new');
    expect(w).toEqual({
      key: '2026-05-17-new',
      kind: 'new',
      preStart: '2026-05-14',
      peakStart: '2026-05-16',
      peakDate: '2026-05-17',
      peakEnd: '2026-05-18',
      postEnd: '2026-05-20',
    });
  });

  it('phaseOn covers pre/peak/post edges inclusively', () => {
    const w = windowForPeak(new Date('2026-09-11T03:28:07Z'), 'new');
    expect(phaseOn(w, '2026-09-07')).toBe('inter');
    expect(phaseOn(w, '2026-09-08')).toBe('pre');
    expect(phaseOn(w, '2026-09-09')).toBe('pre');
    expect(phaseOn(w, '2026-09-10')).toBe('peak');
    expect(phaseOn(w, '2026-09-12')).toBe('peak');
    expect(phaseOn(w, '2026-09-13')).toBe('post');
    expect(phaseOn(w, '2026-09-14')).toBe('post');
    expect(phaseOn(w, '2026-09-15')).toBe('inter');
  });

  it('IST midnight decides the phase, not UTC midnight', () => {
    // 18:29 UTC on the 13th is still the 13th in IST → inter.
    expect(currentMoltWindow(new Date('2026-05-13T18:29:00Z')).phase).toBe('inter');
    // 18:30 UTC on the 13th is 00:00 IST on the 14th → pre starts.
    const at = currentMoltWindow(new Date('2026-05-13T18:30:00Z'));
    expect(at.phase).toBe('pre');
    expect(at.window?.key).toBe('2026-05-17-new');
  });

  it('upcomingWindows includes the window in progress and alternates kinds', () => {
    const ws = upcomingWindows(new Date('2026-09-14T06:00:00Z'), 3);
    expect(ws.map((w) => w.key)).toEqual([
      '2026-09-11-new',
      '2026-09-26-full',
      '2026-10-10-new',
    ]);
    const cur = currentMoltWindow(new Date('2026-09-14T06:00:00Z'));
    expect(cur.phase).toBe('post');
    expect(cur.next.key).toBe('2026-09-26-full');
  });

  it('outside any window: window null, next is the coming one', () => {
    const cur = currentMoltWindow(new Date('2026-09-18T06:00:00Z'));
    expect(cur).toMatchObject({ window: null, phase: 'inter' });
    expect(cur.next.key).toBe('2026-09-26-full');
  });
});
