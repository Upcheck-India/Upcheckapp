import { BadRequestException } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { deriveItems, MoltEvidence, MoltService } from './molt.service';
import { MoltActionDto, MoltController } from './molt.controller';

const none: MoltEvidence = {
  minerals: false,
  alkalinity: false,
  peakDo: false,
  handlingInPeak: false,
  postSampling: false,
  feedBaselineKg: null,
  peakFeedDaysKg: [],
};
const byKey = (items: ReturnType<typeof deriveItems>) =>
  Object.fromEntries(items.map((i) => [i.key, i]));

describe('deriveItems', () => {
  it('shows only the current and earlier phases', () => {
    expect(deriveItems('pre', none, new Set()).map((i) => i.key)).toEqual([
      'minerals',
      'alkalinity_check',
      'aerator_service',
    ]);
    expect(deriveItems('post', none, new Set())).toHaveLength(9);
    expect(deriveItems('inter', none, new Set())).toEqual([]);
  });

  it('auto items are done from evidence, pending without it', () => {
    const on = byKey(
      deriveItems('post', { ...none, minerals: true, alkalinity: true, peakDo: true, postSampling: true }, new Set()),
    );
    expect(on.minerals).toMatchObject({ status: 'done', source: 'auto', route: 'ChemicalLog' });
    expect(on.alkalinity_check.status).toBe('done');
    expect(on.night_do_check.status).toBe('done');
    expect(on.post_sampling.status).toBe('done');
    const off = byKey(deriveItems('post', none, new Set()));
    expect(off.minerals.status).toBe('pending');
    expect(off.night_do_check.status).toBe('pending');
  });

  it('no_handling is done unless sampling/harvest was logged in peak → violated', () => {
    expect(byKey(deriveItems('peak', none, new Set())).no_handling).toMatchObject({
      status: 'done',
      source: 'auto',
    });
    expect(
      byKey(deriveItems('peak', { ...none, handlingInPeak: true }, new Set())).no_handling.status,
    ).toBe('violated');
  });

  it('manual items follow ticks', () => {
    const items = byKey(deriveItems('post', none, new Set(['aerator_service', 'restore_feed'])));
    expect(items.aerator_service).toMatchObject({ status: 'done', source: 'manual' });
    expect(items.restore_feed.status).toBe('done');
    expect(items.soft_shell_check).toMatchObject({ status: 'pending', source: 'manual' });
  });

  it('feed_cut: no baseline → manual; ≤85% on every logged peak day → done', () => {
    expect(byKey(deriveItems('peak', none, new Set())).feed_cut.source).toBe('manual');
    expect(
      byKey(deriveItems('peak', none, new Set(['feed_cut']))).feed_cut.status,
    ).toBe('done');
    const ev = { ...none, feedBaselineKg: 100 };
    expect(byKey(deriveItems('peak', { ...ev, peakFeedDaysKg: [85, 70] }, new Set())).feed_cut)
      .toMatchObject({ status: 'done', source: 'auto' });
    expect(byKey(deriveItems('peak', { ...ev, peakFeedDaysKg: [85, 90] }, new Set())).feed_cut.status)
      .toBe('pending');
    // Baseline exists but nothing logged yet in peak: not done.
    expect(byKey(deriveItems('peak', ev, new Set())).feed_cut.status).toBe('pending');
  });
});

/**
 * Service with a fake database: every set-based evidence query returns rows
 * from `rows` by table name; the sampling "latest ABW" query returns `abw`.
 */
const makeService = (opts: { abw?: number | null; rows?: Record<string, any[]>; ticks?: any[] } = {}) => {
  const query = jest.fn(async (sql: string) => {
    if (sql.includes('DISTINCT ON (crop_id)')) {
      return opts.abw === undefined ? [] : [{ cropId: 'c1', mbwG: opts.abw }];
    }
    const table = sql.match(/FROM (\w+)/)![1];
    return opts.rows?.[table] ?? [];
  });
  const actions = {
    find: jest.fn(async () => opts.ticks ?? []),
    delete: jest.fn(async () => undefined),
    createQueryBuilder: jest.fn(() => {
      const qb: any = {};
      qb.insert = () => qb;
      qb.values = jest.fn(() => qb);
      qb.orIgnore = () => qb;
      qb.execute = jest.fn(async () => undefined);
      return qb;
    }),
  };
  const farmAccess = {
    assertCanAccessPond: jest.fn(async () => ({ id: 'p1', activeCycleId: 'c1' })),
  };
  const svc = new MoltService(actions as any, {} as any, { query } as any, farmAccess as any);
  return { svc, query, actions, farmAccess };
};

// 2026-09-11 true new moon → peak 10..12 Sep IST.
const PEAK = new Date('2026-09-11T06:00:00Z');
const PRE = new Date('2026-09-08T06:00:00Z');

