import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { HarvestsService } from './harvests.service';
import { HarvestPlan } from '../harvest-plans/harvest-plan.entity';

/**
 * Harvest sales as Money-tab line items.
 *
 * The projection is read-only on purpose: `getFinancialReport` already sums
 * every harvest's `salePriceTotal` into revenue AND adds the transactions
 * table, so writing a real Transaction on harvest create would double-count.
 */
function makeService(rows: any[], farmIds = ['f1']) {
  const qb: any = {
    innerJoin: jest.fn(() => qb),
    where: jest.fn(() => qb),
    andWhere: jest.fn(() => qb),
    select: jest.fn(() => qb),
    addSelect: jest.fn(() => qb),
    orderBy: jest.fn(() => qb),
    take: jest.fn(() => qb),
    getRawMany: jest.fn().mockResolvedValue(rows),
  };
  const repo = { createQueryBuilder: jest.fn(() => qb) };
  const farmAccess = {
    getFarmIdsWithCapability: jest.fn().mockResolvedValue(farmIds),
  };
  const svc = new HarvestsService(repo as any, {} as any, farmAccess as any, {} as any);
  return { svc, qb, farmAccess };
}

const row = (over: any = {}) => ({
  id: 'h1',
  harvestDate: '2026-01-05',
  salePriceTotal: '42000.00',
  weightKg: 800,
  buyerName: 'Ravi Traders',
  farmId: 'f1',
  pondName: 'Pond 1',
  cropName: 'Cycle A',
  ...over,
});

describe('HarvestsService.findMoneyEntries', () => {
  it('projects a harvest sale into an income line item', async () => {
    const { svc } = makeService([row()]);

    const [entry] = await svc.findMoneyEntries('u');

    expect(entry).toEqual({
      id: 'harvest:h1',
      source: 'harvest',
      farmId: 'f1',
      transactionDate: '2026-01-05',
      type: 'income',
      category: 'Harvest',
      description: 'Pond 1 · Cycle A',
      amount: 42000,
      buyerName: 'Ravi Traders',
      weightKg: 800,
      pondId: null,
      pondName: 'Pond 1',
      archived: false,
    });
  });

  /**
   * A harvest logged with no sale price yet is NOT ₹0 of revenue — it is a sale
   * that has not happened, and it contributes nothing to the report either. A
   * ₹0 row on screen would be a line the total above it does not contain.
   */
  it('excludes harvests with no sale price recorded yet', async () => {
    const { svc, qb } = makeService([]);

    await svc.findMoneyEntries('u');

    const clauses = qb.andWhere.mock.calls.map((c: any[]) => c[0]).join(' ');
    expect(clauses).toContain('salePriceTotal IS NOT NULL');
    expect(clauses).toContain('salePriceTotal > 0');
  });

  // Sale prices are financials. This is narrower than `findAll`'s
  // merely-accessible scoping, and matches transactionsService.findAll —
  // whose output these rows are merged with.
  it('scopes to farms where the caller may view financials', async () => {
    const { svc, farmAccess } = makeService([]);

    await svc.findMoneyEntries('u');

    expect(farmAccess.getFarmIdsWithCapability).toHaveBeenCalledWith(
      'u',
      'VIEW_FINANCIALS',
    );
  });

  it('returns nothing for a caller who may view no farm financials', async () => {
    const { svc, qb } = makeService([row()], []);

    expect(await svc.findMoneyEntries('worker')).toEqual([]);
    expect(qb.getRawMany).not.toHaveBeenCalled();
  });

  // Postgres numeric comes back as a string; adding one to a number would
  // concatenate rather than fail.
  it('coerces the numeric sale price', async () => {
    const { svc } = makeService([row({ salePriceTotal: '1500.50' })]);

    const [entry] = await svc.findMoneyEntries('u');

    expect(entry.amount).toBe(1500.5);
  });
});

/**
 * A pond's CONTINUOUS harvest history spans every crop cycle it has run.
 * Before `pondId` existed, the app asked for a pond's harvests by omitting
 * cropId — which returned every harvest on every accessible farm, sale prices
 * included. The filter must narrow WITHIN the farm scope, never replace it.
 */
function makeFindAllService(farmIds = ['f1']) {
  const qb: any = {
    innerJoin: jest.fn(() => qb),
    where: jest.fn(() => qb),
    andWhere: jest.fn(() => qb),
    orderBy: jest.fn(() => qb),
    take: jest.fn(() => qb),
    addSelect: jest.fn(() => qb),
    getMany: jest.fn().mockResolvedValue([]),
    getRawAndEntities: jest.fn().mockResolvedValue({ entities: [], raw: [] }),
  };
  const repo = {
    createQueryBuilder: jest.fn(() => qb),
    // H1 details (grades etc.), one query for the whole page.
    query: jest.fn().mockResolvedValue([]),
  };
  const farmAccess = {
    getAccessibleFarmIds: jest.fn().mockResolvedValue(farmIds),
    // Unrestricted member: every pond on each accessible farm.
    getAccessiblePondIds: jest.fn().mockResolvedValue(['p1', 'p2']),
    getFarmIdsWithCapability: jest.fn().mockResolvedValue(farmIds),
  };
  const svc = new HarvestsService(repo as any, {} as any, farmAccess as any, {} as any);
  return { svc, qb, farmAccess, repo };
}

