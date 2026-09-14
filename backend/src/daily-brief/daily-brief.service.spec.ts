import { BadRequestException, ForbiddenException, NotFoundException, ValidationPipe } from '@nestjs/common';
import { DailyBriefService, assertBriefDate } from './daily-brief.service';
import { DailyBriefQueryDto } from './daily-brief.controller';
import { PondContextService } from '../pond-context/pond-context.service';
import { ShrimpCalculationsService } from '../shrimp-calculations/shrimp-calculations.service';
import { addDays } from '../molt/molt-window';

const NOW = new Date('2026-09-14T10:00:00Z'); // 15:30 IST, 14 Sep
const FARM = '11111111-1111-4111-8111-111111111111';
const FARM2 = '22222222-2222-4222-8222-222222222222';

type Rows = Record<string, any[]>;

const pondRow = (id: string, over: any = {}) => ({
  id, farm_id: FARM, name: `Pond ${id}`, area: 1000, crop_id: `crop-${id}`,
  stocking_date: '2026-08-01', initial_age_days: 0, stocking_count: 100000,
  target_cultivation_days: 120, end_day: '9999-12-31', species: 'Penaeus vannamei', ...over,
});

function build(opts: {
  rows?: Rows;
  role?: string | ((farmId: string) => string);
  farms?: string[];
  ponds?: Record<string, string[]>;
} = {}) {
  const calls: { tag: string; sql: string; params: any[] }[] = [];
  const rows = opts.rows ?? {};
  const dataSource = {
    query: jest.fn(async (sql: string, params: any[]) => {
      const tag = /\/\*daily-brief:(\w+)\*\//.exec(sql)![1];
      calls.push({ tag, sql, params });
      if (tag === 'farms') return params[0].map((id: string) => ({ id, name: `Farm ${id.slice(0, 1)}` }));
      if (tag === 'ponds') {
        const all = rows.ponds ?? [];
        return all.filter((p) => params[0].includes(p.id));
      }
      return rows[tag] ?? [];
    }),
  };
  const farms = opts.farms ?? [FARM];
  const pondMap = opts.ponds ?? { [FARM]: (rows.ponds ?? []).map((p) => p.id) };
  const roleOf = (f: string) => (typeof opts.role === 'function' ? opts.role(f) : (opts.role ?? 'owner'));
  const farmAccess = {
    getAccessibleFarmIds: jest.fn().mockResolvedValue(farms),
    assertCanAccessFarm: jest.fn().mockResolvedValue({}),
    getMembershipOnFarm: jest.fn(async (_u: string, f: string) => ({ role: roleOf(f), overrides: null, policy: null })),
    getAccessiblePondIds: jest.fn(async (_u: string, f: string) => pondMap[f] ?? []),
  };
  const molt = { checklistsFor: jest.fn().mockResolvedValue(new Map()) };
  const svc = new DailyBriefService(
    dataSource as any,
    farmAccess as any,
    molt as any,
    Object.create(PondContextService.prototype),
    new ShrimpCalculationsService(),
  );
  return { svc, calls, farmAccess, dataSource, molt };
}

describe('assertBriefDate', () => {
  it('accepts today IST even when it is still yesterday in UTC', () => {
    // 20:00 UTC on 13 Sep = 01:30 IST on 14 Sep.
    expect(() => assertBriefDate('2026-09-14', new Date('2026-09-13T20:00:00Z'))).not.toThrow();
    expect(() => assertBriefDate('2026-09-15', new Date('2026-09-13T20:00:00Z'))).toThrow(BadRequestException);
  });
  it('rejects future, before 2020-01-01, malformed and impossible dates', () => {
    expect(() => assertBriefDate('2026-09-15', NOW)).toThrow(BadRequestException);
    expect(() => assertBriefDate('2019-12-31', NOW)).toThrow(BadRequestException);
    expect(() => assertBriefDate('2020-01-01', NOW)).not.toThrow();
    expect(() => assertBriefDate('2026-02-30', NOW)).toThrow(BadRequestException);
    expect(() => assertBriefDate('14-09-2026', NOW)).toThrow(BadRequestException);
  });
  it('the service rejects before touching the database', async () => {
    const { svc, dataSource, farmAccess } = build();
    await expect(svc.get('u1', { date: '2026-09-15' }, NOW)).rejects.toBeInstanceOf(BadRequestException);
    expect(dataSource.query).not.toHaveBeenCalled();
    expect(farmAccess.getAccessibleFarmIds).not.toHaveBeenCalled();
  });
});

