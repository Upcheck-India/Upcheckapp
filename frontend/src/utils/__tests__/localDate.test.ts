import { todayLocalISODate } from '../localDate';

describe('todayLocalISODate', () => {
  it('returns the local calendar date, not the UTC one', () => {
    // 2026-01-01 00:30 in a UTC+05:30 zone is still 2025-12-31 in UTC.
    // toISOString() would wrongly report the UTC day; the local getters must not.
    const local = new Date(2026, 0, 1, 0, 30, 0); // local midnight-thirty, Jan 1 2026
    jest.spyOn(global, 'Date').mockImplementation(() => local as any);

    expect(todayLocalISODate()).toBe('2026-01-01');
    expect(local.toISOString().slice(0, 10)).not.toBe('2026-01-01');

    (global.Date as any).mockRestore();
  });

  it('zero-pads month and day', () => {
    const local = new Date(2026, 2, 5); // March 5 2026 local
    jest.spyOn(global, 'Date').mockImplementation(() => local as any);

    expect(todayLocalISODate()).toBe('2026-03-05');

    (global.Date as any).mockRestore();
  });
});