describe('MoltService', () => {
  it('ABW < 5 g is not eligible and runs no evidence queries', async () => {
    const { svc, query } = makeService({ abw: 4.9 });
    const pm = await svc.forPond('p1', 'u1', PEAK);
    expect(pm).toMatchObject({ eligible: false, sizeUnknown: false, abwG: 4.9, items: [] });
    expect(query).toHaveBeenCalledTimes(1); // only the ABW lookup
  });

  it('ABW exactly 5 g is eligible', async () => {
    const { svc } = makeService({ abw: 5 });
    const pm = await svc.forPond('p1', 'u1', PEAK);
    expect(pm.eligible).toBe(true);
    expect(pm.phase).toBe('peak');
    expect(pm.window?.key).toBe('2026-09-11-new');
  });

  it('active cycle with no sampling → sizeUnknown, no checklist', async () => {
    const { svc } = makeService();
    const pm = await svc.forPond('p1', 'u1', PEAK);
    expect(pm).toMatchObject({ eligible: false, sizeUnknown: true, abwG: null, items: [] });
  });

  it('derives statuses from logs and counts pending critical', async () => {
    const { svc } = makeService({
      abw: 12,
      rows: {
        sampling_data: [{ pondId: 'p1', inPeak: true, inPost: false }],
        water_quality_records: [{ pondId: 'p1', alk: true, peakDo: false }],
        feed_records: [
          { pondId: 'p1', day: '2026-09-05', kg: '100' },
          { pondId: 'p1', day: '2026-09-10', kg: '80' },
        ],
      },
      ticks: [{ pondId: 'p1', actionKey: 'aerator_service' }],
    });
    const items = byKey((await svc.forPond('p1', 'u1', PEAK)).items);
    expect(items.no_handling.status).toBe('violated');
    expect(items.alkalinity_check.status).toBe('done');
    expect(items.minerals.status).toBe('pending');
    expect(items.feed_cut).toMatchObject({ status: 'done', source: 'auto' });
    expect(items.aerator_service.status).toBe('done');
    expect((await svc.forPond('p1', 'u1', PEAK)).pendingCritical).toBe(2);
  });

  it('checks READ on the pond through FarmAccessService', async () => {
    const { svc, farmAccess } = makeService({ abw: 12 });
    await svc.forPond('p1', 'u1', PEAK);
    expect(farmAccess.assertCanAccessPond).toHaveBeenCalledWith('u1', 'p1', 'READ');
  });
});

describe('MoltController POST /molt/ponds/:pondId/actions', () => {
  it('rejects a windowKey that is not the current window', async () => {
    const { svc, actions } = makeService({ abw: 12 });
    await expect(
      svc.setAction('p1', 'u1', { windowKey: '2026-08-28-full', actionKey: 'aerator_service', done: true }, PRE),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(actions.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('rejects an auto actionKey', async () => {
    const { svc, actions } = makeService({ abw: 12 });
    await expect(
      svc.setAction('p1', 'u1', { windowKey: '2026-09-11-new', actionKey: 'minerals', done: true }, PRE),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(actions.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('ticks and un-ticks a manual item on the current window with WRITE_OPERATIONAL', async () => {
    const { svc, actions, farmAccess } = makeService({ abw: 12 });
    const pm = await svc.setAction(
      'p1', 'u1', { windowKey: '2026-09-11-new', actionKey: 'aerator_service', done: true }, PRE,
    );
    expect(farmAccess.assertCanAccessPond).toHaveBeenCalledWith('u1', 'p1', 'WRITE_OPERATIONAL');
    expect(actions.createQueryBuilder).toHaveBeenCalled();
    expect(pm.items.find((i) => i.key === 'aerator_service')?.status).toBe('done');
    await svc.setAction('p1', 'u1', { windowKey: '2026-09-11-new', actionKey: 'aerator_service', done: false }, PRE);
    expect(actions.delete).toHaveBeenCalledWith({
      pondId: 'p1', windowKey: '2026-09-11-new', actionKey: 'aerator_service',
    });
  });

  it('controller passes through to the service', async () => {
    const service = { setAction: jest.fn(async () => 'ok') };
    const ctl = new MoltController(service as any);
    const body = { windowKey: '2026-09-11-new', actionKey: 'aerator_service', done: true };
    await expect(ctl.setAction('p1', body, { id: 'u1' })).resolves.toBe('ok');
    expect(service.setAction).toHaveBeenCalledWith('p1', 'u1', body);
  });

  it('DTO rejects malformed bodies at the trust boundary', async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });
    const meta = { type: 'body' as const, metatype: MoltActionDto };
    await expect(
      pipe.transform({ windowKey: 'now', actionKey: 'aerator_service', done: true }, meta),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      pipe.transform({ windowKey: '2026-09-11-new', actionKey: 'aerator_service', done: 'yes' }, meta),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
