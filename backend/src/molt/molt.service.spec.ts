import { BadRequestException, ConflictException } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { deriveItems, HANDLED_WATCH_TEXT, isMineralTreatment, MoltEvidence, MoltItem, MoltService, MOLT_ITEMS, moltAlertFor, PondMolt } from './molt.service';
import { windowForPeak } from './molt-window';
import { MoltActionDto, MoltController } from './molt.controller';

const none: MoltEvidence = {
  minerals: false,
  alkalinity: false,
  peakDo: false,
  handlingInPeak: false,
  postSampling: false,
  feedBaselineKg: null,
  peakFeedDaysKg: [],
  postFeedDaysKg: [],
};
const byKey = (items: ReturnType<typeof deriveItems>) =>
  Object.fromEntries(items.map((i) => [i.key, i]));

const W0 = windowForPeak(new Date('2026-09-11T03:28:07Z'), 'new');
const DAY = { pre: '2026-09-08', peak: '2026-09-11', post: '2026-09-13', inter: '2026-09-20' } as const;
const dv = (phase: keyof typeof DAY, ev: MoltEvidence, manual: Set<string>) =>
  deriveItems(phase, ev, manual, DAY[phase], W0);

describe('deriveItems', () => {
  it('shows only the current and earlier phases', () => {
    expect(dv('pre', none, new Set()).map((i) => i.key)).toEqual([
      'minerals',
      'alkalinity_check',
      'aerator_service',
    ]);
    expect(dv('post', none, new Set())).toHaveLength(9);
    expect(dv('inter', none, new Set())).toEqual([]);
  });

  it('auto items are done from evidence, pending without it', () => {
    const on = byKey(
      dv('post', { ...none, minerals: true, alkalinity: true, peakDo: true, postSampling: true }, new Set()),
    );
    expect(on.minerals).toMatchObject({ status: 'done', source: 'auto', route: 'TreatmentLog' });
    expect(on.alkalinity_check.status).toBe('done');
    expect(on.night_do_check.status).toBe('done');
    expect(on.post_sampling.status).toBe('done');
    const off = byKey(dv('post', none, new Set()));
    // Their days are over and nothing was logged: missed, not pending.
    expect(off.minerals.status).toBe('missed');
    expect(off.night_do_check.status).toBe('missed');
    expect(off.restore_feed.status).toBe('pending');
  });

  it('no_handling is done unless sampling/harvest was logged in peak → violated', () => {
    expect(byKey(dv('peak', none, new Set())).no_handling).toMatchObject({
      status: 'done',
      source: 'auto',
    });
    expect(
      byKey(dv('peak', { ...none, handlingInPeak: true }, new Set())).no_handling.status,
    ).toBe('violated');
  });

  it('manual items follow ticks', () => {
    const items = byKey(dv('post', none, new Set(['aerator_service', 'restore_feed'])));
    expect(items.aerator_service).toMatchObject({ status: 'done', source: 'manual' });
    expect(items.restore_feed.status).toBe('done');
    expect(items.soft_shell_check).toMatchObject({ status: 'pending', source: 'manual' });
  });

  it('feed_cut: no baseline → manual; ≤85% on every logged peak day → done', () => {
    expect(byKey(dv('peak', none, new Set())).feed_cut.source).toBe('manual');
    expect(
      byKey(dv('peak', none, new Set(['feed_cut']))).feed_cut.status,
    ).toBe('done');
    const ev = { ...none, feedBaselineKg: 100 };
    expect(byKey(dv('peak', { ...ev, peakFeedDaysKg: [85, 70] }, new Set())).feed_cut)
      .toMatchObject({ status: 'done', source: 'auto' });
    expect(byKey(dv('peak', { ...ev, peakFeedDaysKg: [85, 90] }, new Set())).feed_cut.status)
      .toBe('pending');
    // Baseline exists but nothing logged yet in peak: not done.
    expect(byKey(dv('peak', ev, new Set())).feed_cut.status).toBe('pending');
  });
});

