import { BadRequestException, ForbiddenException, NotFoundException, ValidationPipe } from '@nestjs/common';
import { DailyBriefService, assertBriefDate } from './daily-brief.service';
import { DailyBriefQueryDto } from './daily-brief.controller';
import { PondContextService } from '../pond-context/pond-context.service';
import { ShrimpCalculationsService } from '../shrimp-calculations/shrimp-calculations.service';
import { addDays, currentMoltWindow } from '../molt/molt-window';

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

  it('counts the day\'s SOLD harvests as income, not just transactions', async () => {
    // A harvest books revenue without a transactions row (expenses.service /
    // the synthesised harvest rows in harvests.service), so a transactions-only
    // sum showed harvestKg next to income 0 on the day of a sale.
    const { svc, calls } = build({ rows: money });
    await svc.get('u1', { date: '2026-09-14' }, NOW);
    const sql = calls.find((c) => c.tag === 'money')!.sql;
    expect(sql).toMatch(/SUM\(h\.sale_price_total\)/);
    expect(sql).toMatch(/h\.status = 'sold'/);
    expect(sql).toMatch(/h\.harvest_date = \$4/);
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

  it('H2: partial-harvest pieces up to the day come off the live population', async () => {
    const { svc } = build({
      rows: {
        ...rows,
        harvest_pieces: [
          { cropId: 'crop-p1', day: '2026-09-10', pieces: 9000, estimated: false },
          { cropId: 'crop-p1', day: '2026-09-15', pieces: 5000, estimated: false }, // after D
          { cropId: 'crop-other', day: '2026-09-10', pieces: 7777, estimated: false },
        ],
      },
    });
    const brief = await svc.get('u1', { date: D }, NOW);
    expect(brief.ponds[0].health).toMatchObject({ livePopulation: 90000, biomassKg: 900 });
  });

  it('H2: an unapplied migration leaves the brief population as before', async () => {
    const { svc, dataSource } = build({ rows });
    const orig = dataSource.query.getMockImplementation()!;
    dataSource.query.mockImplementation(async (sql: string, params: any[]) => {
      if (sql.includes('daily-brief:harvest_pieces')) throw Object.assign(new Error('col'), { code: '42703' });
      return orig(sql, params);
    });
    const brief = await svc.get('u1', { date: D }, NOW);
    expect(brief.ponds[0].health.livePopulation).toBe(99000);
  });

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
    expect(mort).toEqual({ at: '2026-09-14T06:30:00.000Z', allDay: true, kind: 'mortality', pondId: 'p1', summary: '×40', actorId: null, actorName: null });
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

  // M1.4: the peak exemptions are per pond — a < 5 g pond does not molt with the moon.
  it('molt-peak handling penalty applies only to a molt-eligible pond', async () => {
    const peakDay = '2026-09-11';
    const withSampling = (mbw: number) => ({
      ...rows,
      abw: [{ pond_id: 'p1', mbw }],
      wq: [{ pond_id: 'p1', recorded_at: '2026-09-11T00:30:00Z', do: 5.5, ph: 7.9, temperature: 30, ammonia: 0.05 }],
      feed_days: [{ pond_id: 'p1', day: peakDay, kg: 20 }],
      mortality_days: [{ pond_id: 'p1', day: peakDay, qty: 5 }],
      samplings: [{ pond_id: 'p1', day: peakDay, mbw, actor_id: null }],
    });
    const reasons = async (mbw: number) =>
      JSON.stringify((await build({ rows: withSampling(mbw) }).svc.get('u1', { date: peakDay }, NOW)).ponds[0].score);
    expect(await reasons(12)).toContain('molt_handling');
    expect(await reasons(3)).not.toContain('molt_handling');
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

describe('DailyBriefService — what we did', () => {
  const D = '2026-09-14';
  const users = [
    { id: 'u1', name: 'Anil', role: 'worker', email: 'anil@example.com' },
    { id: 'u2', name: 'Bina', role: 'manager', email: 'bina@example.com' },
    { id: 'u3', name: 'Chetan', role: 'worker', email: 'chetan@example.com' },
  ];
  const rows: Rows = {
    ponds: [pondRow('p1'), pondRow('p2')],
    wq: [
      { pond_id: 'p1', recorded_at: '2026-09-14T00:30:00Z', do: 5.5, ph: 7.9, actor_id: 'u1' },
      { pond_id: 'p2', recorded_at: '2026-09-14T00:40:00Z', do: 5.5, ph: 7.9, actor_id: 'u1' },
    ],
    feed_rows: [
      { pond_id: 'p1', recorded_at: '2026-09-14T01:00:00Z', kg: 20, actor_id: 'u1' },
      { pond_id: 'p2', recorded_at: '2026-09-14T01:10:00Z', kg: 10, actor_id: 'u2' },
      { pond_id: 'p2', recorded_at: '2026-09-14T07:10:00Z', kg: 5, actor_id: 'u2' },
    ],
    trays: [
      { pond_id: 'p2', day: D, time: '08:00:00', tray_number: 1, status: 'empty', actor_id: 'u2' },
      { pond_id: 'p2', day: D, time: '08:05:00', tray_number: 2, status: 'empty', actor_id: 'u2' },
      { pond_id: 'p2', day: D, time: '08:10:00', tray_number: 3, status: 'empty', actor_id: 'u2' },
    ],
    samplings: [{ pond_id: 'p1', day: D, mbw: 12.4, actor_id: 'u1' }],
    harvests: [{ pond_id: 'p2', day: D, kg: 850, actor_id: 'u2' }],
    check_ins: [
      { user_id: 'u3', check_in_at: '2026-09-14T02:00:00Z', check_out_at: '2026-09-14T11:00:00Z' },
      { user_id: 'u1', check_in_at: '2026-09-14T01:30:00Z', check_out_at: null },
    ],
    tasks: [
      { id: 't1', title: 'Lime p1', status: 'done', due_date: D, pond_id: 'p1', completed_at: '2026-09-14T05:00:00Z', assignee_ids: ['u1'], assignee_names: ['Anil'] },
      { id: 't2', title: 'Fix aerator', status: 'done', due_date: D, pond_id: null, completed_at: '2026-09-14T06:00:00Z', assignee_ids: ['u1', 'u2'], assignee_names: ['Anil', 'Bina'] },
      { id: 't3', title: 'Old', status: 'done', due_date: '2026-09-13', pond_id: null, completed_at: '2026-09-13T06:00:00Z', assignee_ids: ['u1'] },
    ],
    users,
  };

  it('every timeline event names its actor, one users lookup, and never an email', async () => {
    const { svc, calls } = build({ rows });
    const brief = await svc.get('u1', { date: D }, NOW);
    const water = brief.timeline.find((e) => e.kind === 'water')!;
    expect(water).toMatchObject({ actorId: 'u1', actorName: 'Anil' });
    expect(brief.timeline.find((e) => e.kind === 'tray')).toMatchObject({ actorId: 'u2', actorName: 'Bina' });
    expect(brief.timeline.find((e) => e.kind === 'check_in' && e.actorId === 'u3')?.actorName).toBe('Chetan');
    expect(brief.timeline.find((e) => e.kind === 'task_done' && e.summary === 'Lime p1')?.actorName).toBe('Anil');

    const u = calls.filter((c) => c.tag === 'users');
    expect(u).toHaveLength(1);
    expect([...u[0].params[0]].sort()).toEqual(['u1', 'u2', 'u3']);
    // The name SQL never falls back to an email, here or for assignees.
    for (const c of calls.filter((x) => x.tag === 'users' || x.tag === 'tasks')) expect(c.sql).not.toMatch(/email/i);
    expect(JSON.stringify(brief)).not.toMatch(/@example\.com/);
  });

  it('people: grouped by actor, sorted by work, check-in-only people included with shifts for a manager view', async () => {
    const brief = await build({ rows }).svc.get('u1', { date: D }, NOW);
    const people = brief.done!.people;
    expect(people.map((p) => p.userId)).toEqual(['u2', 'u1', 'u3']);
    expect(people[0]).toEqual({
      userId: 'u2', name: 'Bina', role: 'manager', counts: { feed: 2, tray: 3, harvest: 1 }, feedKg: 15, pondIds: ['p2'], tasksDone: 0,
      shift: { checkIn: null, checkOut: null, hours: null },
    });
    expect(people[1]).toMatchObject({ counts: { water: 2, feed: 1, sampling: 1 }, feedKg: 20, pondIds: ['p1', 'p2'], tasksDone: 1 });
    expect(people[1].shift).toEqual({ checkIn: '2026-09-14T01:30:00.000Z', checkOut: null, hours: null });
    expect(people[2]).toMatchObject({ name: 'Chetan', counts: {}, tasksDone: 0, shift: { checkIn: '2026-09-14T02:00:00.000Z', checkOut: '2026-09-14T11:00:00.000Z', hours: 9 } });
  });

  it('people carry the picture AvatarService allows the caller, resolved once for everyone', async () => {
    const { svc } = build({ rows });
    const resolve = jest.fn().mockResolvedValue(
      new Map([['u2', { avatarUrl: 'https://r2/u2.webp?s', avatarThumbUrl: 'https://r2/u2.thumb.webp?s' }]]),
    );
    (svc as any).avatars = { resolve };
    const people = (await svc.get('u1', { date: D }, NOW)).done!.people;
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledWith('u1', [FARM], ['u2', 'u1', 'u3']);
    expect(people.map((p) => p.avatarThumbUrl)).toEqual(['https://r2/u2.thumb.webp?s', null, null]);
  });

  it('a worker caller gets shift null and no attendance read', async () => {
    const { svc, calls } = build({ rows, role: 'worker' });
    const brief = await svc.get('u1', { date: D }, NOW);
    expect(calls.map((c) => c.tag)).not.toContain('check_ins');
    expect(brief.done!.people.map((p) => p.userId)).toEqual(['u2', 'u1']);
    for (const p of brief.done!.people) expect(p.shift).toBeNull();
    expect(brief.story!.map((s) => s.code)).not.toContain('team_in');
  });

  it('ponds: counts, kg, rounds, sampling g, harvest kg and who worked there', async () => {
    const brief = await build({ rows }).svc.get('u1', { date: D }, NOW);
    expect(brief.done!.ponds).toEqual([
      { pondId: 'p1', counts: { water: 1, feed: 1, sampling: 1 }, feedKg: 20, feedRounds: 1, samplingG: 12.4, harvestKg: null, people: ['Anil'] },
      { pondId: 'p2', counts: { water: 1, feed: 2, tray: 3, harvest: 1 }, feedKg: 15, feedRounds: 2, samplingG: null, harvestKg: 850, people: ['Anil', 'Bina'] },
    ]);
  });

  it('tasksDone: completed within the day, credited only to a sole assignee', async () => {
    const brief = await build({ rows }).svc.get('u1', { date: D }, NOW);
    expect(brief.done!.tasksDone).toEqual([
      { id: 't1', title: 'Lime p1', pondId: 'p1', completedAt: '2026-09-14T05:00:00.000Z', completedByName: 'Anil' },
      { id: 't2', title: 'Fix aerator', pondId: null, completedAt: '2026-09-14T06:00:00.000Z', completedByName: null },
    ]);
  });

  it('query count stays independent of pond count with actors present', async () => {
    const many = Array.from({ length: 30 }, (_, i) => pondRow(`p${i}`));
    const a = build({ rows: { ...rows, ponds: many.slice(0, 2) } });
    await a.svc.get('u1', { date: D }, NOW);
    const b = build({ rows: { ...rows, ponds: many } });
    await b.svc.get('u1', { date: D }, NOW);
    expect(b.calls.length).toBe(a.calls.length);
    expect(a.calls.map((c) => c.tag)).toContain('users');
  });
});

describe('DailyBriefService — the day story', () => {
  const D = '2026-09-14';
  const P = '2026-09-13';
  const ago = (n: number) => addDays(D, -n);
  const get = (rows: Rows, date = D, role?: string) => build({ rows, role }).svc.get('u1', { date }, NOW);
  const codes = (b: any) => b.story.map((s: any) => s.code);

  it('issue_open before issue_resolved; a reading that goes bad again stays open', async () => {
    const brief = await get({
      ponds: [pondRow('p1'), pondRow('p2'), pondRow('p3')],
      wq: [
        { pond_id: 'p1', recorded_at: '2026-09-14T01:00:00Z', do: 2.5, actor_id: 'u1' },
        { pond_id: 'p1', recorded_at: '2026-09-14T02:00:00Z', ammonia: 0.2 },
        { pond_id: 'p1', recorded_at: '2026-09-14T03:00:00Z', do: 5, actor_id: 'u2' },
        { pond_id: 'p2', recorded_at: '2026-09-14T04:00:00Z', ph: 9.5 },
        { pond_id: 'p3', recorded_at: '2026-09-14T01:00:00Z', do: 2.5 },
        { pond_id: 'p3', recorded_at: '2026-09-14T02:00:00Z', do: 5 },
        { pond_id: 'p3', recorded_at: '2026-09-14T03:00:00Z', do: 3.5 },
      ],
      users: [{ id: 'u2', name: 'Bina' }],
    });
    const issues = brief.story!.filter((s) => s.code.startsWith('issue_'));
    expect(issues.map((s) => [s.code, s.tone, s.pondId, s.reason?.code])).toEqual([
      ['issue_open', 'critical', 'p2', 'ph_out_of_range'],
      ['issue_open', 'critical', 'p3', 'do_low'],
      ['issue_open', 'watch', 'p1', 'ammonia_high'],
      ['issue_resolved', 'good', 'p1', 'do_low'],
    ]);
    expect(issues[3]).toMatchObject({
      at: '2026-09-14T01:00:00.000Z', resolvedAt: '2026-09-14T03:00:00.000Z', personName: 'Bina',
      reason: { code: 'do_low', severity: 'critical', pondId: 'p1', value: 2.5 },
    });
  });

  it('carried tasks and alerts: resolved on the day vs still open', async () => {
    const brief = await get({
      ponds: [pondRow('p1')],
      tasks: [
        { id: 'ta', title: 'Lime', status: 'done', due_date: ago(2), pond_id: 'p1', completed_at: '2026-09-14T05:00:00Z', assignee_ids: ['u1'] },
        { id: 'tb', title: 'Net', status: 'open', due_date: ago(1), pond_id: null, completed_at: null, assignee_ids: [] },
      ],
      alerts: [
        { pond_id: 'p1', title: 'Low DO', severity: 'critical', type: 'wq', created_at: '2026-09-12T01:00:00Z', updated_at: '2026-09-14T06:00:00Z', is_read: true },
        { pond_id: null, title: 'Stock', severity: 'warning', type: 'inv', created_at: '2026-09-12T01:00:00Z', updated_at: '2026-09-12T01:00:00Z', is_read: false },
      ],
      users: [{ id: 'u1', name: 'Anil' }],
    }, D, 'worker');
    const carried = brief.story!.filter((s) => s.code.startsWith('carried_'));
    expect(carried).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'carried_resolved', tone: 'good', carriedKind: 'task', title: 'Lime', count: 1, personName: 'Anil', resolvedAt: '2026-09-14T05:00:00.000Z' }),
      expect.objectContaining({ code: 'carried_open', tone: 'watch', carriedKind: 'task', title: 'Net', count: 1 }),
      expect.objectContaining({ code: 'carried_resolved', tone: 'good', carriedKind: 'alert', title: 'Low DO' }),
      expect.objectContaining({ code: 'carried_open', tone: 'watch', carriedKind: 'alert', title: 'Stock' }),
    ]));
    // open (watch) lines come before resolutions (good)
    const idx = (code: string, kind: string) => brief.story!.findIndex((s) => s.code === code && s.carriedKind === kind);
    expect(idx('carried_open', 'task')).toBeLessThan(idx('carried_resolved', 'task'));
  });

  it("carried stale ponds and the previous day's worst reading; stale_pond for newly unwatched", async () => {
    const brief = await get({
      ponds: [pondRow('p1'), pondRow('s1'), pondRow('s2'), pondRow('s3')],
      wq: [
        { pond_id: 'p1', recorded_at: '2026-09-13T01:00:00Z', do: 2.5 },
        { pond_id: 'p1', recorded_at: '2026-09-14T01:00:00Z', do: 5.5 },
        { pond_id: 's1', recorded_at: '2026-09-14T02:00:00Z', do: 5.5 },
      ],
      last_log: [
        { pond_id: 'p1', water: D, any_day: D, water_prev: P, any_prev: P },
        { pond_id: 's1', water: D, any_day: D, water_prev: ago(3), any_prev: ago(3) },
        { pond_id: 's2', water: ago(5), any_day: ago(5), water_prev: ago(5), any_prev: ago(5) },
        { pond_id: 's3', water: ago(2), any_day: D, water_prev: ago(2), any_prev: P },
      ],
    });
    expect(brief.carriedOver.worstPrevious).toMatchObject({ pondId: 'p1', reason: { code: 'do_low' } });
    const s = brief.story!;
    expect(s).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'carried_resolved', carriedKind: 'reading', pondId: 'p1', resolvedAt: '2026-09-14T01:00:00.000Z' }),
      expect.objectContaining({ code: 'carried_resolved', carriedKind: 'stale_pond', pondId: 's1', resolvedAt: '2026-09-14T02:00:00.000Z' }),
      expect.objectContaining({ code: 'carried_open', carriedKind: 'stale_pond', pondId: 's2', tone: 'watch', count: 5 }),
      expect.objectContaining({ code: 'stale_pond', pondId: 's3', tone: 'watch', count: 2 }),
    ]));
    expect(s.filter((x) => x.pondId === 's2').map((x) => x.code)).toEqual(['carried_open']);
  });

  it('the reading carries open when the parameter is still out of range', async () => {
    const brief = await get({
      ponds: [pondRow('p1')],
      wq: [
        { pond_id: 'p1', recorded_at: '2026-09-13T01:00:00Z', do: 2.5 },
        { pond_id: 'p1', recorded_at: '2026-09-14T01:00:00Z', do: 2.8 },
      ],
    });
    expect(brief.story).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'carried_open', carriedKind: 'reading', tone: 'critical' })]));
  });

  it('events: mortality spike, harvest, first sampling vs sampling, treatment, team in, molt phase', async () => {
    // A date inside a molt window, so molt_phase shows.
    let date = D;
    for (let i = 0; i < 30 && currentMoltWindow(new Date(`${date}T06:30:00Z`)).phase === 'inter'; i++) date = ago(i + 1);
    // Logged on the date, so no stale lines crowd the cap.
    const fresh = { ponds: [pondRow('p1'), pondRow('p2')], last_log: ['p1', 'p2'].map((pond_id) => ({ pond_id, water: date, any_day: date, water_prev: date, any_prev: date })) };
    const a = await get({
      ...fresh,
      mortality_days: [{ pond_id: 'p1', day: date, qty: 40 }, { pond_id: 'p1', day: addDays(date, -4), qty: 7 }],
      harvests: [{ pond_id: 'p1', day: date, kg: 850 }],
      samplings: [{ pond_id: 'p1', day: date, mbw: 3.2 }, { pond_id: 'p2', day: date, mbw: 12.4 }],
      abw: [{ pond_id: 'p1', mbw: 3.2, prev_sampling: null }, { pond_id: 'p2', mbw: 12.4, prev_sampling: '2026-08-20' }],
    }, date);
    expect(a.story).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'mortality_spike', pondId: 'p1', count: 40 }),
      expect.objectContaining({ code: 'harvest_done', pondId: 'p1', value: 850 }),
      expect.objectContaining({ code: 'first_sampling', pondId: 'p1', value: 3.2 }),
      expect.objectContaining({ code: 'sampling_done', pondId: 'p2', value: 12.4 }),
    ]));
    const b = await get({
      ...fresh,
      treatments: [{ pond_id: 'p2', day: date, kg: 2, flag: null }],
      check_ins: [{ user_id: 'u9', check_in_at: `${date}T02:00:00Z` }],
    }, date);
    expect(b.story).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'treatment_given', pondId: 'p2', count: 1 }),
      expect.objectContaining({ code: 'team_in', count: 1 }),
      expect.objectContaining({ code: 'molt_phase', tone: 'info', phase: b.happening.molt!.phase }),
    ]));
    // D3.5: a banned treatment in the last 7 days → a watch line with its date.
    const c = await get({ ...fresh, banned_week: [{ pond_id: 'p1', day: addDays(date, -3) }] }, date);
    expect(c.story).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'antimicrobial_watch', tone: 'watch', pondId: 'p1', at: addDays(date, -3) }),
    ]));
  });

  it('coverage: all done vs behind — watch on a past day, info (so far) today', async () => {
    const task = (status: string, due: string) => ({ id: `t-${status}`, title: 'x', status, due_date: due, pond_id: null, completed_at: null, assignee_ids: [] });
    const good = await get({
      ponds: [pondRow('p1')],
      wq: [{ pond_id: 'p1', recorded_at: '2026-09-14T01:00:00Z', do: 5.5 }],
      feed_days: [{ pond_id: 'p1', day: D, kg: 10 }],
      tasks: [task('done', D)],
    });
    expect(good.story).toEqual(expect.arrayContaining([
      { code: 'all_ponds_fed', tone: 'good', count: 1 }, { code: 'all_ponds_tested', tone: 'good', count: 1 }, { code: 'tasks_all_done', tone: 'good', count: 1 },
    ]));
    const past = await get({ ponds: [pondRow('p1'), pondRow('p2')], tasks: [task('open', ago(3))] }, ago(3));
    expect(past.story).toEqual(expect.arrayContaining([
      { code: 'ponds_not_fed', tone: 'watch', count: 2 }, { code: 'ponds_not_tested', tone: 'watch', count: 2 }, { code: 'tasks_left', tone: 'watch', count: 1 },
    ]));
    const today = await get({ ponds: [pondRow('p1')] });
    expect(today.story).toEqual(expect.arrayContaining([{ code: 'ponds_not_fed', tone: 'info', count: 1 }]));
    expect(codes(today)).not.toContain('all_ponds_fed');
  });

  it('caps at 8, most serious first', async () => {
    const ids = Array.from({ length: 12 }, (_, i) => `p${i}`);
    const brief = await get({
      ponds: ids.map((id) => pondRow(id)),
      wq: ids.map((id) => ({ pond_id: id, recorded_at: '2026-09-14T01:00:00Z', do: 2 })),
    });
    expect(brief.story).toHaveLength(8);
    expect(brief.story!.every((s) => s.code === 'issue_open' && s.tone === 'critical')).toBe(true);
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

describe('DailyBriefService — ongoing disease watch line (D6)', () => {
  it('an ongoing record logged 14+ days ago on a running cycle → one watch line, today only', async () => {
    const { svc, calls } = build({
      rows: { ponds: [pondRow('p1')], disease_ongoing: [{ pond_id: 'p1', name: 'WFD', since: '2026-08-25' }] },
    });
    const brief = await svc.get('u1', { date: '2026-09-14' }, NOW);
    const line = brief.story!.find((s) => s.code === 'disease_ongoing');
    expect(line).toMatchObject({ tone: 'watch', pondId: 'p1', title: 'WFD', count: 20 });
    const sql = calls.find((c) => c.tag === 'disease_ongoing')!;
    expect(sql.params[1]).toBe('2026-08-31'); // D − 14
    expect(sql.sql).toContain("c.status = 'active'");

    const past = build({ rows: { ponds: [pondRow('p1')], disease_ongoing: [{ pond_id: 'p1', name: 'WFD', since: '2026-08-25' }] } });
    await past.svc.get('u1', { date: '2026-09-13' }, NOW);
    expect(past.calls.some((c) => c.tag === 'disease_ongoing')).toBe(false);
  });

  it('outcome column not migrated yet (42703) → the brief still loads, no line', async () => {
    const b = build({ rows: { ponds: [pondRow('p1')] } });
    const base = b.dataSource.query.getMockImplementation()!;
    b.dataSource.query.mockImplementation(async (sql: string, params: any[]) => {
      if (sql.includes('daily-brief:disease_ongoing')) throw Object.assign(new Error('x'), { code: '42703' });
      return base(sql, params);
    });
    const brief = await b.svc.get('u1', { date: '2026-09-14' }, NOW);
    expect(brief.story!.some((s) => s.code === 'disease_ongoing')).toBe(false);
  });
});
