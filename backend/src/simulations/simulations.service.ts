import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Crop } from '../crops/crop.entity';
import { FeedRecord } from '../feed-records/feed-record.entity';
import { Pond } from '../ponds/pond.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Simulation } from './simulation.entity';
import { RunSimulationDto, SimulationScenarioType } from './dto/run-simulation.dto';

export interface SimulationResult {
    baselineNetProfit: number;
    simulatedNetProfit: number;
    profitDifference: number;
    projectedBiomass: number;
    projectedFcr: number;
    totalRevenue: number;
    totalCost: number;
    riskWarning?: string;
}

@Injectable()
export class SimulationsService {
    constructor(
        @InjectRepository(Simulation)
        private simulationsRepository: Repository<Simulation>,
        @InjectRepository(Crop)
        private cropsRepository: Repository<Crop>,
        @InjectRepository(FeedRecord)
        private feedRepository: Repository<FeedRecord>,
        @InjectRepository(Transaction)
        private transactionsRepository: Repository<Transaction>,
        @InjectRepository(Pond)
        private pondsRepository: Repository<Pond>,
    ) { }

    async runSimulation(dto: RunSimulationDto, userId: string) {
        // FIXED: Load crop first to fail early if no crop? 
        // Actually, let's load Pond first to secure it.
        const pond = await this.pondsRepository.findOne({
            where: { id: dto.pondId },
            relations: ['farm'], // Need farm to check owner
        });

        if (!pond) {
            throw new NotFoundException('Pond not found');
        }

        // FIXED: Check ownership
        if (pond.farm.userId !== userId) {
            throw new ForbiddenException('You do not have permission to run simulations for this pond');
        }

        const crop = await this.cropsRepository.findOne({
            where: { pondId: dto.pondId, status: 'active' },
        });

        if (!crop) {
            throw new NotFoundException('Active crop not found for pond');
        }

        const baselineBiomass = Number(crop.harvestWeightKg || 0);
        const feedTotalResult = await this.feedRepository
            .createQueryBuilder('feed')
            .select('SUM(feed.quantityKg)', 'totalFeed')
            .where('feed.pondId = :pondId', { pondId: dto.pondId })
            .getRawOne();

        const baselineFeedUsed = Number(feedTotalResult?.totalFeed || 0);
        const baselineFcr = baselineBiomass > 0 ? baselineFeedUsed / baselineBiomass : 0;

        const otherCostsResult = await this.transactionsRepository
            .createQueryBuilder('t')
            .select('SUM(t.amount)', 'total')
            .where('t.type = :type', { type: 'expense' })
            .andWhere('t.farmId = :farmId', { farmId: pond.farmId })
            .getRawOne();

        const baselineIncomeResult = await this.transactionsRepository
            .createQueryBuilder('t')
            .select('SUM(t.amount)', 'total')
            .where('t.type = :type', { type: 'income' })
            .andWhere('t.farmId = :farmId', { farmId: pond.farmId })
            .getRawOne();

        const baselineOtherCosts = Number(otherCostsResult?.total || 0);
        const baselineRevenue = Number(baselineIncomeResult?.total || 0);
        const baselineNetProfit = baselineRevenue - baselineOtherCosts;

        const variables = dto.variables || {};
        let adjustedBiomass = baselineBiomass;
        let adjustedFcr = baselineFcr;
        let marketPrice = variables.sellingPrice ?? (baselineBiomass > 0 ? baselineRevenue / baselineBiomass : 0);
        let feedPrice = variables.feedPrice ?? 0;
        let riskWarning: string | undefined;

        if (dto.scenarioType === SimulationScenarioType.FeedChange) {
            const growthImprovement = variables.growthImprovement ?? 0;
            adjustedBiomass = baselineBiomass * (1 + growthImprovement / 100);
            adjustedFcr = baselineFcr * (1 - growthImprovement / 200);
        }

        if (dto.scenarioType === SimulationScenarioType.PriceChange && variables.sellingPrice !== undefined) {
            marketPrice = variables.sellingPrice;
        }

        if (dto.scenarioType === SimulationScenarioType.StockingDensity) {
            const currentDensity = Number(crop.stockingDensity || 0);
            const simulatedDensity = Number(variables.stockingDensity || 0);
            if (currentDensity > 0 && simulatedDensity > 0) {
                const baseRiskFactor = 1.0;
                const riskScore = (simulatedDensity / currentDensity) * baseRiskFactor;
                if (riskScore > 1.2) {
                    riskWarning = 'High probability of disease outbreak due to overstocking.';
                }
            }
        }

        const totalFeedNeeded = adjustedBiomass * adjustedFcr;
        const totalFeedCost = totalFeedNeeded * feedPrice;
        const revenue = adjustedBiomass * marketPrice;
        const totalCost = totalFeedCost + baselineOtherCosts;
        const simulatedNetProfit = revenue - totalCost;
        const profitDifference = simulatedNetProfit - baselineNetProfit;

        const simulation = this.simulationsRepository.create({
            userId,
            pondId: dto.pondId,
            scenarioType: dto.scenarioType,
            inputFeedPrice: variables.feedPrice,
            inputGrowthRate: variables.growthImprovement,
            inputSellingPrice: variables.sellingPrice,
            inputStockingDensity: variables.stockingDensity,
            resultProjectedBiomass: adjustedBiomass,
            resultProjectedFcr: adjustedFcr,
            resultTotalRevenue: revenue,
            resultTotalCost: totalCost,
            resultNetProfit: simulatedNetProfit,
            resultProfitDiff: profitDifference,
        });

        const savedSimulation = await this.simulationsRepository.save(simulation);

        const response: SimulationResult = {
            baselineNetProfit,
            simulatedNetProfit,
            profitDifference,
            projectedBiomass: adjustedBiomass,
            projectedFcr: adjustedFcr,
            totalRevenue: revenue,
            totalCost,
        };

        if (riskWarning) {
            response.riskWarning = riskWarning;
        }

        return {
            simulation: savedSimulation,
            result: response,
        };
    }
}
