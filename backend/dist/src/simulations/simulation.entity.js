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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Simulation = void 0;
const typeorm_1 = require("typeorm");
const pond_entity_1 = require("../ponds/pond.entity");
let Simulation = class Simulation {
    id;
    userId;
    pondId;
    pond;
    scenarioType;
    inputFeedPrice;
    inputGrowthRate;
    inputSellingPrice;
    inputStockingDensity;
    resultProjectedBiomass;
    resultProjectedFcr;
    resultTotalRevenue;
    resultTotalCost;
    resultNetProfit;
    resultProfitDiff;
    createdAt;
};
exports.Simulation = Simulation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Simulation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Simulation.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pond_id', type: 'uuid' }),
    __metadata("design:type", String)
], Simulation.prototype, "pondId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => pond_entity_1.Pond, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'pond_id' }),
    __metadata("design:type", pond_entity_1.Pond)
], Simulation.prototype, "pond", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'scenario_type', type: 'text' }),
    __metadata("design:type", String)
], Simulation.prototype, "scenarioType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'input_feed_price', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], Simulation.prototype, "inputFeedPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'input_growth_rate', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], Simulation.prototype, "inputGrowthRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'input_selling_price', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], Simulation.prototype, "inputSellingPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'input_stocking_density', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], Simulation.prototype, "inputStockingDensity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'result_projected_biomass', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], Simulation.prototype, "resultProjectedBiomass", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'result_projected_fcr', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], Simulation.prototype, "resultProjectedFcr", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'result_total_revenue', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], Simulation.prototype, "resultTotalRevenue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'result_total_cost', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], Simulation.prototype, "resultTotalCost", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'result_net_profit', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], Simulation.prototype, "resultNetProfit", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'result_profit_diff', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], Simulation.prototype, "resultProfitDiff", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], Simulation.prototype, "createdAt", void 0);
exports.Simulation = Simulation = __decorate([
    (0, typeorm_1.Entity)('simulations')
], Simulation);
//# sourceMappingURL=simulation.entity.js.map