describe('DailyBriefService — access', () => {
  it('propagates 404/403 for an explicit farm', async () => {
    const a = build();
    a.farmAccess.assertCanAccessFarm.mockRejectedValueOnce(new NotFoundException());
    await expect(a.svc.get('u1', { date: '2026-09-14', farmId: FARM }, NOW)).rejects.toBeInstanceOf(NotFoundException);
    const b = build();
    b.farmAccess.assertCanAccessFarm.mockRejectedValueOnce(new ForbiddenException());
    await expect(b.svc.get('u1', { date: '2026-09-14', farmId: FARM }, NOW)).rejects.toBeInstanceOf(ForbiddenException);
    expect(b.farmAccess.assertCanAccessFarm).toHaveBeenCalledWith('u1', FARM, 'READ');
  });

  it('pond scoping: only scoped ponds are queried and returned', async () => {
    const { svc, calls } = build({
      rows: { ponds: [pondRow('p1'), pondRow('p2')] },
      role: 'worker',
      ponds: { [FARM]: ['p1'] },
    });
    const brief = await svc.get('u1', { date: '2026-09-14' }, NOW);
    expect(brief.ponds.map((p) => p.pondId)).toEqual(['p1']);
    for (const c of calls) {
      for (const param of c.params) {
        if (Array.isArray(param) && param.some((x) => typeof x === 'string' && x.startsWith('p'))) {
          expect(param).toEqual(['p1']);
        }
      }
    }
  });

  it('no farms ⇒ empty brief, no data queries', async () => {
    const { svc, calls } = build({ farms: [] });
    const brief = await svc.get('u1', { date: '2026-09-14' }, NOW);
    expect(brief.ponds).toEqual([]);
    expect(brief.score).toBeNull();
    expect(brief.verdict.band).toBe('none');
    expect(calls).toEqual([]);
  });

  it('a fixed number of queries regardless of pond count', async () => {
    const many = Array.from({ length: 30 }, (_, i) => pondRow(`p${i}`));
    const a = build({ rows: { ponds: many.slice(0, 2) } });
    await a.svc.get('u1', { date: '2026-09-14' }, NOW);
    const b = build({ rows: { ponds: many } });
    await b.svc.get('u1', { date: '2026-09-14' }, NOW);
    expect(b.calls.length).toBe(a.calls.length);
    expect(b.molt.checklistsFor).toHaveBeenCalledTimes(1);
  });
});

describe('DailyBriefService — VIEW_FINANCIALS', () => {
  const money = { money: [{ spend: 1500.5, income: 9000 }] };

  it('owner sees spend/income', async () => {
    const { svc } = build({ rows: money });
    const brief = await svc.get('u1', { date: '2026-09-14' }, NOW);
    expect(brief.canViewFinancials).toBe(true);
    expect(brief.totals.spend).toBe(1500.5);
    expect(brief.totals.income).toBe(9000);
  });

  it('worker gets null money and the money query is never issued', async () => {
    const { svc, calls } = build({ rows: money, role: 'worker' });
    const brief = await svc.get('u1', { date: '2026-09-14' }, NOW);
    expect(brief.canViewFinancials).toBe(false);
    expect(brief.totals.spend).toBeNull();
    expect(brief.totals.income).toBeNull();
    expect(calls.map((c) => c.tag)).not.toContain('money');
  });

  it('must hold it on EVERY farm in scope', async () => {
    const { svc } = build({ rows: money, farms: [FARM, FARM2], role: (f) => (f === FARM ? 'owner' : 'viewer') });
    const brief = await svc.get('u1', { date: '2026-09-14' }, NOW);
    expect(brief.canViewFinancials).toBe(false);
    expect(brief.totals.spend).toBeNull();
  });
});

