import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarvestPlan } from './harvest-plan.entity';
import { CreateHarvestPlanDto } from './dto/create-harvest-plan.dto';
import { UpdateHarvestPlanDto } from './dto/update-harvest-plan.dto';
import { CompletePlanDto } from './dto/complete-plan.dto';
import { Transaction } from '../transactions/transaction.entity';
import { Crop } from '../crops/crop.entity';
import { Pond } from '../ponds/pond.entity';
import { FarmAccessService } from '../farm-access/farm-access.service';

/** Prices and revenue are financials; dates and weights are not. */
export const maskPlanFinancials = (
  plan: HarvestPlan,
  canView: boolean,
): HarvestPlan =>
  canView
    ? plan
    : ({
        ...plan,
        expectedPricePerKg: null,
        expectedRevenue: null,
        actualPricePerKg: null,
        actualRevenue: null,
      } as unknown as HarvestPlan);

@Injectable()
export class HarvestPlansService {
  constructor(
    @InjectRepository(HarvestPlan)
    private plansRepository: Repository<HarvestPlan>,
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
    @InjectRepository(Crop)
    private cropsRepository: Repository<Crop>,
    @InjectRepository(Pond)
    private pondsRepository: Repository<Pond>,
    private farmAccess: FarmAccessService,
  ) {}

  /**
   * The route guard proved the caller may manage `pondId` — nothing proved the
   * `cropId` beside it. A plan on this pond naming another farm's crop let
   * `completePlan` close that farm's cycle. The crop must be this pond's
   * running cycle.
   */
  async create(createDto: CreateHarvestPlanDto) {
    if (createDto.cropId) {
      const crop = await this.cropsRepository.findOne({
        where: { id: createDto.cropId },
        select: { id: true, pondId: true, status: true },
      });
      if (!crop || crop.pondId !== createDto.pondId || crop.status !== 'active') {
        throw new BadRequestException(
          'cropId must be the active cycle of this pond',
        );
      }
    }
    const plan = this.plansRepository.create(createDto);
    return this.plansRepository.save(plan);
  }

  /**
   * Scoped to farms the caller can access — never returns plans from other
   * farms. Prices and revenue are masked per farm unless the caller holds
   * VIEW_FINANCIALS there; the dates and weights stay readable.
   */
  async findAll(userId: string, pondId?: string) {
    const farmIds = await this.farmAccess.getAccessibleFarmIds(userId);
    if (farmIds.length === 0) return [];

    const qb = this.plansRepository
      .createQueryBuilder('hp')
      .innerJoin('hp.pond', 'pond')
      .addSelect('pond.farmId', 'row_farm_id')
      .where('pond.farmId IN (:...farmIds)', { farmIds })
      .orderBy('hp.createdAt', 'DESC');
    if (pondId) qb.andWhere('hp.pondId = :pondId', { pondId });
    const { entities, raw } = await qb.getRawAndEntities();

    const financialFarmIds = new Set(
      await this.farmAccess.getFarmIdsWithCapability(userId, 'VIEW_FINANCIALS'),
    );
    return entities.map((p, i) =>
      maskPlanFinancials(p, financialFarmIds.has(raw[i]?.row_farm_id)),
    );
  }

  async findOne(id: string, userId: string) {
    const plan = await this.plansRepository.findOneBy({ id });
    if (!plan) return plan;
    const canView = await this.farmAccess
      .assertCanAccessPond(userId, plan.pondId, 'VIEW_FINANCIALS')
      .then(() => true)
      .catch((err) => {
        if (err instanceof ForbiddenException) return false;
        throw err;
      });
    return maskPlanFinancials(plan, canView);
  }

  async update(id: string, updateDto: UpdateHarvestPlanDto, userId: string) {
    await this.plansRepository.update(id, updateDto);
    return this.findOne(id, userId);
  }

  remove(id: string) {
    return this.plansRepository.delete(id);
  }

  async completePlan(id: string, payload: CompletePlanDto, userId: string) {
    // Load with the pond relation so the farm for the money-writing Transaction
    // below is resolved server-side — never trust a client-supplied farmId here.
    const plan = await this.plansRepository.findOne({
      where: { id },
      relations: ['pond'],
    });
    if (!plan) {
      throw new NotFoundException('Harvest plan not found');
    }

    const actualRevenue = payload.actualWeightKg * payload.actualPricePerKg;

    // Idempotency: a double-tap or offline retry of complete must not book the
    // harvest-sale income twice. A conditional update, not check-then-act: two
    // concurrent completes both read 'planned', but only one can flip it.
    const res = await this.plansRepository.update(
      { id, status: 'planned' },
      {
        actualHarvestDate: payload.actualHarvestDate,
        actualWeightKg: payload.actualWeightKg,
        actualPricePerKg: payload.actualPricePerKg,
        actualRevenue,
        status: 'completed',
      },
    );
    if (!res.affected) {
      throw new ConflictException('Harvest plan is already completed');
    }

    await this.transactionsRepository.save(
      this.transactionsRepository.create({
        farmId: plan.pond.farmId,
        transactionDate: payload.actualHarvestDate,
        type: 'income',
        category: 'harvest_sale',
        amount: actualRevenue,
        description: `Harvest sale from plan ${plan.id}`,
      }),
    );

    // Use the crop already linked to this plan — not a client-supplied cropId.
    // `create` now checks it is this pond's cycle; the `pondId` criterion
    // below also covers plans written before that check existed, so a stored
    // foreign cropId matches no row instead of closing another farm's cycle.
    if (plan.cropId) {
      // 'completed', not 'harvested'. The crop entity documents the vocabulary
      // as active | completed | cancelled, and every other close path writes
      // 'completed' — this one invented a fourth word that nothing else
      // recognises, so a plan-completed cycle stayed "not completed" to the
      // idempotency guard, the reports and the active-cycle checks alike.
      await this.cropsRepository.update(
        { id: plan.cropId, pondId: plan.pondId },
        {
          actualHarvestDate: payload.actualHarvestDate,
          harvestWeightKg: payload.actualWeightKg,
          status: 'completed',
          isActive: false,
        },
      );

      // And FREE THE POND. This is what made the feature feel like it did
      // nothing: the plan went green, the money was booked, and the pond still
      // held the cycle it had just been harvested out of — still stocked, still
      // being fed, still counted as active everywhere. Harvesting a pond is
      // exactly the event that empties it, and the other close path
      // (CropsService.closeCycle) has always done this.
      await this.pondsRepository.update(
        { id: plan.pondId, activeCycleId: plan.cropId },
        { activeCycleId: null, status: 'fallow' } as any,
      );
    }

    return this.findOne(id, userId);
  }
}