// Regression (spec 2026-09-14-attendance-and-molt-fixes A.7): window 2026-09-11-new,
// pre 08..09 · peak 10..12 · post 13..14 Sep.
describe('molt alert — only what can still be done today', () => {
  const W = windowForPeak(new Date('2026-09-11T03:28:07Z'), 'new');
  const derive = (phase: 'pre' | 'peak' | 'post', today: string, ev: MoltEvidence = none, manual: string[] = []) =>
    deriveItems(phase, ev, new Set(manual), today, W);
  const pm = (phase: 'pre' | 'peak' | 'post', items: MoltItem[]): PondMolt => ({
    pondId: 'p1', window: W, phase, eligible: true, sizeUnknown: false, abwG: 12, items, pendingCritical: 0,
  });

  it('R1 post with nothing logged → "1 action pending", one step', () => {
    const a = moltAlertFor(pm('post', derive('post', '2026-09-14')))!;
    expect(a.title).toBe('Post-molt — 1 action pending');
    expect(a.steps).toHaveLength(1);
  });

  it('R2 no peak advice in post; feed_cut is missed', () => {
    const items = derive('post', '2026-09-14');
    const a = moltAlertFor(pm('post', items))!;
    expect(a.steps.some((s) => s.includes('Cut feed'))).toBe(false);
    expect(byKey(items).feed_cut.status).toBe('missed');
  });

  it('R3 post with restore_feed ticked → no alert', () => {
    expect(moltAlertFor(pm('post', derive('post', '2026-09-14', none, ['restore_feed'])))).toBeNull();
  });

  it('R4 peak with nothing logged → critical: feed_cut, night DO, minerals, alkalinity', () => {
    const items = derive('peak', '2026-09-12');
    const a = moltAlertFor(pm('peak', items))!;
    expect(a.severity).toBe('critical');
    expect(a.steps).toEqual(
      ['feed_cut', 'night_do_check', 'minerals', 'alkalinity_check'].map((k) => MOLT_ITEMS.find((d) => d.key === k)!.text),
    );
    expect(a.title).toBe('Molt peak — 4 actions pending');
  });

  it('actionable ranges per item (A.4)', () => {
    const items = byKey(derive('post', '2026-09-13'));
    expect(items.minerals).toMatchObject({ actionableFrom: '2026-09-08', actionableUntil: '2026-09-12', actionable: false, status: 'missed' });
    expect(items.aerator_service).toMatchObject({ actionableFrom: '2026-09-08', actionableUntil: '2026-09-09' });
    expect(items.night_do_check).toMatchObject({ actionableFrom: '2026-09-10', actionableUntil: '2026-09-12' });
    expect(items.soft_shell_check).toMatchObject({ actionableFrom: '2026-09-13', actionableUntil: '2026-09-14', actionable: true });
    // minerals still actionable at peak end, not missed
    expect(byKey(derive('peak', '2026-09-12')).minerals).toMatchObject({ actionable: true, status: 'pending' });
    // aerator_service not done by peak → missed, routine → never counted
    expect(byKey(derive('peak', '2026-09-10')).aerator_service.status).toBe('missed');
  });

  it('violated stays violated after its days, and is not counted', () => {
    const items = derive('post', '2026-09-14', { ...none, handlingInPeak: true }, ['restore_feed']);
    expect(byKey(items).no_handling.status).toBe('violated');
    expect(moltAlertFor(pm('post', items))).toBeNull();
  });

  it('alert carries actions for the counted items, same order as steps', () => {
    const a = moltAlertFor(pm('peak', derive('peak', '2026-09-11')))!;
    expect(a.actions).toEqual({
      pondId: 'p1',
      windowKey: '2026-09-11-new',
      items: [
        { key: 'feed_cut', source: 'manual', route: 'FeedLog' },
        { key: 'night_do_check', source: 'auto', route: 'WaterQualityLog' },
        { key: 'minerals', source: 'manual', route: 'TreatmentLog' },
        { key: 'alkalinity_check', source: 'auto', route: 'WaterQualityLog' },
      ],
    });
  });

  it('post step texts are phase-appropriate', () => {
    const text = (k: string) => MOLT_ITEMS.find((d) => d.key === k)!.text;
    expect(text('feed_cut')).toBe('Cut feed 15–30% today (molt peak)');
    expect(text('restore_feed')).toBe('Restore feed as trays clear (+5–10% over 2–3 days)');
    expect(text('soft_shell_check')).toBe('Check for soft shells and cannibalism');
    expect(text('post_sampling')).toBe('Sample once shells harden');
  });

  describe('restore_feed (Q2: auto + manual)', () => {
    const fed = (peak: number[], post: number[]) => ({ ...none, peakFeedDaysKg: peak, postFeedDaysKg: post });
    it('auto done when a post day beats the max peak day', () => {
      expect(byKey(derive('post', '2026-09-14', fed([60, 80], [70, 81]))).restore_feed)
        .toMatchObject({ status: 'done', source: 'auto' });
    });
    it('equal to the max peak day is not enough', () => {
      expect(byKey(derive('post', '2026-09-14', fed([60, 80], [80]))).restore_feed)
        .toMatchObject({ status: 'pending', source: 'manual' });
    });
    it('no peak feed logged → manual only', () => {
      expect(byKey(derive('post', '2026-09-14', fed([], [200]))).restore_feed)
        .toMatchObject({ status: 'pending', source: 'manual' });
    });
    it('manual tick wins', () => {
      expect(byKey(derive('post', '2026-09-14', fed([80], [10]), ['restore_feed'])).restore_feed)
        .toMatchObject({ status: 'done', source: 'manual' });
    });
  });
});

