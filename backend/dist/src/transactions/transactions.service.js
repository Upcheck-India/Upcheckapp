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
exports.TransactionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const transaction_entity_1 = require("./transaction.entity");
let TransactionsService = class TransactionsService {
    transactionsRepository;
    constructor(transactionsRepository) {
        this.transactionsRepository = transactionsRepository;
    }
    create(createDto) {
        const transaction = this.transactionsRepository.create(createDto);
        return this.transactionsRepository.save(transaction);
    }
    findAll(farmId, type) {
        const where = {};
        if (farmId)
            where.farmId = farmId;
        if (type)
            where.type = type;
        return this.transactionsRepository.find({
            where,
            order: { transactionDate: 'DESC' },
        });
    }
    findOne(id) {
        return this.transactionsRepository.findOneBy({ id });
    }
    async update(id, updateDto) {
        await this.transactionsRepository.update(id, updateDto);
        return this.findOne(id);
    }
    remove(id) {
        return this.transactionsRepository.delete(id);
    }
    async getSummaryByFarm(farmId) {
        const income = await this.transactionsRepository
            .createQueryBuilder('t')
            .select('SUM(t.amount)', 'total')
            .where('t.farmId = :farmId', { farmId })
            .andWhere('t.type = :type', { type: 'income' })
            .getRawOne();
        const expense = await this.transactionsRepository
            .createQueryBuilder('t')
            .select('SUM(t.amount)', 'total')
            .where('t.farmId = :farmId', { farmId })
            .andWhere('t.type = :type', { type: 'expense' })
            .getRawOne();
        return {
            totalIncome: income?.total || 0,
            totalExpense: expense?.total || 0,
            netProfit: (income?.total || 0) - (expense?.total || 0),
        };
    }
};
exports.TransactionsService = TransactionsService;
exports.TransactionsService = TransactionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(transaction_entity_1.Transaction)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], TransactionsService);
//# sourceMappingURL=transactions.service.js.map