describe('HarvestsService.findAll pond filter', () => {
  it('filters by pond across all of its crops', async () => {
    const { svc, qb } = makeFindAllService();

    await svc.findAll('u', undefined, 'p1');

    expect(qb.andWhere).toHaveBeenCalledWith('crop.pondId = :pondId', {
      pondId: 'p1',
    });
    // No cropId filter — that is the whole point of a cross-cycle history.
    expect(qb.andWhere).not.toHaveBeenCalledWith(
      'harvest.cropId = :cropId',
      expect.anything(),
    );
  });

  it('still constrains to the accessible farms — the pond filter never widens scope', async () => {
    const { svc, qb } = makeFindAllService(['f1', 'f2']);

    await svc.findAll('u', undefined, 'p1');

    expect(qb.where).toHaveBeenCalledWith('pond.farmId IN (:...farmIds)', {
      farmIds: ['f1', 'f2'],
    });
  });

  it('returns nothing when the caller can reach no farm, whatever pond they name', async () => {
    const { svc, qb } = makeFindAllService([]);

    await expect(svc.findAll('u', undefined, 'p1')).resolves.toEqual([]);
    expect(qb.getMany).not.toHaveBeenCalled();
  });

  // The list route carries no capability guard, so a viewer or a pond-scoped
  // worker reaches it. It may show them what came out of the pond; it may not
  // show them what it sold for.
  it('masks the sale price and buyer for a farm the caller cannot see the books of', async () => {
    const { svc, qb, farmAccess } = makeFindAllService(['f1', 'f2']);
    qb.getRawAndEntities.mockResolvedValue({
      entities: [
        { id: 'h1', salePriceTotal: 900, buyerName: 'Trader A' },
        { id: 'h2', salePriceTotal: 800, buyerName: 'Trader B' },
      ],
      raw: [{ row_farm_id: 'f1' }, { row_farm_id: 'f2' }],
    });
    farmAccess.getFarmIdsWithCapability.mockResolvedValue(['f1']);

    const rows = await svc.findAll('u');

    expect(rows[0]).toMatchObject({ salePriceTotal: 900, buyerName: 'Trader A' });
    expect(rows[1]).toMatchObject({ salePriceTotal: null, buyerName: null });
  });

  it('narrows to the ponds a scoped worker may reach', async () => {
    const { svc, qb, farmAccess } = makeFindAllService(['f1']);
    farmAccess.getAccessiblePondIds.mockResolvedValue(['p2']);

    await svc.findAll('u');

    expect(qb.andWhere).toHaveBeenCalledWith('crop.pondId IN (:...pondIds)', {
      pondIds: ['p2'],
    });
  });
});

/**
 * A harvest closes a cycle and books revenue. It used to ride WRITE_MANAGEMENT
 * on the route and WRITE_OPERATIONAL on the client — the same key as a pH
 * reading — so any worker could sell the pond. RECORD_HARVEST is its own
 * capability, and the service asserts it rather than trusting the route guard.
 */