/**
 * Service with a fake database: every set-based evidence query returns rows
 * from `rows` by table name; the sampling "latest ABW" query returns `abw`.
 */
const makeService = (
  opts: { abw?: number | null; samplings?: (number | null)[]; rows?: Record<string, any[]>; ticks?: any[] } = {},
) => {
  const query = jest.fn(async (sql: string) => {
    if (sql.includes('DISTINCT ON (crop_id)')) {
      // samplings: MBW per row, newest first; the SQL's own filter decides.
      const rows = opts.samplings ?? (opts.abw === undefined ? [] : [opts.abw]);
      const eligible = sql.includes('mbw_g IS NOT NULL') ? rows.filter((m) => m != null) : rows;
      return eligible.length ? [{ cropId: 'c1', mbwG: eligible[0] }] : [];
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
const POST = new Date('2026-09-14T06:00:00Z');

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
    // no_handling violated is history, not an open action (M1.3): night DO only.
    expect((await svc.forPond('p1', 'u1', PEAK)).pendingCritical).toBe(1);
  });

  it('restore_feed auto-done from post feed in the same feed query (no extra queries)', async () => {
    const { svc, query } = makeService({
      abw: 12,
      rows: {
        feed_records: [
          { pondId: 'p1', day: '2026-09-11', kg: '80' },
          { pondId: 'p1', day: '2026-09-13', kg: '85' },
        ],
      },
    });
    const pm = await svc.forPond('p1', 'u1', POST);
    expect(byKey(pm.items).restore_feed).toMatchObject({ status: 'done', source: 'auto' });
    expect(query).toHaveBeenCalledTimes(8); // ABW + 7 set-based evidence queries
    const feedSql = query.mock.calls.find((c: any[]) => String(c[0]).includes('feed_records'))! as any[];
    // Feed range runs through post end (IST 14 Sep ends 18:29:59.999Z).
    expect((feedSql[1] as any[])[2].toISOString()).toBe('2026-09-14T18:29:59.999Z');
  });

  describe('soft_shell_check (D6 / M2 entry 2)', () => {
    it('auto-done from a soft-shell observation in post', async () => {
      const { svc, query } = makeService({
        abw: 12,
        rows: { health_observations: [{ pondId: 'p1' }] },
      });
      const pm = await svc.forPond('p1', 'u1', POST);
      expect(byKey(pm.items).soft_shell_check).toMatchObject({ status: 'done', source: 'auto' });
      const sql = query.mock.calls.find((c: any[]) => String(c[0]).includes('health_observations'))! as any[];
      expect(String(sql[0])).toContain("sign = 'soft_shell'");
      // post only: 13..14 Sep
      expect((sql[1] as any[]).slice(1)).toEqual(['2026-09-13', '2026-09-14']);
    });

    it('no observation → still a manual item', async () => {
      const { svc } = makeService({ abw: 12 });
      const pm = await svc.forPond('p1', 'u1', POST);
      expect(byKey(pm.items).soft_shell_check).toMatchObject({ status: 'pending', source: 'manual' });
    });

    it('table not migrated yet (42P01) → checklist still loads, item manual', async () => {
      const { svc, query } = makeService({ abw: 12 });
      const base = query.getMockImplementation()!;
      query.mockImplementation(async (sql: string, ...rest: any[]) => {
        if (sql.includes('health_observations')) throw Object.assign(new Error('x'), { code: '42P01' });
        return (base as any)(sql, ...rest);
      });
      const pm = await svc.forPond('p1', 'u1', POST);
      expect(byKey(pm.items).soft_shell_check.status).toBe('pending');
    });
  });

  it('checks READ on the pond through FarmAccessService', async () => {
    const { svc, farmAccess } = makeService({ abw: 12 });
    await svc.forPond('p1', 'u1', PEAK);
    expect(farmAccess.assertCanAccessPond).toHaveBeenCalledWith('u1', 'p1', 'READ');
  });
});

