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
exports.SamplingData = void 0;
const typeorm_1 = require("typeorm");
const crop_entity_1 = require("../crops/crop.entity");
let SamplingData = class SamplingData {
    id;
    cropId;
    crop;
    samplingDate;
    mbwG;
    totalSamples;
    stdDeviation;
    biomassEstimationKg;
    srEstimationPercent;
    notes;
    photoUrls;
    createdAt;
};
exports.SamplingData = SamplingData;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SamplingData.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'crop_id', type: 'uuid' }),
    __metadata("design:type", String)
], SamplingData.prototype, "cropId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => crop_entity_1.Crop, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'crop_id' }),
    __metadata("design:type", crop_entity_1.Crop)
], SamplingData.prototype, "crop", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', name: 'sampling_date' }),
    __metadata("design:type", Date)
], SamplingData.prototype, "samplingDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'mbw_g' }),
    __metadata("design:type", Number)
], SamplingData.prototype, "mbwG", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true, name: 'total_samples' }),
    __metadata("design:type", Number)
], SamplingData.prototype, "totalSamples", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'std_deviation' }),
    __metadata("design:type", Number)
], SamplingData.prototype, "stdDeviation", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'biomass_estimation_kg' }),
    __metadata("design:type", Number)
], SamplingData.prototype, "biomassEstimationKg", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'sr_estimation_percent' }),
    __metadata("design:type", Number)
], SamplingData.prototype, "srEstimationPercent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], SamplingData.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', array: true, nullable: true, default: [], name: 'photo_urls' }),
    __metadata("design:type", Array)
], SamplingData.prototype, "photoUrls", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], SamplingData.prototype, "createdAt", void 0);
exports.SamplingData = SamplingData = __decorate([
    (0, typeorm_1.Entity)('sampling_data')
], SamplingData);
//# sourceMappingURL=sampling-data.entity.js.map