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
exports.HarvestRecord = void 0;
const typeorm_1 = require("typeorm");
const crop_entity_1 = require("../crops/crop.entity");
let HarvestRecord = class HarvestRecord {
    id;
    cropId;
    crop;
    harvestDate;
    harvestType;
    totalWeightKg;
    countPerKg;
    pricePerKgRp;
    buyerName;
    notes;
    createdAt;
};
exports.HarvestRecord = HarvestRecord;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], HarvestRecord.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'crop_id', type: 'uuid' }),
    __metadata("design:type", String)
], HarvestRecord.prototype, "cropId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => crop_entity_1.Crop, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'crop_id' }),
    __metadata("design:type", crop_entity_1.Crop)
], HarvestRecord.prototype, "crop", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', name: 'harvest_date' }),
    __metadata("design:type", Date)
], HarvestRecord.prototype, "harvestDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, name: 'harvest_type' }),
    __metadata("design:type", String)
], HarvestRecord.prototype, "harvestType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', name: 'total_weight_kg' }),
    __metadata("design:type", Number)
], HarvestRecord.prototype, "totalWeightKg", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true, name: 'count_per_kg' }),
    __metadata("design:type", Number)
], HarvestRecord.prototype, "countPerKg", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true, name: 'price_per_kg_rp' }),
    __metadata("design:type", Number)
], HarvestRecord.prototype, "pricePerKgRp", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, name: 'buyer_name' }),
    __metadata("design:type", String)
], HarvestRecord.prototype, "buyerName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], HarvestRecord.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], HarvestRecord.prototype, "createdAt", void 0);
exports.HarvestRecord = HarvestRecord = __decorate([
    (0, typeorm_1.Entity)('harvest_records')
], HarvestRecord);
//# sourceMappingURL=harvest-record.entity.js.map