function makeGateService(
  allowed: boolean,
  opts: {
    cropStatus?: string;
    viewFinancials?: boolean;
    existing?: any;
    stockingDate?: string;
    abw?: number | null;
    pond?: any;
    otherActive?: number;
    oldGrades?: { id: string; price: number | null }[];
    details?: any[];
    plan?: any;
  } = {},
) {
  const repo = {
    // H1 details read (grades etc.); [] = ungraded / migration not applied.
    query: jest.fn(async (_sql?: string, _params?: unknown[]): Promise<any[]> => opts.details ?? []),
    create: jest.fn((v: any) => v),
    save: jest.fn(async (v: any) => ({ id: 'h1', ...v })),
    findOne: jest.fn(async () =>
      'existing' in opts
        ? opts.existing
        : {
            id: 'h1',
            salePriceTotal: 50000,
            buyerName: 'Ravi',
            crop: { pondId: 'p1' },
          },
    ),
    findOneBy: jest.fn(async () => ({ id: 'h1' })),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const cropsService = {
    findOneAccessible: jest.fn(async () => ({ id: 'c1', pondId: 'p1' })),
    closeCycle: jest.fn(),
  };
  const farmAccess = {
    assertCanAccessPond: jest.fn(async (_u: string, _p: string, cap: string) => {
      if (!allowed) throw new ForbiddenException();
      if (cap === 'VIEW_FINANCIALS' && opts.viewFinancials === false) {
        throw new ForbiddenException();
      }
      return { id: 'p1' };
    }),
  };
  // The transaction's manager: the crop row it locks, and inserts that land in
  // the same `repo` mock the assertions read.
  const manager = {
    findOne: jest.fn(async (entity: any) =>
      entity?.name === 'HarvestPlan'
        ? (opts.plan ?? null)
        : entity?.name === 'Pond'
        ? (opts.pond ?? { id: 'p1', activeCycleId: null })
        : {
            id: 'c1',
            pondId: 'p1',
            status: opts.cropStatus ?? 'active',
            stockingDate: opts.stockingDate,
          },
    ),
    create: jest.fn((_e: any, v: any) => repo.create(v)),
    save: jest.fn((v: any) => repo.save(v)),
    query: jest.fn(async (sql: string) => {
      if (sql.includes('FROM sampling_data')) {
        return opts.abw != null ? [{ mbw: opts.abw }] : [];
      }
      if (sql.includes('SELECT id, price_per_kg')) return opts.oldGrades ?? [];
      return [];
    }),
    count: jest.fn(async () => opts.otherActive ?? 0),
    // H4: the plan's conditional update flips a still-planned plan on the
    // named pond exactly once, like `WHERE id AND pond_id AND status='planned'`.
    update: jest.fn(async (entity: any, where: any, _set?: any) => {
      if (entity?.name !== 'HarvestPlan') return undefined;
      const p = opts.plan;
      if (!p || p.id !== where.id || p.pondId !== where.pondId || p.status !== where.status) {
        return { affected: 0 };
      }
      p.status = 'completed';
      return { affected: 1 };
    }),
    delete: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn((cb: (m: typeof manager) => unknown) => cb(manager)),
  };
  const svc = new HarvestsService(
    repo as any,
    cropsService as any,
    farmAccess as any,
    dataSource as any,
  );
  return { svc, repo, farmAccess, cropsService, manager };
}

describe('B1 — a harvest is atomic with its cycle close', () => {
  const full = {
    id: '11111111-1111-1111-1111-111111111111',
    cropId: 'c1',
    harvestDate: '2026-02-01',
    weightKg: 100,
    harvestType: 'full',
  } as any;

  it('refuses a closed cycle with CYCLE_CLOSED and writes nothing', async () => {
    const { svc, repo, cropsService } = makeGateService(true, {
      cropStatus: 'completed',
      existing: null,
    });

    const err = await svc.create(full, 'owner-1').catch((e) => e);

    expect(err).toBeInstanceOf(ConflictException);
    expect(err.getResponse()).toEqual(
      expect.objectContaining({ code: 'CYCLE_CLOSED' }),
    );
    expect(repo.save).not.toHaveBeenCalled();
    expect(cropsService.closeCycle).not.toHaveBeenCalled();
  });

  it('locks the crop row before checking it', async () => {
    const { svc, manager } = makeGateService(true, { existing: null });

    await svc.create(full, 'owner-1');

    expect(manager.findOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
  });

  it('closes the cycle inside the same transaction', async () => {
    const { svc, cropsService, manager } = makeGateService(true, {
      existing: null,
    });

    await svc.create(full, 'owner-1');

    expect(cropsService.closeCycle).toHaveBeenCalledWith(
      'c1',
      '2026-02-01',
      'owner-1',
      manager,
    );
  });

  it('a replay with the same id returns the existing row and closes nothing', async () => {
    const { svc, repo, cropsService } = makeGateService(true);

    const res = await svc.create(full, 'owner-1');

    expect(res).toEqual(expect.objectContaining({ id: 'h1' }));
    expect(repo.save).not.toHaveBeenCalled();
    expect(cropsService.closeCycle).not.toHaveBeenCalled();
  });
});

it('B9 — money entries list only SOLD harvests', async () => {
  const { svc, qb } = makeService([]);
  await svc.findMoneyEntries('owner-1');
  expect(qb.andWhere).toHaveBeenCalledWith("harvest.status = 'sold'");
});

describe('B6 — sale price masked without VIEW_FINANCIALS', () => {
  const dto = {
    cropId: 'c1',
    harvestDate: '2026-02-01',
    weightKg: 100,
    salePriceTotal: 50000,
    buyerName: 'Ravi',
    harvestType: 'partial',
  } as any;

  it('findOne', async () => {
    const { svc } = makeGateService(true, { viewFinancials: false });
    const h = await svc.findOne('h1', 'manager-1');
    expect(h.salePriceTotal).toBeNull();
    expect(h.buyerName).toBeNull();
    expect((h as any).crop).toBeUndefined();
  });

  it('the create response', async () => {
    const { svc } = makeGateService(true, {
      viewFinancials: false,
      existing: null,
    });
    const h = await svc.create(dto, 'manager-1');
    expect(h.salePriceTotal).toBeNull();
    expect(h.buyerName).toBeNull();
  });

  it('the update response', async () => {
    const { svc } = makeGateService(true, { viewFinancials: false });
    const h = await svc.update('h1', { weightKg: 120 } as any, 'manager-1');
    expect(h.salePriceTotal).toBeNull();
  });

  it('an owner still sees the price', async () => {
    const { svc } = makeGateService(true);
    const h = await svc.findOne('h1', 'owner-1');
    expect(h.salePriceTotal).toBe(50000);
  });
});

describe('RECORD_HARVEST gate', () => {
  const dto = {
    cropId: 'c1',
    harvestDate: '2026-02-01',
    weightKg: 100,
    harvestType: 'partial',
  } as any;

  it('refuses a worker with no grant, and asks for RECORD_HARVEST by name', async () => {
    const { svc, repo, farmAccess } = makeGateService(false);

    await expect(svc.create(dto, 'worker-1')).rejects.toThrow(
      ForbiddenException,
    );
    expect(farmAccess.assertCanAccessPond).toHaveBeenCalledWith(
      'worker-1',
      'p1',
      'RECORD_HARVEST',
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('allows the same worker once the capability resolves true', async () => {
    const { svc, repo } = makeGateService(true);

    await expect(svc.create(dto, 'worker-1')).resolves.toEqual(
      expect.objectContaining({ id: 'h1' }),
    );
    // ...and records who did it: a harvest is money, and the money tables
    // carried no actor at all before this.
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ createdById: 'worker-1' }),
    );
  });

  it('gates an edit and stamps the editor', async () => {
    const { svc, repo, farmAccess } = makeGateService(true);

    await svc.update('h1', { weightKg: 120 } as any, 'manager-1');

    expect(farmAccess.assertCanAccessPond).toHaveBeenCalledWith(
      'manager-1',
      'p1',
      'RECORD_HARVEST',
    );
    expect(repo.update).toHaveBeenCalledWith('h1', {
      weightKg: 120,
      updatedById: 'manager-1',
    });
  });

  it('gates a delete', async () => {
    const { svc, repo } = makeGateService(false);

    await expect(svc.remove('h1', 'worker-1')).rejects.toThrow(
      ForbiddenException,
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });
});

/**
 * The Money tab's date range and archive toggle, applied in SQL.
 *
 * Both used to be applied by the CALLER, in memory, over rows this query had
 * already capped at 500 — so "this week" searched the 500 most recent harvests
 * instead of the week's, and a busy farm's week came back empty. The archive
 * toggle was never applied to harvest rows at all, so switching it off dropped
 * a retired pond's revenue from the headline (the report skips the pond) and
 * left its sale rows in the list underneath: a line item the total above it
 * did not contain.
 */
describe('HarvestsService.findMoneyEntries — filters in the query', () => {
  const clausesOf = (qb: any) =>
    qb.andWhere.mock.calls.map((c: any[]) => c[0]).join(' | ');

  it('bounds the date range in SQL, not after the row cap', async () => {
    const { svc, qb } = makeService([]);

    await svc.findMoneyEntries('u', {
      startDate: '2026-02-01',
      endDate: '2026-02-28',
    });

    expect(qb.andWhere).toHaveBeenCalledWith(
      'harvest.harvestDate >= :startDate',
      { startDate: '2026-02-01' },
    );
    expect(qb.andWhere).toHaveBeenCalledWith('harvest.harvestDate <= :endDate', {
      endDate: '2026-02-28',
    });
  });

  it('hides a retired pond’s sales only when explicitly asked (D3)', async () => {
    const { svc, qb } = makeService([]);
    await svc.findMoneyEntries('u', { includeArchivedPonds: false });
    expect(clausesOf(qb)).toContain("pond.status <> 'archived'");

    const { svc: svc2, qb: qb2 } = makeService([]);
    await svc2.findMoneyEntries('u');
    expect(clausesOf(qb2)).not.toContain("pond.status <> 'archived'");
  });

  it('marks a sale from a retired pond rather than dropping it', async () => {
    const { svc } = makeService([row({ pondStatus: 'archived' })]);

    const [entry] = await svc.findMoneyEntries('u');

    expect(entry.archived).toBe(true);
  });
});

/* ── H1: graded harvest record ─────────────────────────────────────────── */

const gradedDto = (over: any = {}) =>
  ({
    id: '22222222-2222-4222-8222-222222222222',
    cropId: 'c1',
    harvestDate: '2026-09-10',
    harvestType: 'partial',
    // A stale client total must be IGNORED when grades are present.
    weightKg: 1,
    salePriceTotal: 1,
    grades: [
      { weightKg: 820, countPerKg: 40, pricePerKg: 430 },
      { weightKg: 160, countPerKg: 55, pricePerKg: 340 },
    ],
    ...over,
  }) as any;

const gradeInsert = (manager: any) =>
  manager.query.mock.calls.find((c: any[]) =>
    String(c[0]).includes('INSERT INTO harvest_grades'),
  );

describe('H1 — graded create', () => {
  it('derives the aggregate from the grades and writes them in the same transaction', async () => {
    const { svc, repo, manager } = makeGateService(true, { existing: null });

    await svc.create(gradedDto(), 'owner-1');

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ weightKg: 980, salePriceTotal: 407000, averageSize: 23.56 }),
    );
    const [, params] = gradeInsert(manager);
    // [harvestId, id, count, kg, price, sort] × 2
    // The saved row keeps the client-minted id (offline idempotency).
    const HID = '22222222-2222-4222-8222-222222222222';
    expect(params).toEqual([HID, null, 40, 820, 430, 0, null, 55, 160, 340, 1]);
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE harvests SET pieces = $2, pieces_estimated = $3'),
      [HID, 41600, false],
    );
  });

  it('strips prices server-side without VIEW_FINANCIALS (grade saved, price null)', async () => {
    const { svc, repo, manager } = makeGateService(true, {
      existing: null,
      viewFinancials: false,
    });

    await svc.create(gradedDto(), 'manager-1');

    const [, params] = gradeInsert(manager);
    expect(params[4]).toBeNull();
    expect(params[9]).toBeNull();
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ weightKg: 980, salePriceTotal: null }),
    );
  });

  it('strips an old-path total price too', async () => {
    const { svc, repo } = makeGateService(true, { existing: null, viewFinancials: false });
    await svc.create(
      { cropId: 'c1', harvestDate: '2026-09-10', weightKg: 100, salePriceTotal: 9000, harvestType: 'partial' } as any,
      'manager-1',
    );
    expect(repo.create.mock.calls[0][0].salePriceTotal).toBeUndefined();
  });

  it('a price outside ₹50–2000/kg is a 400 OUT_OF_RANGE unless confirmed', async () => {
    const dto = gradedDto({ grades: [{ weightKg: 100, countPerKg: 40, pricePerKg: 4300 }] });
    const { svc, repo } = makeGateService(true, { existing: null });

    const err = await svc.create(dto, 'owner-1').catch((e) => e);
    expect(err.getResponse()).toEqual(expect.objectContaining({ code: 'OUT_OF_RANGE' }));
    expect(repo.save).not.toHaveBeenCalled();

    await expect(
      svc.create({ ...dto, confirmOutOfRange: true }, 'owner-1'),
    ).resolves.toBeDefined();
  });

  it('estimates pieces from the ABW at the harvest date when a line has no count', async () => {
    const { svc, manager } = makeGateService(true, { existing: null, abw: 20 });

    await svc.create(
      gradedDto({ grades: [{ weightKg: 500, pricePerKg: 400 }] }),
      'owner-1',
    );

    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE harvests SET pieces'),
      ['22222222-2222-4222-8222-222222222222', 25000, true],
    );
  });

  it('old clients (no grades) keep the single-total path and touch no H1 columns', async () => {
    const { svc, repo, manager } = makeGateService(true, { existing: null });

    await svc.create(
      { cropId: 'c1', harvestDate: '2026-09-10', weightKg: 500, salePriceTotal: 200000, harvestType: 'partial' } as any,
      'owner-1',
    );

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ weightKg: 500, salePriceTotal: 200000 }),
    );
    // No grade insert, no UPDATE of pieces/rejected — works before the migration.
    expect(manager.query).not.toHaveBeenCalled();
  });

  it('an offline replay of a graded harvest returns the stored row and writes nothing', async () => {
    const { svc, repo, manager } = makeGateService(true, {
      details: [{ id: 'h1', grades: [{ id: 'g1', countPerKg: 40, weightKg: 820, pricePerKg: 430 }], pieces: 32800 }],
    });

    const res: any = await svc.create(gradedDto(), 'owner-1');

    expect(res.grades).toHaveLength(1);
    expect(repo.save).not.toHaveBeenCalled();
    expect(manager.query).not.toHaveBeenCalled();
  });

  it('refuses a future date and a date before stocking', async () => {
    const { svc, repo } = makeGateService(true, { existing: null, stockingDate: '2026-06-03' });

    const future = await svc.create(gradedDto({ harvestDate: '2099-01-01' }), 'owner-1').catch((e) => e);
    expect(future.getResponse()).toEqual(expect.objectContaining({ code: 'HARVEST_DATE_FUTURE' }));

    const early = await svc.create(gradedDto({ harvestDate: '2026-06-02' }), 'owner-1').catch((e) => e);
    expect(early.getResponse()).toEqual(expect.objectContaining({ code: 'HARVEST_DATE_BEFORE_STOCKING' }));
    expect(repo.save).not.toHaveBeenCalled();
  });
});

