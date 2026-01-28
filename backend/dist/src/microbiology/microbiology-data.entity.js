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
exports.MicrobiologyData = void 0;
const typeorm_1 = require("typeorm");
const crop_entity_1 = require("../crops/crop.entity");
let MicrobiologyData = class MicrobiologyData {
    id;
    cropId;
    crop;
    measurementDate;
    totalBacillusCfuMl;
    totalVibrioCountTvcCfuMl;
    yellowVibrioCountTvcCfuMl;
    greenVibrioCountTvcCfuMl;
    luminescentBacteriaLbCfuMl;
    note;
    createdAt;
};
exports.MicrobiologyData = MicrobiologyData;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MicrobiologyData.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'crop_id', type: 'uuid' }),
    __metadata("design:type", String)
], MicrobiologyData.prototype, "cropId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => crop_entity_1.Crop, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'crop_id' }),
    __metadata("design:type", crop_entity_1.Crop)
], MicrobiologyData.prototype, "crop", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', name: 'measurement_date' }),
    __metadata("design:type", Date)
], MicrobiologyData.prototype, "measurementDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'total_bacillus_cfu_ml' }),
    __metadata("design:type", Number)
], MicrobiologyData.prototype, "totalBacillusCfuMl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'total_vibrio_count_tvc_cfu_ml' }),
    __metadata("design:type", Number)
], MicrobiologyData.prototype, "totalVibrioCountTvcCfuMl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'yellow_vibrio_count_tvc_cfu_ml' }),
    __metadata("design:type", Number)
], MicrobiologyData.prototype, "yellowVibrioCountTvcCfuMl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'green_vibrio_count_tvc_cfu_ml' }),
    __metadata("design:type", Number)
], MicrobiologyData.prototype, "greenVibrioCountTvcCfuMl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'luminescent_bacteria_lb_cfu_ml' }),
    __metadata("design:type", Number)
], MicrobiologyData.prototype, "luminescentBacteriaLbCfuMl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, name: 'note' }),
    __metadata("design:type", String)
], MicrobiologyData.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], MicrobiologyData.prototype, "createdAt", void 0);
exports.MicrobiologyData = MicrobiologyData = __decorate([
    (0, typeorm_1.Entity)('microbiology_data')
], MicrobiologyData);
//# sourceMappingURL=microbiology-data.entity.js.map