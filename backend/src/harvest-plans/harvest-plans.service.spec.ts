/**
 * Harvest plans (harvest-and-molt H0 B5/B6, H4).
 *
 * H4 — one revenue path: `PATCH /harvest-plans/:id/complete` used to book a
 * `transactions` income row and write no harvest, so the farm report summed
 * one ledger and every harvest screen read the other. It is now a
 * compatibility shim for old app builds that logs a single-grade FULL harvest
 * through HarvestsService.create (which completes the plan and closes the
 * cycle in one transaction). No transaction row, ever.
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
  pond: { farmId: 'farm-1', activeCycleId: 'crop-1' },
};

const build = (plan: any = PLAN) => {
  const plansRepository = {
    findOne: jest.fn().mockResolvedValue(plan),
    update: jest.fn(),
    findOneBy: jest.fn().mockResolvedValue({ ...plan, status: 'completed' }),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 'plan-new', ...x })),
  };
  const cropsRepository = {
    update: jest.fn().mockResolvedValue(undefined),
    findOne: jest.fn(),
  };
  const farmAccess = {
    assertCanAccessPond: jest.fn().mockResolvedValue({ id: 'pond-1' }),
  };
  const harvestsService = { create: jest.fn().mockResolvedValue({ id: 'h1' }) };

  const service = new HarvestPlansService(
    plansRepository as any,
    cropsRepository as any,
    farmAccess as any,
    harvestsService as any,
  );
  return {
    service,
    plansRepository,
    cropsRepository,
    farmAccess,
    harvestsService,
  };
};

const payload = {
  actualHarvestDate: '2026-08-27T00:00:00.000Z',
  actualWeightKg: 400,
  actualPricePerKg: 300,
} as any;

describe('H4 — the /complete shim logs a harvest, not a transaction', () => {
  it('creates a single-grade FULL harvest linked to the plan', async () => {
    const { service, harvestsService } = build();

    await service.completePlan('plan-1', payload, 'user-1');

    expect(harvestsService.create).toHaveBeenCalledWith(
      {
        cropId: 'crop-1',
        planId: 'plan-1',
        harvestType: 'full',
        // IST calendar day of the instant the old build sent.
        harvestDate: '2026-08-27',
        grades: [{ weightKg: 400, pricePerKg: 300 }],
        confirmOutOfRange: true,
      },
      'user-1',
    );
  });

  it('writes no transaction row (the service no longer has a transactions repository)', () => {
    const { service } = build();
    expect((service as any).transactionsRepository).toBeUndefined();
  });

  it('refuses an already-completed plan without logging anything', async () => {
    const { service, harvestsService } = build({ ...PLAN, status: 'completed' });

    await expect(
      service.completePlan('plan-1', payload, 'user-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(harvestsService.create).not.toHaveBeenCalled();
  });

  it("harvests the pond's running cycle when the plan named none", async () => {
    const { service, harvestsService } = build({
      ...PLAN,
      cropId: null,
      pond: { farmId: 'farm-1', activeCycleId: 'crop-7' },
    });

    await service.completePlan('plan-1', payload, 'user-1');

    expect(harvestsService.create.mock.calls[0][0].cropId).toBe('crop-7');
  });

  it('400s when there is no cycle to harvest at all', async () => {
    const { service, harvestsService } = build({
      ...PLAN,
      cropId: null,
      pond: { farmId: 'farm-1', activeCycleId: null },
    });

    await expect(
      service.completePlan('plan-1', payload, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(harvestsService.create).not.toHaveBeenCalled();
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
