import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarvestPlan } from './harvest-plan.entity';
import { CreateHarvestPlanDto } from './dto/create-harvest-plan.dto';
import { UpdateHarvestPlanDto } from './dto/update-harvest-plan.dto';
import { Transaction } from '../transactions/transaction.entity';
import { Crop } from '../crops/crop.entity';

@Injectable()
export class HarvestPlansService {
    constructor(
        @InjectRepository(HarvestPlan)
        private plansRepository: Repository<HarvestPlan>,
        @InjectRepository(Transaction)
        private transactionsRepository: Repository<Transaction>,
        @InjectRepository(Crop)
        private cropsRepository: Repository<Crop>,
    ) { }

    create(createDto: CreateHarvestPlanDto) {
        const plan = this.plansRepository.create(createDto);
        return this.plansRepository.save(plan);
    }

    findAll(pondId?: string) {
        if (pondId) {
            return this.plansRepository.find({ where: { pondId }, order: { createdAt: 'DESC' } });
        }
        return this.plansRepository.find({ order: { createdAt: 'DESC' } });
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

    async completePlan(id: string, payload: {
        actualHarvestDate: Date;
        actualWeightKg: number;
        actualPricePerKg: number;
        farmId: string;
        cropId?: string;
    }) {
        const plan = await this.findOne(id);
        if (!plan) {
            throw new NotFoundException('Harvest plan not found');
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
                farmId: payload.farmId,
                transactionDate: payload.actualHarvestDate,
                type: 'income',
                category: 'harvest_sale',
                amount: actualRevenue,
                description: `Harvest sale from plan ${plan.id}`,
            }),
        );

        if (payload.cropId) {
            await this.cropsRepository.update(payload.cropId, {
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

        const plan = await this.plansRepository.findOne({ where: { pondId }, order: { createdAt: 'DESC' } });

        return {
            pondId,
            totalRevenue: Number(revenue?.total || 0),
            totalExpense: Number(expenses?.total || 0),
            netProfit: Number(revenue?.total || 0) - Number(expenses?.total || 0),
            latestPlan: plan,
        };
    }
}
