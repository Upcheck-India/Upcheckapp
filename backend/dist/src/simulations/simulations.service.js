"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crop_entity_1 = require("../crops/crop.entity");
const feed_record_entity_1 = require("../feed-records/feed-record.entity");
const pond_entity_1 = require("../ponds/pond.entity");
const transaction_entity_1 = require("../transactions/transaction.entity");
const simulation_entity_1 = require("./simulation.entity");
const run_simulation_dto_1 = require("./dto/run-simulation.dto");
let SimulationsService = class SimulationsService {
    simulationsRepository;
    cropsRepository;
    feedRepository;
    transactionsRepository;
    pondsRepository;
    constructor(simulationsRepository, cropsRepository, feedRepository, transactionsRepository, pondsRepository) {
        this.simulationsRepository = simulationsRepository;
        this.cropsRepository = cropsRepository;
        this.feedRepository = feedRepository;
        this.transactionsRepository = transactionsRepository;
        this.pondsRepository = pondsRepository;
    }
    async runSimulation(dto, userId) {
        const pond = await this.pondsRepository.findOne({
            where: { id: dto.pondId },
            relations: ['farm'],
        });
        if (!pond) {
            throw new common_1.NotFoundException('Pond not found');
        }
        if (pond.farm.userId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to run simulations for this pond');
        }
        const crop = await this.cropsRepository.findOne({
            where: { pondId: dto.pondId, status: 'active' },
        });
        if (!crop) {
            throw new common_1.NotFoundException('Active crop not found for pond');
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
        let riskWarning;
        if (dto.scenarioType === run_simulation_dto_1.SimulationScenarioType.FeedChange) {
            const growthImprovement = variables.growthImprovement ?? 0;
            adjustedBiomass = baselineBiomass * (1 + growthImprovement / 100);
            adjustedFcr = baselineFcr * (1 - growthImprovement / 200);
        }
        if (dto.scenarioType === run_simulation_dto_1.SimulationScenarioType.PriceChange && variables.sellingPrice !== undefined) {
            marketPrice = variables.sellingPrice;
        }
        if (dto.scenarioType === run_simulation_dto_1.SimulationScenarioType.StockingDensity) {
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
        const response = {
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
};
exports.SimulationsService = SimulationsService;
exports.SimulationsService = SimulationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(simulation_entity_1.Simulation)),
    __param(1, (0, typeorm_1.InjectRepository)(crop_entity_1.Crop)),
    __param(2, (0, typeorm_1.InjectRepository)(feed_record_entity_1.FeedRecord)),
    __param(3, (0, typeorm_1.InjectRepository)(transaction_entity_1.Transaction)),
    __param(4, (0, typeorm_1.InjectRepository)(pond_entity_1.Pond)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], SimulationsService);
//# sourceMappingURL=simulations.service.js.map