describe('H1 — reads', () => {
  it('attaches grades and masks grade prices without VIEW_FINANCIALS', async () => {
    const { svc } = makeGateService(true, {
      viewFinancials: false,
      details: [{ id: 'h1', grades: [{ id: 'g1', countPerKg: 40, weightKg: 820, pricePerKg: 430 }] }],
    });

    const h: any = await svc.findOne('h1', 'manager-1');

    expect(h.grades).toEqual([{ id: 'g1', countPerKg: 40, weightKg: 820, pricePerKg: null }]);
  });

  it('degrades to "ungraded" when the H1 migration is not applied (42703)', async () => {
    const { svc, repo } = makeGateService(true);
    repo.query.mockRejectedValueOnce(Object.assign(new Error('column'), { code: '42703' }));

    const h: any = await svc.findOne('h1', 'owner-1');

    expect(h.grades).toEqual([]);
    expect(h.salePriceTotal).toBe(50000);
  });

  it('does not swallow other database errors', async () => {
    const { svc, repo } = makeGateService(true);
    repo.query.mockRejectedValueOnce(Object.assign(new Error('boom'), { code: '08006' }));
    await expect(svc.findOne('h1', 'owner-1')).rejects.toThrow('boom');
  });
});

describe('H1 — edit', () => {
  const existing = (over: any = {}) => ({
    id: 'h1',
    cropId: 'c1',
    harvestType: 'partial',
    harvestDate: '2026-09-10',
    salePriceTotal: 50000,
    buyerName: 'Ravi',
    crop: { pondId: 'p1', stockingDate: '2026-06-03' },
    ...over,
  });

  it('the harvest type is immutable', async () => {
    const { svc, repo } = makeGateService(true, { existing: existing() });

    const err = await svc.update('h1', { harvestType: 'full' } as any, 'owner-1').catch((e) => e);
    expect(err.getResponse()).toEqual(expect.objectContaining({ code: 'HARVEST_TYPE_IMMUTABLE' }));
    expect(repo.update).not.toHaveBeenCalled();

    // Old builds resend the SAME type on every edit — accepted, not written.
    await svc.update('h1', { harvestType: 'partial', weightKg: 5 } as any, 'owner-1');
    expect(repo.update).toHaveBeenCalledWith('h1', { weightKg: 5, updatedById: 'owner-1' });
  });

  it('replaces all grades in one transaction and re-derives the aggregate', async () => {
    const { svc, manager } = makeGateService(true, { existing: existing() });

    await svc.update('h1', { grades: [{ weightKg: 100, countPerKg: 50, pricePerKg: 400 }] } as any, 'owner-1');

    expect(manager.query).toHaveBeenCalledWith('DELETE FROM harvest_grades WHERE harvest_id = $1', ['h1']);
    expect(manager.update).toHaveBeenCalledWith(
      expect.anything(),
      'h1',
      expect.objectContaining({ weightKg: 100, salePriceTotal: 40000 }),
    );
  });

  it('a member without VIEW_FINANCIALS edits weights but keeps the owner price', async () => {
    const { svc, manager } = makeGateService(true, {
      existing: existing(),
      viewFinancials: false,
      oldGrades: [{ id: 'g1', price: 430 }],
    });

    await svc.update(
      'h1',
      { grades: [{ id: 'g1', weightKg: 800, countPerKg: 40, pricePerKg: 1 }], salePriceTotal: 1, buyerName: 'X' } as any,
      'manager-1',
    );

    const [, params] = gradeInsert(manager);
    expect(params[4]).toBe(430);
    const written = manager.update.mock.calls[0][2];
    expect(written.buyerName).toBeUndefined();
    expect(written.salePriceTotal).toBe(800 * 430);
  });

  it('an explicit null clears the price and buyer', async () => {
    const { svc, repo } = makeGateService(true, { existing: existing() });
    await svc.update('h1', { salePriceTotal: null, buyerName: null } as any, 'owner-1');
    expect(repo.update).toHaveBeenCalledWith('h1', {
      salePriceTotal: null,
      buyerName: null,
      updatedById: 'owner-1',
    });
  });
});

