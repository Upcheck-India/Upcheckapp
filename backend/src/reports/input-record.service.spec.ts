import { ForbiddenException } from '@nestjs/common';
import { InputRecordService } from './input-record.service';

const missingColumn = () => Object.assign(new Error('column does not exist'), { code: '42703' });

function build(opts: { role?: string | null; caaMissing?: boolean } = {}) {
  const queries: string[] = [];
  const dataSource = {
    query: jest.fn(async (sql: string) => {
      queries.push(sql);
      if (sql.includes('caa_registration_no')) {
        if (opts.caaMissing) throw missingColumn();
        return [{ name: 'Green Acres', caa: 'CAA/AP/2024/123' }];
      }
      if (sql.includes('FROM farms')) return [{ name: 'Green Acres', caa: null }];
      if (sql.includes('hatcheries')) return [{ name: 'Vannamei Hatchery' }];
      if (sql.includes('FROM treatments')) {
        return [
          {
            date: '2026-08-12', category: 'mineral', ingredientKeys: ['potassium_chloride'],
            productName: 'Aqua Mix', description: null, doseValue: '25', doseUnit: 'kg',
            dosageKg: '25', reason: 'molt_prep', flag: 'none', matches: [],
          },
        ];
      }
      if (sql.includes('feed_brand')) return [{ brand: 'Avanti' }, { brand: 'CP' }];
      if (sql.includes('disease_records')) {
        return [{ date: '2026-08-20', name: 'WSSV', confirmedBy: 'pcr', labName: 'Lab X', outcome: 'recovered' }];
      }
      if (sql.includes('mortality_records')) return [{ records: 3, count: 120 }];
      return [];
    }),
  };
  const crops = {
    findOneAccessible: jest.fn(async () => ({
      id: 'c1', pondId: 'p1', farmId: 'f1', name: 'Crop 1', cropCode: 'C-01',
      stockingCount: 100000, totalSeed: null,
    })),
  };
  const ponds = {
    findOneAccessible: jest.fn(async () => ({
      id: 'p1', farmId: 'f1', name: 'Pond 3', displayName: null,
      overrideAreaM2: null, calculatedAreaM2: '5000',
    })),
  };
  const biosecurity = {
    read: jest.fn(async () => ({
      seed: { plSpf: true, plPcrDate: '2026-06-01', plPcrLab: 'RGCA', plPcrResults: { wssv: 'negative' } },
    })),
  };
  const harvestsService = {
    findAll: jest.fn(async () => [
      {
        harvestDate: '2026-09-10', harvestType: 'full', status: 'sold', weightKg: 1000,
        salePriceTotal: 450000, buyerName: 'Big Buyer', pricePerKg: 450,
        grades: [{ countPerKg: 40, weightKg: 800, pricePerKg: 480 }, { countPerKg: 60, weightKg: 200, pricePerKg: 350 }],
      },
      { harvestDate: '2026-09-11', harvestType: 'partial', status: 'discarded', weightKg: 5, grades: [] },
    ]),
  };
  const farmAccess = { getRoleOnFarm: jest.fn(async () => (opts.role === undefined ? 'owner' : opts.role)) };
  const compliance = {
    cycleCompliance: jest.fn(async () => ({
      status: 'none_logged', items: [], listVersion: '2026-07-08', evaluatedAt: 'x',
    })),
  };
  const reports = {
    getCycleResult: jest.fn(async () => ({
      stockingDate: '2026-06-01', endDate: '2026-09-10',
      money: { revenue: 450000, cost: 300000, profit: 150000 },
      welfare: { doBelow3Days: { days: 2, of: 80 } },
    })),
  };
  const service = new InputRecordService(
    dataSource as any, crops as any, ponds as any, biosecurity as any,
    harvestsService as any, farmAccess as any, compliance as any, reports as any,
  );
  return { service, reports, queries };
}

describe('InputRecordService (D4)', () => {
  it.each(['worker', 'viewer', null])('refuses a %s', async (role) => {
    const { service, reports } = build({ role });
    await expect(service.forCrop('c1', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
    // Refused before anything is gathered.
    expect(reports.getCycleResult).not.toHaveBeenCalled();
  });

  it.each(['owner', 'manager'])('allows the %s', async (role) => {
    const { service } = build({ role });
    const r = await service.forCrop('c1', 'u1');
    expect(r.farm).toEqual({ name: 'Green Acres', caaRegistrationNo: 'CAA/AP/2024/123' });
    expect(r.pond).toEqual({ name: 'Pond 3', areaM2: 5000 });
    expect(r.cycle.hatchery).toBe('Vannamei Hatchery');
    expect(r.feedBrands).toEqual(['Avanti', 'CP']);
    expect(r.health.mortality).toEqual({ records: 3, count: 120 });
    expect(r.health.doBelow3Days).toEqual({ days: 2, of: 80 });
    expect(r.treatments[0]).toMatchObject({ category: 'mineral', doseValue: 25, doseUnit: 'kg', reason: 'molt_prep' });
    expect(r.antimicrobial.status).toBe('none_logged');
  });

  it('carries no money anywhere, and drops discarded lots', async () => {
    const { service } = build();
    const r = await service.forCrop('c1', 'u1');
    const json = JSON.stringify(r);
    for (const key of ['price', 'Price', 'sale', 'revenue', 'profit', 'cost', 'money', 'buyer', '450000']) {
      expect(json).not.toContain(key);
    }
    expect(r.harvests).toEqual([
      {
        date: '2026-09-10', type: 'full', weightKg: 1000,
        grades: [{ countPerKg: 40, weightKg: 800 }, { countPerKg: 60, weightKg: 200 }],
      },
    ]);
  });

  it('tolerates an unapplied CAA column (42703) as "not logged"', async () => {
    const { service } = build({ caaMissing: true });
    const r = await service.forCrop('c1', 'u1');
    expect(r.farm).toEqual({ name: 'Green Acres', caaRegistrationNo: null });
  });

  it('empty logs read as null, never zero', async () => {
    const { service } = build();
    const r = await service.forCrop('c1', 'u1');
    expect(r.health.mortality).not.toBeNull();
    const svc = build();
    (svc.service as any).dataSource.query = jest.fn(async (sql: string) =>
      sql.includes('mortality_records') ? [{ records: 0, count: 0 }] : [],
    );
    const empty = await svc.service.forCrop('c1', 'u1');
    expect(empty.health.mortality).toBeNull();
    expect(empty.farm.caaRegistrationNo).toBeNull();
    expect(empty.cycle.hatchery).toBeNull();
  });
});