describe('MoltController POST /molt/ponds/:pondId/actions', () => {
  it('rejects a windowKey that is not the current window with 409 (stale replay = done)', async () => {
    const { svc, actions } = makeService({ abw: 12 });
    await expect(
      svc.setAction('p1', 'u1', { windowKey: '2026-08-28-full', actionKey: 'aerator_service', done: true }, PRE),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(actions.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('rejects an auto actionKey', async () => {
    const { svc, actions } = makeService({ abw: 12 });
    await expect(
      svc.setAction('p1', 'u1', { windowKey: '2026-09-11-new', actionKey: 'alkalinity_check', done: true }, PRE),
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

  it('rejects ticking a missed item (its days are over) with 409', async () => {
    const { svc, actions } = makeService({ abw: 12 });
    await expect(
      svc.setAction('p1', 'u1', { windowKey: '2026-09-11-new', actionKey: 'aerator_service', done: true }, POST),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(actions.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('restore_feed stays tickable in post, even when feed logs already satisfy it', async () => {
    const { svc, actions } = makeService({
      abw: 12,
      rows: { feed_records: [{ pondId: 'p1', day: '2026-09-11', kg: '80' }, { pondId: 'p1', day: '2026-09-13', kg: '90' }] },
    });
    const pm = await svc.setAction(
      'p1', 'u1', { windowKey: '2026-09-11-new', actionKey: 'restore_feed', done: true }, POST,
    );
    expect(actions.createQueryBuilder).toHaveBeenCalled();
    expect(pm.items.find((i) => i.key === 'restore_feed')).toMatchObject({ status: 'done', source: 'manual' });
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

describe('M1 molt correctness', () => {
  const W = windowForPeak(new Date('2026-09-11T03:28:07Z'), 'new');
  const pmOf = (phase: 'pre' | 'peak' | 'post', items: MoltItem[]): PondMolt => ({
    pondId: 'p1', window: W, phase, eligible: true, sizeUnknown: false, abwG: 12, items, pendingCritical: 0,
  });

  describe('M1.1 minerals evidence', () => {
    it.each([
      ['MOP 25 kg', true],
      ['KCl', true],
      ['MgSO4 and CaCl2', true],
      ['Agricultural lime', true],
      ['Dolomite', true],
      ['mineral mix', true],
      ['पोटाश 10 किलो', true],
      ['ডলোমাইট', true],
      ['சுண்ணாம்பு', true],
      ['సున్నం', true],
      ['ଖଣିଜ ମିଶ୍ରଣ', true],
      ['Oxytetracycline 2 g/kg feed', false],
      ['Can of probiotic', false],
      ['BKC 1 L', false],
      ['Potassium permanganate 2 ppm', false],
      ['KMnO4', false],
    ])('%s → %s', (description, expected) => {
      expect(isMineralTreatment({ description, notes: null })).toBe(expected);
    });

    it('reads notes too (old clients put the product there)', () => {
      expect(isMineralTreatment({ description: 'Molt prep', notes: 'Product: Aqua Mineral Mix.' })).toBe(true);
    });

    it('an NH3 test in pre does NOT tick minerals', async () => {
      const { svc } = makeService({
        abw: 12,
        rows: { chemical_data: [{ cropId: 'c1', alk: false }] },
      });
      expect(byKey((await svc.forPond('p1', 'u1', PRE)).items).minerals).toMatchObject({
        status: 'pending',
        source: 'manual',
      });
    });

    it('a mineral treatment does; an antibiotic does not', async () => {
      const mineral = makeService({
        abw: 12,
        rows: { treatments: [{ cropId: 'c1', description: 'Dolomite 50 kg', notes: null }] },
      });
      expect(byKey((await mineral.svc.forPond('p1', 'u1', PRE)).items).minerals).toMatchObject({
        status: 'done',
        source: 'auto',
      });
      const antibiotic = makeService({
        abw: 12,
        rows: { treatments: [{ cropId: 'c1', description: 'Oxytetracycline', notes: null }] },
      });
      expect(byKey((await antibiotic.svc.forPond('p1', 'u1', PRE)).items).minerals.status).toBe('pending');
    });

    it('minerals is auto + manual: a farmer who dosed without logging can tick it', async () => {
      const { svc, actions } = makeService({ abw: 12 });
      const pm = await svc.setAction('p1', 'u1', { windowKey: '2026-09-11-new', actionKey: 'minerals', done: true }, PRE);
      expect(actions.createQueryBuilder).toHaveBeenCalled();
      expect(byKey(pm.items).minerals).toMatchObject({ status: 'done', source: 'manual' });
    });
  });

  it('M1.2 a newer sampling without MBW does not make the pond sizeUnknown', async () => {
    const { svc } = makeService({ samplings: [null, 12] });
    const pm = await svc.forPond('p1', 'u1', PEAK);
    expect(pm).toMatchObject({ sizeUnknown: false, eligible: true, abwG: 12 });
  });

  describe('M1.3 violated handling', () => {
    const ev = { ...none, handlingInPeak: true, peakDo: true, minerals: true, alkalinity: true };

    it('stays violated but the alert clears once the other items are done', () => {
      const items = deriveItems('peak', ev, new Set(['feed_cut']), '2026-09-11', W);
      expect(byKey(items).no_handling.status).toBe('violated');
      expect(moltAlertFor(pmOf('peak', items))).toBeNull();
    });

    it('while others are open: not counted, not critical on its own, plus one watch step', () => {
      // Only minerals open (important) + violated handling → a watch alert, not critical.
      const items = deriveItems('peak', { ...ev, minerals: false }, new Set(['feed_cut']), '2026-09-11', W);
      const a = moltAlertFor(pmOf('peak', items))!;
      expect(a.severity).toBe('watch');
      expect(a.title).toBe('Molt peak — 1 action pending');
      expect(a.steps).toEqual([MOLT_ITEMS.find((d) => d.key === 'minerals')!.text, HANDLED_WATCH_TEXT]);
      expect(a.stepKeys).toEqual([{ key: 'engines.lunar.item_minerals' }, { key: 'engines.lunar.handledWatch' }]);
      expect(a.actions.items.map((i) => i.key)).toEqual(['minerals']);
    });
  });

  it('M1.6 alert carries i18n keys beside the English', () => {
    const a = moltAlertFor(pmOf('peak', deriveItems('peak', none, new Set(), '2026-09-11', W)))!;
    expect(a.titleKey).toEqual({ key: 'engines.lunar.alertTitle_peak', params: { count: 4 } });
    expect(a.bodyKey).toEqual({ key: 'engines.lunar.windowNew', params: { date: '2026-09-11' } });
    expect(a.stepKeys.map((k) => k.key)).toEqual(
      ['feed_cut', 'night_do_check', 'minerals', 'alkalinity_check'].map((k) => `engines.lunar.item_${k}`),
    );
    expect(a.title).toBe('Molt peak — 4 actions pending');
  });

  describe('M1.5 offline tick', () => {
    const ID = '2f1c6b8e-6d1a-4a53-9a57-2b0f5c1e9a10';

    it('stores the client id and inserts with ON CONFLICT DO NOTHING, so a replay lands once', async () => {
      const { svc, actions } = makeService({ abw: 12 });
      const body = { id: ID, windowKey: '2026-09-11-new', actionKey: 'aerator_service', done: true };
      await svc.setAction('p1', 'u1', body, PRE);
      await svc.setAction('p1', 'u1', body, PRE); // the replay
      const qbs = actions.createQueryBuilder.mock.results.map((r: any) => r.value);
      expect(qbs).toHaveLength(2);
      for (const qb of qbs) {
        expect(qb.values).toHaveBeenCalledWith(expect.objectContaining({ id: ID, pondId: 'p1', actionKey: 'aerator_service' }));
      }
      expect(actions.delete).not.toHaveBeenCalled();
    });

    it('a tick replayed after its window closed is 409 (the client treats it as done)', async () => {
      const { svc, actions } = makeService({ abw: 12 });
      await expect(
        svc.setAction('p1', 'u1', { id: ID, windowKey: '2026-09-11-new', actionKey: 'aerator_service', done: true },
          new Date('2026-09-20T06:00:00Z')),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(actions.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('DTO keeps the client id through whitelist and rejects a non-UUID', async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });
      const meta = { type: 'body' as const, metatype: MoltActionDto };
      const out = await pipe.transform({ id: ID, windowKey: '2026-09-11-new', actionKey: 'aerator_service', done: true }, meta);
      expect(out.id).toBe(ID);
      await expect(
        pipe.transform({ id: 'nope', windowKey: '2026-09-11-new', actionKey: 'aerator_service', done: true }, meta),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
