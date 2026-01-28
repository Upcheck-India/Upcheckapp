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
exports.HarvestPlan = void 0;
const typeorm_1 = require("typeorm");
const pond_entity_1 = require("../ponds/pond.entity");
let HarvestPlan = class HarvestPlan {
    id;
    pondId;
    pond;
    cropId;
    plannedHarvestDate;
    targetWeightKg;
    expectedPricePerKg;
    expectedRevenue;
    actualHarvestDate;
    actualWeightKg;
    actualPricePerKg;
    actualRevenue;
    notes;
    status;
    createdAt;
    updatedAt;
};
exports.HarvestPlan = HarvestPlan;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], HarvestPlan.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pond_id', type: 'uuid' }),
    __metadata("design:type", String)
], HarvestPlan.prototype, "pondId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => pond_entity_1.Pond, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'pond_id' }),
    __metadata("design:type", pond_entity_1.Pond)
], HarvestPlan.prototype, "pond", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'crop_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], HarvestPlan.prototype, "cropId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'planned_harvest_date', type: 'timestamp with time zone', nullable: true }),
    __metadata("design:type", Date)
], HarvestPlan.prototype, "plannedHarvestDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'target_weight_kg', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], HarvestPlan.prototype, "targetWeightKg", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expected_price_per_kg', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], HarvestPlan.prototype, "expectedPricePerKg", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expected_revenue', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], HarvestPlan.prototype, "expectedRevenue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'actual_harvest_date', type: 'timestamp with time zone', nullable: true }),
    __metadata("design:type", Date)
], HarvestPlan.prototype, "actualHarvestDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'actual_weight_kg', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], HarvestPlan.prototype, "actualWeightKg", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'actual_price_per_kg', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], HarvestPlan.prototype, "actualPricePerKg", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'actual_revenue', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], HarvestPlan.prototype, "actualRevenue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], HarvestPlan.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', default: 'planned' }),
    __metadata("design:type", String)
], HarvestPlan.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], HarvestPlan.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], HarvestPlan.prototype, "updatedAt", void 0);
exports.HarvestPlan = HarvestPlan = __decorate([
    (0, typeorm_1.Entity)('harvest_plans')
], HarvestPlan);
//# sourceMappingURL=harvest-plan.entity.js.map