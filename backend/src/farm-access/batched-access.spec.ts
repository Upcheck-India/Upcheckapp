/**
 * The batched access calls (getMembershipsOnFarms / getAccessiblePondIdsForFarms)
 * must reach exactly the verdicts of their per-farm originals — they replace
 * them on the Today / alert-center / daily-brief / Lunar hot paths.
 */
import { FarmAccessService } from './farm-access.service';

const U = 'user-1';
/** farm → the caller's active membership (absent = none). */
const members: Record<string, { id: string; role: string }> = {
  'f-worker-scoped': { id: 'm1', role: 'worker' },
  'f-viewer-open': { id: 'm2', role: 'viewer' },
  'f-manager': { id: 'm3', role: 'manager' },
};
const farms: Record<string, { id: string; userId: string; rolePolicy: null }> = {
  'f-worker-scoped': { id: 'f-worker-scoped', userId: 'other', rolePolicy: null },
  'f-viewer-open': { id: 'f-viewer-open', userId: 'other', rolePolicy: null },
  'f-manager': { id: 'f-manager', userId: 'other', rolePolicy: null },
  'f-legacy-owner': { id: 'f-legacy-owner', userId: U, rolePolicy: null },
  'f-stranger': { id: 'f-stranger', userId: 'other', rolePolicy: null },
};
const ponds = [
  { id: 'p1', farmId: 'f-worker-scoped' },
  { id: 'p2', farmId: 'f-worker-scoped' },
  { id: 'p3', farmId: 'f-viewer-open' },
  { id: 'p4', farmId: 'f-manager' },
  { id: 'p5', farmId: 'f-legacy-owner' },
  { id: 'p6', farmId: 'f-stranger' },
];
/** member id → the ponds it is scoped to. */
const scopes: Record<string, string[]> = { m1: ['p2'], m3: ['p4'] };

const ids = (v: any): string[] => v?.value ?? v?._value ?? [v];

function makeService() {
  const memberRow = (farmId: string) =>
    members[farmId]
      ? { id: members[farmId].id, farmId, userId: U, role: members[farmId].role, status: 'active', capabilityOverrides: null }
      : null;
  const membersRepo = {
    findOne: jest.fn(async ({ where }: any) => memberRow(where.farmId)),
    find: jest.fn(async ({ where }: any) => ids(where.farmId).map(memberRow).filter(Boolean)),
  };
  const farmsRepo = {
    findOne: jest.fn(async ({ where }: any) => farms[where.id] ?? null),
    find: jest.fn(async ({ where }: any) => ids(where.id).map((id) => farms[id]).filter(Boolean)),
  };
  const pondsRepo = {
    find: jest.fn(async ({ where }: any) => ponds.filter((p) => ids(where.farmId).includes(p.farmId))),
  };
  let joinParams: any = {};
  const memberPondsRepo = {
    createQueryBuilder: () => ({
      innerJoin(_t: string, _a: string, _on: string, params: any) {
        joinParams = params;
        return this;
      },
      select() {
        return this;
      },
      addSelect() {
        return this;
      },
      getRawMany: async () => {
        const farmIds: string[] = joinParams.scopable ?? [joinParams.farmId];
        return farmIds.flatMap((farmId) =>
          (scopes[members[farmId]?.id] ?? []).map((pondId) => ({ pondId, farmId })),
        );
      },
    }),
  };
  const svc = new FarmAccessService(membersRepo as any, farmsRepo as any, pondsRepo as any, memberPondsRepo as any);
  return { svc, membersRepo, farmsRepo, pondsRepo };
}

const ALL = Object.keys(farms);

describe('batched farm access', () => {
  it('resolves the same membership as getMembershipOnFarm, per farm', async () => {
    const { svc } = makeService();
    const batch = await svc.getMembershipsOnFarms(U, ALL);
    for (const f of ALL) {
      expect(batch.get(f)).toEqual(await svc.getMembershipOnFarm(U, f));
    }
  });

  it.each(['READ', 'WRITE_OPERATIONAL', 'VIEW_FINANCIALS'] as const)(
    'returns the same ponds as getAccessiblePondIds per farm (%s)',
    async (cap) => {
      const { svc } = makeService();
      const perFarm = (await Promise.all(ALL.map((f) => svc.getAccessiblePondIds(U, f, cap)))).flat();
      expect((await svc.getAccessiblePondIdsForFarms(U, ALL, cap)).sort()).toEqual(perFarm.sort());
    },
  );

  it('scopes a worker to their rows but never scopes a manager', async () => {
    const { svc } = makeService();
    const got = await svc.getAccessiblePondIdsForFarms(U, ALL, 'READ');
    expect(got).toContain('p2');
    expect(got).not.toContain('p1'); // worker scoped out
    expect(got).toContain('p4'); // manager: scope rows ignored
    expect(got).not.toContain('p6'); // not a member
  });

  it('uses a fixed number of queries however many farms', async () => {
    const { svc, membersRepo, farmsRepo, pondsRepo } = makeService();
    await svc.getAccessiblePondIdsForFarms(U, ALL, 'READ');
    expect(membersRepo.find).toHaveBeenCalledTimes(1);
    expect(farmsRepo.find).toHaveBeenCalledTimes(1);
    expect(pondsRepo.find).toHaveBeenCalledTimes(1);
  });

  it('asks nothing for no farms', async () => {
    const { svc, membersRepo } = makeService();
    await expect(svc.getAccessiblePondIdsForFarms(U, [], 'READ')).resolves.toEqual([]);
    expect(membersRepo.find).not.toHaveBeenCalled();
  });
});