describe('DailyBriefService — IST day boundaries', () => {
  const rows = {
    ponds: [pondRow('p1')],
    wq: [
      // 23:45 IST on 14 Sep
      { pond_id: 'p1', recorded_at: '2026-09-14T18:15:00Z', do: 5, ph: 8 },
      // 00:15 IST on 15 Sep
      { pond_id: 'p1', recorded_at: '2026-09-14T18:45:00Z', do: 2.5, ph: 8 },
    ],
  };

  it('asks for D−1 00:00 IST .. D 23:59:59.999 IST', async () => {
    const { svc, calls } = build({ rows });
    await svc.get('u1', { date: '2026-09-14' }, NOW);
    const wq = calls.find((c) => c.tag === 'wq')!;
    expect(wq.params[1].toISOString()).toBe('2026-09-12T18:30:00.000Z');
    expect(wq.params[2].toISOString()).toBe('2026-09-14T18:29:59.999Z');
  });

  it('a 23:45 IST reading belongs to that day; 00:15 IST to the next', async () => {
    const { svc } = build({ rows });
    const d14 = await svc.get('u1', { date: '2026-09-14' }, new Date('2026-09-15T01:00:00Z'));
    expect(d14.ponds[0].water.tests).toBe(1);
    expect(d14.ponds[0].water.do).toMatchObject({ min: 5, zone: 'optimal' });

    const d15 = await svc.get('u1', { date: '2026-09-15' }, new Date('2026-09-15T01:00:00Z'));
    expect(d15.ponds[0].water.do).toMatchObject({ min: 2.5, zone: 'critical' });
    expect(d15.ponds[0].score?.capped).toBe(true);
    // The 23:45 reading of the 14th scores the previous day.
    expect(d15.ponds[0].previousScore).not.toBeNull();
  });
});

describe('DailyBriefService — assembling a day', () => {
  const D = '2026-09-14';
  const rows: Rows = {
    ponds: [pondRow('p1'), pondRow('p2', { crop_id: null, stocking_date: null, end_day: null })],
    wq: [{ pond_id: 'p1', recorded_at: '2026-09-14T00:30:00Z', do: 5.5, ph: 7.9, temperature: 30, ammonia: 0.05 }],
    feed_days: [
      { pond_id: 'p1', day: D, kg: 20 },
      { pond_id: 'p1', day: '2026-09-13', kg: 22 },
      { pond_id: 'p1', day: '2026-09-12', kg: 18 },
      { pond_id: 'p1', day: '2026-09-10', kg: 20 },
      { pond_id: 'p1', day: '2026-09-01', kg: 99 },
    ],
    feed_rows: [{ pond_id: 'p1', recorded_at: '2026-09-14T01:00:00Z', kg: 20, feeding_time: 'morning' }],
    mortality_days: [{ pond_id: 'p1', day: D, qty: 40 }, { pond_id: 'p1', day: '2026-09-10', qty: 7 }],
    mortality_cum: [{ crop_id: 'crop-p1', d: 1000, p: 900 }],
    abw: [{ pond_id: 'p1', mbw: 10 }],
  };

  it('scores the active pond, leaves the idle pond out, DATE rows at 12:00 IST allDay', async () => {
    const { svc } = build({ rows });
    const brief = await svc.get('u1', { date: D }, NOW);
    expect(brief.isToday).toBe(true);
    expect(brief.ponds.map((p) => p.pondId)).toEqual(['p1']);
    const p1 = brief.ponds[0];
    expect(p1.doc).toBe(45);
    expect(p1.feed).toEqual({ kg: 20, prev3DayAvgKg: 20, sessions: ['morning'], trayWorst: null });
    expect(p1.health).toMatchObject({ mortality: 40, livePopulation: 99000, mortality7DayAvg: 1, abwG: 10, biomassKg: 990 });
    expect(p1.health.mortalityPct).toBe(0.04);
    expect(p1.score).not.toBeNull();
    expect(p1.score!.basedOn).toEqual(['water', 'feeding', 'health', 'care']);
    expect(brief.score?.value).toBe(p1.score!.value);
    expect(brief.todo.missingLogs).toEqual([{ pondId: 'p1', kinds: ['tray'] }]);

    const mort = brief.timeline.find((e) => e.kind === 'mortality')!;
    expect(mort).toEqual({ at: '2026-09-14T06:30:00.000Z', allDay: true, kind: 'mortality', pondId: 'p1', summary: '×40' });
    const water = brief.timeline.find((e) => e.kind === 'water')!;
    expect(water.summary).toBe('DO 5.5 · pH 7.9 · 30 °C · NH₃ 0.05');
    expect(water.allDay).toBe(false);
    expect(brief.totals).toMatchObject({ feedKg: 20, feedKgPrev: 22, mortality: 40, waterTests: 1 });
    expect(brief.hasAnyData).toBe(true);
  });

  // Found against production data: an empty pond's single water test scored
  // 100 and lifted the farm score.
  it('a pond with readings but no cycle shows them, is not scored, and does not move the farm score', async () => {
    const withIdle = {
      ...rows,
      wq: [...rows.wq, { pond_id: 'p2', recorded_at: '2026-09-14T01:00:00Z', do: 6, ph: 8, temperature: 30 }],
    };
    const brief = await build({ rows: withIdle }).svc.get('u1', { date: D }, NOW);
    const p2 = brief.ponds.find((p) => p.pondId === 'p2')!;
    expect(p2.cycleActive).toBe(false);
    expect(p2.water.tests).toBe(1);
    expect(p2.score).toBeNull();
    expect(p2.previousScore).toBeNull();
    const p1 = brief.ponds.find((p) => p.pondId === 'p1')!;
    expect(brief.score?.value).toBe(p1.score!.value);
  });

  // Found against production data: a post-molt day listed peak "cut feed" items.
  it('molt to-dos list only items that can still be acted on today', async () => {
    const b = build({ rows });
    const item = (key: string, phase: string, priority: string, status: string, actionable: boolean) =>
      ({ key, phase, priority, status, actionable, source: 'auto', route: null });
    b.molt.checklistsFor.mockResolvedValue(new Map([['p1', {
      pondId: 'p1', eligible: true, phase: 'post', pendingCritical: 0, window: null, sizeUnknown: false, abwG: 10,
      items: [
        item('minerals', 'pre', 'important', 'missed', false),
        item('feed_cut', 'peak', 'critical', 'missed', false),
        item('restore_feed', 'post', 'important', 'pending', true),
        item('post_sampling', 'post', 'routine', 'done', true),
      ],
    }], ['p2', {
      // Peak day: a pre-phase item (minerals) is still actionable to peak end.
      pondId: 'p2', eligible: true, phase: 'peak', pendingCritical: 1, window: null, sizeUnknown: false, abwG: 10,
      items: [
        item('minerals', 'pre', 'important', 'pending', true),
        item('aerator_service', 'pre', 'routine', 'missed', false),
        item('night_do_check', 'peak', 'critical', 'pending', true),
      ],
    }]]));
    const brief = await b.svc.get('u1', { date: D }, NOW);
    expect(brief.todo.moltItems.map((i) => `${i.pondId}:${i.key}`)).toEqual(
      ['p1:restore_feed', 'p1:post_sampling', 'p2:minerals', 'p2:night_do_check'],
    );
    expect(brief.carriedOver.moltPending).toEqual([
      { pondId: 'p1', keys: ['restore_feed'] },
      { pondId: 'p2', keys: ['minerals', 'night_do_check'] },
    ]);
  });

  it('low stock is only shown for today', async () => {
    const inv = { ...rows, inventory: [{ id: 'i1', name: 'Feed', quantity: 2, unit: 'bag', reorder_level: 5 }, { id: 'i2', name: 'Lime', quantity: 9, unit: 'kg', reorder_level: 5 }] };
    const today = await build({ rows: inv }).svc.get('u1', { date: D }, NOW);
    expect(today.happening.lowStock).toEqual([{ itemId: 'i1', name: 'Feed', quantity: 2, unit: 'bag' }]);
    const past = build({ rows: inv });
    const pastBrief = await past.svc.get('u1', { date: '2026-09-10' }, NOW);
    expect(pastBrief.happening.lowStock).toEqual([]);
    expect(past.calls.map((c) => c.tag)).not.toContain('inventory');
  });
});

