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
exports.WaterQualityRecord = void 0;
const typeorm_1 = require("typeorm");
const pond_entity_1 = require("../ponds/pond.entity");
let WaterQualityRecord = class WaterQualityRecord {
    id;
    pondId;
    pond;
    recordedAt;
    ph;
    temperature;
    dissolvedOxygen;
    salinity;
    ammonia;
    nitrite;
    nitrate;
    alkalinity;
    hardness;
    transparency;
    notes;
};
exports.WaterQualityRecord = WaterQualityRecord;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], WaterQualityRecord.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pond_id', type: 'uuid' }),
    __metadata("design:type", String)
], WaterQualityRecord.prototype, "pondId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => pond_entity_1.Pond, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'pond_id' }),
    __metadata("design:type", pond_entity_1.Pond)
], WaterQualityRecord.prototype, "pond", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'recorded_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], WaterQualityRecord.prototype, "recordedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], WaterQualityRecord.prototype, "ph", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], WaterQualityRecord.prototype, "temperature", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'dissolved_oxygen', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], WaterQualityRecord.prototype, "dissolvedOxygen", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], WaterQualityRecord.prototype, "salinity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], WaterQualityRecord.prototype, "ammonia", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], WaterQualityRecord.prototype, "nitrite", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], WaterQualityRecord.prototype, "nitrate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], WaterQualityRecord.prototype, "alkalinity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], WaterQualityRecord.prototype, "hardness", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], WaterQualityRecord.prototype, "transparency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], WaterQualityRecord.prototype, "notes", void 0);
exports.WaterQualityRecord = WaterQualityRecord = __decorate([
    (0, typeorm_1.Entity)('water_quality_records')
], WaterQualityRecord);
//# sourceMappingURL=water-quality-record.entity.js.map