/* ── H2: deleting a full harvest reopens its cycle ─────────────────────── */

describe('H2 — delete a full harvest', () => {
  const full = {
    id: 'h1',
    cropId: 'c1',
    harvestType: 'full',
    crop: { pondId: 'p1' },
  };

  it('reopens the cycle and relinks the pond in the same transaction', async () => {
    const { svc, manager } = makeGateService(true, { existing: full, cropStatus: 'completed' });

    await svc.remove('h1', 'owner-1');

    expect(manager.update).toHaveBeenCalledWith(expect.anything(), 'c1', {
      status: 'active',
      actualHarvestDate: null,
      isActive: true,
    });
    expect(manager.update).toHaveBeenCalledWith(expect.anything(), 'p1', {
      activeCycleId: 'c1',
      status: 'active',
    });
    expect(manager.delete).toHaveBeenCalledWith(expect.anything(), 'h1');
  });

  it('409 POND_HAS_NEW_CYCLE when the pond has started another cycle', async () => {
    const { svc, manager } = makeGateService(true, {
      existing: full,
      cropStatus: 'completed',
      pond: { id: 'p1', activeCycleId: 'c2' },
    });

    const err = await svc.remove('h1', 'owner-1').catch((e) => e);

    expect(err).toBeInstanceOf(ConflictException);
    expect(err.getResponse()).toEqual(expect.objectContaining({ code: 'POND_HAS_NEW_CYCLE' }));
    expect(manager.delete).not.toHaveBeenCalled();
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('409 too when another ACTIVE crop exists even if the pond link is stale', async () => {
    const { svc, manager } = makeGateService(true, {
      existing: full,
      cropStatus: 'completed',
      otherActive: 1,
    });
    await expect(svc.remove('h1', 'owner-1')).rejects.toBeInstanceOf(ConflictException);
    expect(manager.delete).not.toHaveBeenCalled();
  });

  it('a partial harvest deletes plainly — no reopen', async () => {
    const { svc, repo, manager } = makeGateService(true, {
      existing: { ...full, harvestType: 'partial' },
    });
    await svc.remove('h1', 'owner-1');
    expect(repo.delete).toHaveBeenCalledWith('h1');
    expect(manager.update).not.toHaveBeenCalled();
  });
});

/* ── H4: one revenue path — a harvest completes its plan ─────────────────── */

describe('H4 — plan → harvest', () => {
  const planned = () => ({ id: 'plan-1', pondId: 'p1', status: 'planned' });
  const fromPlan = (over: any = {}) =>
    gradedDto({
      planId: 'plan-1',
      harvestType: 'full',
      grades: [{ weightKg: 500, countPerKg: 40, pricePerKg: 400 }],
      ...over,
    });

  it('completes the plan inside the harvest transaction, with the harvest totals', async () => {
    const plan = planned();
    const { svc, manager, cropsService } = makeGateService(true, { existing: null, plan });

    const res: any = await svc.create(fromPlan(), 'owner-1');

    expect(res.planLink).toBe('linked');
    expect(manager.update).toHaveBeenCalledWith(
      HarvestPlan,
      { id: 'plan-1', pondId: 'p1', status: 'planned' },
      expect.objectContaining({
        status: 'completed',
        actualHarvestDate: '2026-09-10',
        actualWeightKg: 500,
        actualRevenue: 200000,
        actualPricePerKg: 400,
      }),
    );
    expect(plan.status).toBe('completed');
    // …and the harvest row is linked to it, in the same transaction.
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE harvests SET plan_id'),
      ['22222222-2222-4222-8222-222222222222', 'plan-1'],
    );
    expect(cropsService.closeCycle).toHaveBeenCalledWith('c1', '2026-09-10', 'owner-1', manager);
  });

  // A harvest is money and kilos that happened. Offline replay treats a 409
  // as done and parks a 400 as failed, so refusing it would lose it.
  it('a second harvest on an already-completed plan is SAVED unlinked and flagged — the plan completes once', async () => {
    const plan = planned();
    const first = makeGateService(true, { existing: null, plan });
    await first.svc.create(fromPlan(), 'owner-1');

    const second = makeGateService(true, { existing: null, plan });
    const res: any = await second.svc.create(
      fromPlan({ id: '33333333-3333-4333-8333-333333333333', harvestType: 'partial' }),
      'owner-1',
    );

    expect(res.planLink).toBe('already_completed');
    expect(second.repo.save).toHaveBeenCalledTimes(1);
    // Not linked…
    expect(second.manager.query).not.toHaveBeenCalledWith(
      expect.stringContaining('SET plan_id'),
      expect.anything(),
    );
    // …but remembered, so the Money overview can flag the cycle.
    expect(second.manager.query).toHaveBeenCalledWith(
      expect.stringContaining('SET plan_conflict_id'),
      ['33333333-3333-4333-8333-333333333333', 'plan-1'],
    );
  });

  it('a plan on another pond does not complete it, and the harvest is saved unlinked (rejected)', async () => {
    const other = { id: 'plan-1', pondId: 'p-other-farm', status: 'planned' };
    const { svc, repo, manager } = makeGateService(true, { existing: null, plan: other });

    const res: any = await svc.create(fromPlan(), 'owner-1');

    expect(res.planLink).toBe('rejected');
    expect(other.status).toBe('planned');
    expect(manager.update).not.toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(manager.query).not.toHaveBeenCalledWith(expect.stringMatching(/plan_id|plan_conflict_id/), expect.anything());
  });

  it('an unknown plan id is rejected the same way', async () => {
    const { svc, repo } = makeGateService(true, { existing: null });
    const res: any = await svc.create(fromPlan(), 'owner-1');
    expect(res.planLink).toBe('rejected');
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('a manager without VIEW_FINANCIALS completes the plan with no price', async () => {
    const plan = planned();
    const { svc, manager } = makeGateService(true, { existing: null, plan, viewFinancials: false });

    await svc.create(fromPlan(), 'manager-1');

    expect(manager.update.mock.calls[0][2]).toEqual(
      expect.objectContaining({ actualWeightKg: 500, actualRevenue: null, actualPricePerKg: null }),
    );
  });

  it('a harvest without planId touches no plan and carries no planLink', async () => {
    const { svc, manager } = makeGateService(true, { existing: null });
    const res: any = await svc.create(gradedDto(), 'owner-1');
    expect(manager.update).not.toHaveBeenCalled();
    expect(res).not.toHaveProperty('planLink');
  });
});

describe('H4 — planIncomeOverlaps', () => {
  const svcWith = (conflicts: any[], legacy: any[]) => {
    const built = makeGateService(true);
    built.repo.query.mockImplementation(async (sql: string) =>
      sql.includes('plan_conflict_id') ? conflicts : legacy,
    );
    return built;
  };

  it('matches plan-completion income to a sold harvest on the same cycle, per farm', async () => {
    const { svc, repo } = svcWith([], [{ cropId: 'c1', pondId: 'p1' }]);

    const out = await svc.planIncomeOverlaps('f1');

    expect(out).toEqual([{ cropId: 'c1', pondId: 'p1' }]);
    const legacySql = (repo.query.mock.calls as any[]).find((c) => c[0].includes('FROM transactions'));
    expect(legacySql[1]).toEqual(['f1']);
    expect(legacySql[0]).toContain("'Harvest sale from plan ' || hp.id::text");
    expect(legacySql[0]).toContain("t.category = 'harvest_sale'");
    expect(legacySql[0]).toContain("h.status = 'sold'");
  });

  it('also flags a cycle with a harvest saved against an already-completed plan, once per cycle', async () => {
    const { svc } = svcWith(
      [{ cropId: 'c2', pondId: 'p2' }, { cropId: 'c1', pondId: 'p1' }],
      [{ cropId: 'c1', pondId: 'p1' }],
    );

    expect(await svc.planIncomeOverlaps('f1')).toEqual([
      { cropId: 'c1', pondId: 'p1' },
      { cropId: 'c2', pondId: 'p2' },
    ]);
  });

  it('before the migration the conflict half degrades to nothing', async () => {
    const { svc, repo } = svcWith([], [{ cropId: 'c1', pondId: 'p1' }]);
    repo.query.mockImplementation(async (sql: string) => {
      if (sql.includes('plan_conflict_id')) throw Object.assign(new Error('col'), { code: '42703' });
      return [{ cropId: 'c1', pondId: 'p1' }];
    });
    expect(await svc.planIncomeOverlaps('f1')).toEqual([{ cropId: 'c1', pondId: 'p1' }]);
  });
});

/* ── M2 entry 3: a soft-shell rejection is a soft-shell observation ─────── */

describe('M2 — soft-shell rejection writes a health observation', () => {
  const HID = '22222222-2222-4222-8222-222222222222';
  const soft = (over: any = {}) =>
    gradedDto({ rejectedKg: 12, rejectedReason: 'soft_shell', ...over });
  const obsInserts = (manager: any) =>
    manager.query.mock.calls.filter((c: any[]) =>
      String(c[0]).includes('INSERT INTO health_observations'),
    );
  const withTable = (manager: any, present = true) => {
    const base = manager.query.getMockImplementation();
    manager.query.mockImplementation(async (sql: string, p?: unknown[]) =>
      sql.includes('to_regclass') ? [{ ok: present }] : base(sql, p),
    );
  };

  it('inserts one observation (harvest id, sign soft_shell, level many, source harvest) in the harvest transaction', async () => {
    const { svc, manager } = makeGateService(true, { existing: null });
    withTable(manager);

    await svc.create(soft(), 'owner-1');

    const ins = obsInserts(manager);
    expect(ins).toHaveLength(1);
    expect(ins[0][0]).toContain("'soft_shell', 'many', 'harvest'");
    expect(ins[0][0]).toContain('ON CONFLICT (id) DO NOTHING');
    expect(ins[0][1]).toEqual([HID, 'p1', 'c1', '2026-09-10', expect.anything(), 'owner-1']);
  });

  it('a replay of the same harvest writes no second observation', async () => {
    const { svc, manager } = makeGateService(true);
    withTable(manager);

    await svc.create(soft(), 'owner-1');

    expect(obsInserts(manager)).toHaveLength(0);
  });

  it('another rejection reason writes none', async () => {
    const { svc, manager } = makeGateService(true, { existing: null });
    withTable(manager);

    await svc.create(soft({ rejectedReason: 'broken' }), 'owner-1');

    expect(obsInserts(manager)).toHaveLength(0);
  });

  it('before the D6 migration it is skipped, and the harvest still saves', async () => {
    const { svc, repo, manager } = makeGateService(true, { existing: null });
    withTable(manager, false);

    await svc.create(soft(), 'owner-1');

    expect(obsInserts(manager)).toHaveLength(0);
    expect(repo.save).toHaveBeenCalled();
  });
});
