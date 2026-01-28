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
exports.Crop = void 0;
const typeorm_1 = require("typeorm");
const pond_entity_1 = require("../ponds/pond.entity");
let Crop = class Crop {
    id;
    pondId;
    pond;
    farmId;
    createdAt;
    updatedAt;
    name;
    cropCode;
    totalSeed;
    seedType;
    stockingDate;
    initialAgeDays;
    preparationDays;
    totalFeedingTrays;
    hatcheryId;
    speciesId;
    broodstockId;
    speciesType;
    stockingDensity;
    stockingCount;
    feedPriceRpPerKg;
    carryingCapacityKgM2;
    targetCultivationDays;
    targetSize;
    targetSrPercent;
    srPredictionMethod;
    doc;
    isActive;
    expectedHarvestDate;
    actualHarvestDate;
    harvestWeightKg;
    status;
};
exports.Crop = Crop;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Crop.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pond_id', type: 'uuid' }),
    __metadata("design:type", String)
], Crop.prototype, "pondId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => pond_entity_1.Pond, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'pond_id' }),
    __metadata("design:type", pond_entity_1.Pond)
], Crop.prototype, "pond", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'farm_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Crop.prototype, "farmId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], Crop.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], Crop.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Crop.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'crop_code', type: 'text', nullable: true }),
    __metadata("design:type", String)
], Crop.prototype, "cropCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_seed', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], Crop.prototype, "totalSeed", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'seed_type', type: 'text', nullable: true }),
    __metadata("design:type", String)
], Crop.prototype, "seedType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'stocking_date', type: 'date', nullable: true }),
    __metadata("design:type", Date)
], Crop.prototype, "stockingDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'initial_age_days', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Crop.prototype, "initialAgeDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'preparation_days', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Crop.prototype, "preparationDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_feeding_trays', type: 'int', default: 4 }),
    __metadata("design:type", Number)
], Crop.prototype, "totalFeedingTrays", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'hatchery_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Crop.prototype, "hatcheryId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'species_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Crop.prototype, "speciesId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'broodstock_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Crop.prototype, "broodstockId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'species_type', type: 'text', nullable: true }),
    __metadata("design:type", String)
], Crop.prototype, "speciesType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'stocking_density', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], Crop.prototype, "stockingDensity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'stocking_count', type: 'integer', nullable: true }),
    __metadata("design:type", Number)
], Crop.prototype, "stockingCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'feed_price_rp_per_kg', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], Crop.prototype, "feedPriceRpPerKg", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'carrying_capacity_kg_m2', type: 'numeric', default: 1.25 }),
    __metadata("design:type", Number)
], Crop.prototype, "carryingCapacityKgM2", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'target_cultivation_days', type: 'int', default: 120 }),
    __metadata("design:type", Number)
], Crop.prototype, "targetCultivationDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'target_size', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], Crop.prototype, "targetSize", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'target_sr_percent', type: 'numeric', default: 75.0 }),
    __metadata("design:type", Number)
], Crop.prototype, "targetSrPercent", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sr_prediction_method', type: 'text', default: 'feed_ratio' }),
    __metadata("design:type", String)
], Crop.prototype, "srPredictionMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Crop.prototype, "doc", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Crop.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expected_harvest_date', type: 'timestamp with time zone', nullable: true }),
    __metadata("design:type", Date)
], Crop.prototype, "expectedHarvestDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'actual_harvest_date', type: 'timestamp with time zone', nullable: true }),
    __metadata("design:type", Date)
], Crop.prototype, "actualHarvestDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'harvest_weight_kg', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], Crop.prototype, "harvestWeightKg", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', default: 'active' }),
    __metadata("design:type", String)
], Crop.prototype, "status", void 0);
exports.Crop = Crop = __decorate([
    (0, typeorm_1.Entity)('crops')
], Crop);
//# sourceMappingURL=crop.entity.js.map