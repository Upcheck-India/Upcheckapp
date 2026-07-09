import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarvestPlan } from './harvest-plan.entity';
import { CreateHarvestPlanDto } from './dto/create-harvest-plan.dto';
import { UpdateHarvestPlanDto } from './dto/update-harvest-plan.dto';
import { Transaction } from '../transactions/transaction.entity';
import { Crop } from '../crops/crop.entity';
import { FarmAccessService } from '../farm-access/farm-access.service';

@Injectable()
export class HarvestPlansService {
  constructor(
    @InjectRepository(HarvestPlan)
    private plansRepository: Repository<HarvestPlan>,
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
    @InjectRepository(Crop)
    private cropsRepository: Repository<Crop>,
    private farmAccess: FarmAccessService,
  ) {}

  create(createDto: CreateHarvestPlanDto) {
    const plan = this.plansRepository.create(createDto);
    return this.plansRepository.save(plan);
  }

  /** Scoped to farms the caller can access — never returns plans from other farms. */
  async findAll(userId: string, pondId?: string) {
    const farmIds = await this.farmAccess.getAccessibleFarmIds(userId);
    if (farmIds.length === 0) return [];

    const qb = this.plansRepository
      .createQueryBuilder('hp')
      .innerJoin('hp.pond', 'pond')
      .where('pond.farmId IN (:...farmIds)', { farmIds })
      .orderBy('hp.createdAt', 'DESC');
    if (pondId) qb.andWhere('hp.pondId = :pondId', { pondId });
    return qb.getMany();
  }

  findOne(id: string) {
    return this.plansRepository.findOneBy({ id });
  }

  async update(id: string, updateDto: UpdateHarvestPlanDto) {
    await this.plansRepository.update(id, updateDto);
    return this.findOne(id);
  }

  remove(id: string) {
    return this.plansRepository.delete(id);
  }

  async completePlan(
    id: string,
    payload: {
      actualHarvestDate: Date;
      actualWeightKg: number;
      actualPricePerKg: number;
    },
  ) {
    // Load with the pond relation so the farm for the money-writing Transaction
    // below is resolved server-side — never trust a client-supplied farmId here.
    const plan = await this.plansRepository.findOne({
      where: { id },
      relations: ['pond'],
    });
    if (!plan) {
      throw new NotFoundException('Harvest plan not found');
    }
    // Idempotency: a double-tap or offline retry of complete must not book the
    // harvest-sale income twice into the farm P&L.
    if (plan.status === 'completed') {
      throw new ConflictException('Harvest plan is already completed');
    }

    const actualRevenue = payload.actualWeightKg * payload.actualPricePerKg;

    await this.plansRepository.update(id, {
      actualHarvestDate: payload.actualHarvestDate,
      actualWeightKg: payload.actualWeightKg,
      actualPricePerKg: payload.actualPricePerKg,
      actualRevenue,
      status: 'completed',
    });

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

    // Use the crop already linked to this (ownership-checked) plan — not a
    // client-supplied cropId — so completing a plan can't overwrite an
    // arbitrary crop in another farm.
    if (plan.cropId) {
      await this.cropsRepository.update(plan.cropId, {
        actualHarvestDate: payload.actualHarvestDate,
        harvestWeightKg: payload.actualWeightKg,
        status: 'harvested',
      });
    }

    return this.findOne(id);
  }

  async getCycleSummary(pondId: string, farmId: string) {
    const revenue = await this.transactionsRepository
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total')
      .where('t.farmId = :farmId', { farmId })
      .andWhere('t.type = :type', { type: 'income' })
      .getRawOne();

    const expenses = await this.transactionsRepository
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total')
      .where('t.farmId = :farmId', { farmId })
      .andWhere('t.type = :type', { type: 'expense' })
      .getRawOne();

    // Only return a plan that actually belongs to the requested (guard-checked)
    // farm — pondId alone isn't authorized, so it must be cross-checked against farmId.
    const plan = await this.plansRepository
      .createQueryBuilder('hp')
      .innerJoin('hp.pond', 'pond')
      .where('hp.pondId = :pondId', { pondId })
      .andWhere('pond.farmId = :farmId', { farmId })
      .orderBy('hp.createdAt', 'DESC')
      .getOne();

    return {
      pondId,
      totalRevenue: Number(revenue?.total || 0),
      totalExpense: Number(expenses?.total || 0),
      netProfit: Number(revenue?.total || 0) - Number(expenses?.total || 0),
      latestPlan: plan,
    };
  }
}
