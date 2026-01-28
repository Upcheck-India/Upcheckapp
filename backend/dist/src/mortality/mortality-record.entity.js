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
exports.MortalityRecord = void 0;
const typeorm_1 = require("typeorm");
const crop_entity_1 = require("../crops/crop.entity");
let MortalityRecord = class MortalityRecord {
    id;
    cropId;
    crop;
    recordDate;
    quantity;
    estimatedWeightKg;
    note;
    images;
    createdAt;
};
exports.MortalityRecord = MortalityRecord;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MortalityRecord.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'crop_id', type: 'uuid' }),
    __metadata("design:type", String)
], MortalityRecord.prototype, "cropId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => crop_entity_1.Crop, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'crop_id' }),
    __metadata("design:type", crop_entity_1.Crop)
], MortalityRecord.prototype, "crop", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', name: 'record_date' }),
    __metadata("design:type", Date)
], MortalityRecord.prototype, "recordDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], MortalityRecord.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'estimated_weight_kg' }),
    __metadata("design:type", Number)
], MortalityRecord.prototype, "estimatedWeightKg", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], MortalityRecord.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', array: true, nullable: true, default: [] }),
    __metadata("design:type", Array)
], MortalityRecord.prototype, "images", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], MortalityRecord.prototype, "createdAt", void 0);
exports.MortalityRecord = MortalityRecord = __decorate([
    (0, typeorm_1.Entity)('mortality_records')
], MortalityRecord);
//# sourceMappingURL=mortality-record.entity.js.map