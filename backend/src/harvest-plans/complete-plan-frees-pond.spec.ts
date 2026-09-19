/**
 * Completing a harvest plan has to actually harvest the pond.
 *
 * Reported as "the harvest feature is half baked and it feels like UI-only,
 * nothing happens". It wrote the plan, booked the income and marked the crop —
 * and then left the pond holding the cycle it had just been harvested out of.
 * Still stocked, still fed, still counted as active everywhere. From the
 * farmer's side that is indistinguishable from the button doing nothing.
 *
 * It also wrote crop status 'harvested', a word the crop entity's own
 * vocabulary (active | completed | cancelled) does not contain and nothing
 * else in the app recognises.
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { HarvestPlansService } from './harvest-plans.service';
import { HarvestPlansController } from './harvest-plans.controller';
import { UpdateHarvestPlanDto } from './dto/update-harvest-plan.dto';

const PLAN = {
  id: 'plan-1',
  pondId: 'pond-1',
  cropId: 'crop-1',
  status: 'planned',
  pond: { farmId: 'farm-1' },
};

const build = (plan: any = PLAN) => {
  // The conditional `WHERE status='planned'` update: it flips the row once.
  let status = plan.status;
  const plansRepository = {
    findOne: jest.fn().mockResolvedValue(plan),
    update: jest.fn(async (where: any) => {
      if (where?.status === 'planned' && status !== 'planned') {
        return { affected: 0 };
      }
      status = 'completed';
      return { affected: 1 };
    }),
    findOneBy: jest.fn().mockResolvedValue({ ...plan, status: 'completed' }),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 'plan-new', ...x })),
  };
  const transactionsRepository = {
    create: jest.fn((x) => x),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const cropsRepository = {
    update: jest.fn().mockResolvedValue(undefined),
    findOne: jest.fn(),
  };
  const pondsRepository = { update: jest.fn().mockResolvedValue(undefined) };
  const farmAccess = {
    assertCanAccessPond: jest.fn().mockResolvedValue({ id: 'pond-1' }),
  };

  const service = new HarvestPlansService(
    plansRepository as any,
    transactionsRepository as any,
    cropsRepository as any,
    pondsRepository as any,
    farmAccess as any,
  );
  return {
    service,
    plansRepository,
    transactionsRepository,
    cropsRepository,
    pondsRepository,
    farmAccess,
  };
};

const payload = {
  actualHarvestDate: new Date('2026-08-27T00:00:00.000Z'),
  actualWeightKg: 400,
  actualPricePerKg: 300,
} as any;

describe('completePlan', () => {
  it('empties the pond it just harvested', async () => {
    const { service, pondsRepository } = build();

    await service.completePlan('plan-1', payload, 'user-1');

    expect(pondsRepository.update).toHaveBeenCalledWith(
      // Scoped to the crop that was actually harvested: if another cycle has
      // been started in the meantime, this must not clear that one.
      { id: 'pond-1', activeCycleId: 'crop-1' },
      { activeCycleId: null, status: 'fallow' },
    );
  });

  it("closes the crop with the vocabulary the rest of the app reads", async () => {
    const { service, cropsRepository } = build();

    await service.completePlan('plan-1', payload, 'user-1');

    expect(cropsRepository.update).toHaveBeenCalledWith(
      // Pinned to the plan's own pond: a stored foreign cropId matches nothing.
      { id: 'crop-1', pondId: 'pond-1' },
      expect.objectContaining({
        status: 'completed',
        harvestWeightKg: 400,
        isActive: false,
      }),
    );
  });

  it('books the sale as farm income', async () => {
    const { service, transactionsRepository } = build();

    await service.completePlan('plan-1', payload, 'user-1');

    expect(transactionsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ farmId: 'farm-1', type: 'income', amount: 120000 }),
    );
  });

  // A double-tap or an offline retry must not book the income twice.
  it('refuses a second completion', async () => {
    const { service, pondsRepository } = build({ ...PLAN, status: 'completed' });

    await expect(
      service.completePlan('plan-1', payload, 'user-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(pondsRepository.update).not.toHaveBeenCalled();
  });

  // Two completes that both READ 'planned' (a race) — the conditional update
  // lets only one through, so the income books once.
  it('a double complete books one income', async () => {
    const { service, transactionsRepository } = build();

    const results = await Promise.allSettled([
      service.completePlan('plan-1', payload, 'user-1'),
      service.completePlan('plan-1', payload, 'user-1'),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([
      'fulfilled',
      'rejected',
    ]);
    expect(transactionsRepository.save).toHaveBeenCalledTimes(1);
  });

  // A plan can be drawn up for a pond with no cycle running. There is no crop
  // to close and no pond to empty; the money still books.
  it('books the income but touches no pond when the plan has no cycle', async () => {
    const { service, pondsRepository, cropsRepository, transactionsRepository } = build({
      ...PLAN,
      cropId: null,
    });

    await service.completePlan('plan-1', payload, 'user-1');

    expect(transactionsRepository.save).toHaveBeenCalled();
    expect(cropsRepository.update).not.toHaveBeenCalled();
    expect(pondsRepository.update).not.toHaveBeenCalled();
  });
});

describe('B5 — a plan cannot name another pond’s cycle', () => {
  const dto = { pondId: 'pond-1', cropId: 'crop-9' };

  it('400s a cropId from another pond (another farm)', async () => {
    const { service, cropsRepository, plansRepository } = build();
    cropsRepository.findOne.mockResolvedValue({
      id: 'crop-9',
      pondId: 'pond-other-farm',
      status: 'active',
    });

    await expect(service.create(dto as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(plansRepository.save).not.toHaveBeenCalled();
  });

  it('400s a closed cycle on the same pond', async () => {
    const { service, cropsRepository } = build();
    cropsRepository.findOne.mockResolvedValue({
      id: 'crop-9',
      pondId: 'pond-1',
      status: 'completed',
    });

    await expect(service.create(dto as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('accepts the pond’s own running cycle', async () => {
    const { service, cropsRepository, plansRepository } = build();
    cropsRepository.findOne.mockResolvedValue({
      id: 'crop-9',
      pondId: 'pond-1',
      status: 'active',
    });

    await service.create(dto as any);
    expect(plansRepository.save).toHaveBeenCalled();
  });

  it('PATCH can no longer move a plan to another pond or crop', async () => {
    const body = plainToInstance(UpdateHarvestPlanDto, {
      pondId: 'pond-x',
      cropId: 'crop-x',
      notes: 'ok',
    });
    await validate(body, { whitelist: true });
    expect(body).toEqual({ notes: 'ok' });
  });
});

describe('B6 — plan money is masked without VIEW_FINANCIALS', () => {
  const makeList = (canViewFarms: string[]) => {
    const built = build();
    const qb: any = {
      innerJoin: jest.fn(() => qb),
      addSelect: jest.fn(() => qb),
      where: jest.fn(() => qb),
      andWhere: jest.fn(() => qb),
      orderBy: jest.fn(() => qb),
      getRawAndEntities: jest.fn().mockResolvedValue({
        entities: [
          { id: 'p1', targetWeightKg: 900, expectedRevenue: 400000, actualRevenue: 380000 },
        ],
        raw: [{ row_farm_id: 'farm-1' }],
      }),
    };
    (built.plansRepository as any).createQueryBuilder = jest.fn(() => qb);
    (built.farmAccess as any).getAccessibleFarmIds = jest
      .fn()
      .mockResolvedValue(['farm-1']);
    (built.farmAccess as any).getFarmIdsWithCapability = jest
      .fn()
      .mockResolvedValue(canViewFarms);
    return built;
  };

  it('GET /harvest-plans masks revenue for a books-blind member', async () => {
    const { service } = makeList([]);
    const [p] = await service.findAll('worker-1');
    expect(p.expectedRevenue).toBeNull();
    expect(p.actualRevenue).toBeNull();
    expect(p.targetWeightKg).toBe(900);
  });

  it('…and shows it to one who holds VIEW_FINANCIALS', async () => {
    const { service } = makeList(['farm-1']);
    const [p] = await service.findAll('owner-1');
    expect(p.actualRevenue).toBe(380000);
  });

  it('GET /harvest-plans/:id masks too', async () => {
    const { service, farmAccess } = build();
    farmAccess.assertCanAccessPond.mockRejectedValue(new ForbiddenException());
    const p = await service.findOne('plan-1', 'worker-1');
    expect(p!.actualRevenue).toBeNull();
  });
});

// B4: the pond summary summed revenue for ANY pondId behind a farmId-only
// guard. Nothing called it, so it is gone rather than patched.
it('B4 — the unguarded pond summary endpoint no longer exists', () => {
  expect((HarvestPlansController.prototype as any).getSummary).toBeUndefined();
  expect((HarvestPlansService.prototype as any).getCycleSummary).toBeUndefined();
});
