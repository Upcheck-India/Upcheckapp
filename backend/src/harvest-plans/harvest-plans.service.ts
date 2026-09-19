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
import { Crop } from '../crops/crop.entity';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { HarvestsService } from '../harvests/harvests.service';
import { CreateHarvestDto } from '../harvests/dto/create-harvest.dto';
import { toIstDateString } from '../common/ist-date';

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
    @InjectRepository(Crop)
    private cropsRepository: Repository<Crop>,
    private farmAccess: FarmAccessService,
    private harvestsService: HarvestsService,
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

  /**
   * COMPATIBILITY SHIM for app builds older than H4. Remove next release:
   * TODO(H4, next release): answer 410 Gone `{ code: 'USE_HARVEST_LOG' }`.
   *
   * It used to book a `transactions` income row and write no harvest, so the
   * farm report and every harvest-based screen disagreed (B2). Now it logs a
   * single-grade FULL harvest through HarvestsService.create — the one revenue
   * path — which completes this plan in the same transaction (scoped to the
   * crop's pond, only while still planned) and closes the cycle. No
   * transaction row is written.
   */
  async completePlan(id: string, payload: CompletePlanDto, userId: string) {
    const plan = await this.plansRepository.findOne({
      where: { id },
      relations: ['pond'],
    });
    if (!plan) {
      throw new NotFoundException('Harvest plan not found');
    }
    if (plan.status !== 'planned') {
      throw new ConflictException('Harvest plan is already completed');
    }
    // A plan drawn up with no cycle: harvest the pond's running one.
    const cropId = plan.cropId ?? plan.pond?.activeCycleId;
    if (!cropId) {
      throw new BadRequestException('This pond has no running cycle to harvest');
    }

    await this.harvestsService.create(
      {
        cropId,
        planId: id,
        harvestType: 'full',
        harvestDate: toIstDateString(new Date(payload.actualHarvestDate)),
        grades: [
          {
            weightKg: payload.actualWeightKg,
            pricePerKg: payload.actualPricePerKg,
          },
        ],
        // An old build cannot answer the out-of-band price warning.
        confirmOutOfRange: true,
      } as CreateHarvestDto,
      userId,
    );

    return this.findOne(id, userId);
  }
}
