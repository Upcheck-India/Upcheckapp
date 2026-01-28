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
exports.HarvestPlansService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const harvest_plan_entity_1 = require("./harvest-plan.entity");
const transaction_entity_1 = require("../transactions/transaction.entity");
const crop_entity_1 = require("../crops/crop.entity");
let HarvestPlansService = class HarvestPlansService {
    plansRepository;
    transactionsRepository;
    cropsRepository;
    constructor(plansRepository, transactionsRepository, cropsRepository) {
        this.plansRepository = plansRepository;
        this.transactionsRepository = transactionsRepository;
        this.cropsRepository = cropsRepository;
    }
    create(createDto) {
        const plan = this.plansRepository.create(createDto);
        return this.plansRepository.save(plan);
    }
    findAll(pondId) {
        if (pondId) {
            return this.plansRepository.find({ where: { pondId }, order: { createdAt: 'DESC' } });
        }
        return this.plansRepository.find({ order: { createdAt: 'DESC' } });
    }
    findOne(id) {
        return this.plansRepository.findOneBy({ id });
    }
    async update(id, updateDto) {
        await this.plansRepository.update(id, updateDto);
        return this.findOne(id);
    }
    remove(id) {
        return this.plansRepository.delete(id);
    }
    async completePlan(id, payload) {
        const plan = await this.findOne(id);
        if (!plan) {
            throw new common_1.NotFoundException('Harvest plan not found');
        }
        const actualRevenue = payload.actualWeightKg * payload.actualPricePerKg;
        await this.plansRepository.update(id, {
            actualHarvestDate: payload.actualHarvestDate,
            actualWeightKg: payload.actualWeightKg,
            actualPricePerKg: payload.actualPricePerKg,
            actualRevenue,
            status: 'completed',
        });
        await this.transactionsRepository.save(this.transactionsRepository.create({
            farmId: payload.farmId,
            transactionDate: payload.actualHarvestDate,
            type: 'income',
            category: 'harvest_sale',
            amount: actualRevenue,
            description: `Harvest sale from plan ${plan.id}`,
        }));
        if (payload.cropId) {
            await this.cropsRepository.update(payload.cropId, {
                actualHarvestDate: payload.actualHarvestDate,
                harvestWeightKg: payload.actualWeightKg,
                status: 'harvested',
            });
        }
        return this.findOne(id);
    }
    async getCycleSummary(pondId, farmId) {
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
};
exports.HarvestPlansService = HarvestPlansService;
exports.HarvestPlansService = HarvestPlansService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(harvest_plan_entity_1.HarvestPlan)),
    __param(1, (0, typeorm_1.InjectRepository)(transaction_entity_1.Transaction)),
    __param(2, (0, typeorm_1.InjectRepository)(crop_entity_1.Crop)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], HarvestPlansService);
//# sourceMappingURL=harvest-plans.service.js.map