describe('DailyBriefService — coverage and unwatched ponds', () => {
  const D = '2026-09-14';
  const ago = (n: number) => addDays(D, -n);
  const wqOn = (pondId: string) => ({ pond_id: pondId, recorded_at: '2026-09-14T00:30:00Z', do: 5.5, ph: 7.9, temperature: 30 });
  const get = (rows: Rows) => build({ rows }).svc.get('u1', { date: D }, NOW);

  it('lastLog: days from the date, since stocking when never logged or last logged before stocking, nulls without a cycle', async () => {
    const brief = await get({
      ponds: [
        pondRow('p1'),
        pondRow('p2', { stocking_date: ago(10) }),
        pondRow('p3', { crop_id: null, stocking_date: null, end_day: null }),
        pondRow('p4', { stocking_date: ago(1) }),
      ],
      wq: [wqOn('p3')],
      last_log: [
        { pond_id: 'p1', water: D, feed: ago(1), any_day: D },
        { pond_id: 'p4', water: ago(9), feed: null, any_day: ago(9) },
      ],
    });
    const ll = (id: string) => brief.ponds.find((p) => p.pondId === id)!.lastLog;
    expect(ll('p1')).toEqual({ waterDate: D, feedDate: ago(1), anyDate: D, daysSinceWater: 0, daysSinceFeed: 1, daysSinceAny: 0 });
    expect(ll('p2')).toEqual({ waterDate: null, feedDate: null, anyDate: null, daysSinceWater: 10, daysSinceFeed: 10, daysSinceAny: 10 });
    expect(ll('p3')).toEqual({ waterDate: null, feedDate: null, anyDate: null, daysSinceWater: null, daysSinceFeed: null, daysSinceAny: null });
    expect(ll('p4')).toMatchObject({ waterDate: ago(9), daysSinceWater: 1, daysSinceFeed: 1, daysSinceAny: 1 });
  });

  it('stale thresholds: water 2 days, any 3 days ⇒ watch; either 7 ⇒ critical', async () => {
    const severity = async (water: number, any: number) => {
      const brief = await get({ ponds: [pondRow('p1')], last_log: [{ pond_id: 'p1', water: ago(water), feed: null, any_day: ago(any) }] });
      return brief.carriedOver.stalePonds[0]?.severity ?? null;
    };
    expect(await severity(1, 1)).toBeNull();
    expect(await severity(2, 0)).toBe('watch');
    expect(await severity(0, 2)).toBeNull();
    expect(await severity(0, 3)).toBe('watch');
    expect(await severity(6, 6)).toBe('watch');
    expect(await severity(7, 0)).toBe('critical');
    expect(await severity(0, 7)).toBe('critical');
  });

  it('stale ponds sort critical first, then most days; only stocked ponds', async () => {
    const brief = await get({
      ponds: [pondRow('w4'), pondRow('c8'), pondRow('c10'), pondRow('w2'), pondRow('idle', { crop_id: null, stocking_date: null, end_day: null })],
      wq: [wqOn('idle')],
      last_log: [
        { pond_id: 'w4', water: ago(4), any_day: ago(1) },
        { pond_id: 'c8', water: ago(8), any_day: ago(8) },
        { pond_id: 'c10', water: ago(1), any_day: ago(10) },
        { pond_id: 'w2', water: ago(2), any_day: ago(2) },
        { pond_id: 'idle', water: ago(30), any_day: ago(30) },
      ],
    });
    expect(brief.carriedOver.stalePonds.map((s) => [s.pondId, s.severity])).toEqual([
      ['c10', 'critical'], ['c8', 'critical'], ['w4', 'watch'], ['w2', 'watch'],
    ]);
  });

  it("verdict band: 'incomplete' below half scored, a real band at exactly half, 'none' when nothing scored", async () => {
    const one = await get({ ponds: [pondRow('a'), pondRow('b'), pondRow('c')], wq: [wqOn('a')] });
    expect(one.verdict).toMatchObject({ band: 'incomplete', stockedPonds: 3, scoredStockedPonds: 1 });
    expect(one.score?.value).toEqual(expect.any(Number));

    const half = await get({ ponds: [pondRow('a'), pondRow('b'), pondRow('c'), pondRow('d')], wq: [wqOn('a'), wqOn('b')] });
    expect(half.verdict).toMatchObject({ stockedPonds: 4, scoredStockedPonds: 2 });
    expect(half.verdict.band).toBe(half.score!.band);

    const zero = await get({ ponds: [pondRow('a'), pondRow('b')] });
    expect(zero.verdict).toMatchObject({ band: 'none', stockedPonds: 2, scoredStockedPonds: 0 });
  });

  it('last_log is one bounded query for all ponds', async () => {
    const { svc, calls } = build({ rows: { ponds: [pondRow('p1'), pondRow('p2')] } });
    await svc.get('u1', { date: D }, NOW);
    const ll = calls.filter((c) => c.tag === 'last_log');
    expect(ll).toHaveLength(1);
    expect(ll[0].params[0]).toEqual(['p1', 'p2']);
    expect(ll[0].params[3]).toBe(ago(60));
    expect(ll[0].params[4]).toBe(D);
  });
});

describe('DailyBriefQueryDto (controller validation)', () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });
  const through = (query: Record<string, unknown>) =>
    pipe.transform(query, { type: 'query', metatype: DailyBriefQueryDto } as any);

  it('accepts a date with or without a uuid farmId', async () => {
    await expect(through({ date: '2026-09-14' })).resolves.toMatchObject({ date: '2026-09-14' });
    await expect(through({ date: '2026-09-14', farmId: FARM })).resolves.toMatchObject({ farmId: FARM });
  });
  it('rejects missing/malformed date and non-uuid farmId', async () => {
    await expect(through({})).rejects.toBeInstanceOf(BadRequestException);
    await expect(through({ date: '2026-9-14' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(through({ date: '2026-09-14T00:00:00Z' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(through({ date: '2026-09-14', farmId: 'farm-1' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
