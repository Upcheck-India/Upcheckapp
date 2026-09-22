import { WaterQualityService, criticalThresholds } from './water-quality.service';

/**
 * Persisted alert limits now come from the shared per-species table. Deliberate
 * behaviour change: pH critical-low moved 6.5 → 7.0 for penaeids (6.5 stays for
 * scampi), matching what the app already coloured red.
 */
describe('WaterQualityService alert limits (shared thresholds)', () => {
  it('reads vannamei limits by default, per-species when known', () => {
    expect(criticalThresholds(null)).toEqual({
      ph: { min: 7.0, max: 9.0 },
      dissolvedOxygen: { min: 3 },
      ammonia: { max: 0.5 },
    });
    expect(criticalThresholds('Macrobrachium rosenbergii').ph.min).toBe(6.5);
  });

  const run = async (record: any, species: string | null) => {
    const createAutoAlert = jest.fn().mockResolvedValue(undefined);
    const repo = { query: jest.fn().mockResolvedValue([{ species }]) };
    const service = new WaterQualityService(
      repo as any,
      {} as any,
      { supersedeOpenAlerts: jest.fn(), createAutoAlert } as any,
      {} as any,
      {} as any,
    );
    await (service as any).checkAndGenerateAlerts(
      { id: 'r1', ...record },
      { id: 'p1', farmId: 'f1', activeCycleId: 'c1' },
      'u1',
    );
    return createAutoAlert.mock.calls.map((c) => c[3]);
  };

  it('pH 6.8 now raises a Low pH alert on a vannamei pond, not on scampi', async () => {
    expect(await run({ ph: 6.8 }, 'Penaeus vannamei')).toEqual(['Low pH Alert']);
    expect(await run({ ph: 6.8 }, 'Macrobrachium rosenbergii')).toEqual([]);
  });

  it('DO < 3 and ammonia > 0.5 still raise; healthy values do not', async () => {
    expect(await run({ dissolvedOxygen: 2.9, ammonia: 0.6 }, null)).toEqual([
      'Low Dissolved Oxygen Alert',
      'High Ammonia Alert',
    ]);
    expect(await run({ ph: 8, dissolvedOxygen: 5, ammonia: 0.2 }, null)).toEqual([]);
  });
});

/**
 * Per-column latest (§4.6) and the weekly-chemistry filter (§4.5).
 *
 * The point of both is the same fact about how farmers log: probe readings are
 * daily, chemistry is weekly, so the newest ROW is not the newest VALUE of most
 * columns. `/latest` must date each column honestly, and the chemistry history
 * must not be padded with probe-only rows.
 */
function makeService(records: any[]) {
  const repo = {
    find: jest.fn().mockResolvedValue(records),
    findAndCount: jest.fn().mockResolvedValue([records, records.length]),
    // F5 read side: findAll/findOne sign each row's photo_paths via a raw
    // query on the repository's manager (entity-photo-paths.util.ts).
    manager: { query: jest.fn().mockResolvedValue([]) },
  };
  const ponds = { verifyAccess: jest.fn().mockResolvedValue(undefined) };
  const healthPhotoStorage = {
    signOne: jest.fn().mockResolvedValue({ full: [], thumb: [] }),
    signMany: jest.fn().mockImplementation((paths: unknown[]) => Promise.resolve(paths.map(() => ({ full: [], thumb: [] })))),
  };
  const service = new WaterQualityService(
    repo as any,
    ponds as any,
    {} as any,
    {} as any,
    healthPhotoStorage as any,
  );
  return { service, repo, ponds };
}

describe('WaterQualityService.getLatestPerColumn', () => {
  const TODAY = new Date('2026-09-04T06:00:00Z');
  const LAST_WEEK = new Date('2026-08-28T06:00:00Z');

  it('dates each column by the record it actually came from', async () => {
    const { service, ponds } = makeService([
      { recordedAt: TODAY, ph: 7.8, dissolvedOxygen: 5.1, alkalinity: null },
      { recordedAt: LAST_WEEK, ph: 7.2, alkalinity: 120 },
    ]);

    const out = await service.getLatestPerColumn('pond-1', 'u1');

    expect(ponds.verifyAccess).toHaveBeenCalledWith('pond-1', 'u1', 'READ');
    expect(out.ph).toBe(7.8);
    expect(out.phAsOf).toBe(TODAY.toISOString());
    // Carried forward from last week — and says so, so the client can decide
    // whether it is still fit to prefill.
    expect(out.alkalinity).toBe(120);
    expect(out.alkalinityAsOf).toBe(LAST_WEEK.toISOString());
    expect(out.recordedAt).toBe(TODAY.toISOString());
  });

  it('returns nulls, not a throw, for a pond with no readings', async () => {
    const { service } = makeService([]);

    const out = await service.getLatestPerColumn('pond-1', 'u1');

    expect(out.recordedAt).toBeNull();
    expect(out.ammonia).toBeNull();
    expect(out.ammoniaAsOf).toBeNull();
  });
});

describe('WaterQualityService.findAll — chemistryOnly', () => {
  it('asks for rows carrying at least one chemistry parameter', async () => {
    const { service, repo } = makeService([]);

    await service.findAll('pond-1', 'u1', undefined, true);

    const where = repo.findAndCount.mock.calls[0][0].where;
    expect(Array.isArray(where)).toBe(true); // OR across the six columns
    expect(where.map((w: any) => Object.keys(w)[1])).toEqual([
      'ammonia',
      'nitrite',
      'nitrate',
      'alkalinity',
      'hardness',
      'transparency',
    ]);
  });

  it('is unchanged without the flag', async () => {
    const { service, repo } = makeService([]);

    await service.findAll('pond-1', 'u1');

    expect(repo.findAndCount.mock.calls[0][0].where).toEqual({
      pondId: 'pond-1',
    });
  });
});
