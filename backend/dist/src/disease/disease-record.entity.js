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
exports.DiseaseRecord = void 0;
const typeorm_1 = require("typeorm");
const crop_entity_1 = require("../crops/crop.entity");
const disease_library_entity_1 = require("./disease-library.entity");
let DiseaseRecord = class DiseaseRecord {
    id;
    cropId;
    crop;
    diseaseId;
    disease;
    recordedDate;
    severityAtDetection;
    photoUrls;
    notes;
    createdAt;
};
exports.DiseaseRecord = DiseaseRecord;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], DiseaseRecord.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'crop_id', type: 'uuid' }),
    __metadata("design:type", String)
], DiseaseRecord.prototype, "cropId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => crop_entity_1.Crop, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'crop_id' }),
    __metadata("design:type", crop_entity_1.Crop)
], DiseaseRecord.prototype, "crop", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'disease_id', type: 'uuid' }),
    __metadata("design:type", String)
], DiseaseRecord.prototype, "diseaseId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => disease_library_entity_1.DiseaseLibrary, { onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'disease_id' }),
    __metadata("design:type", disease_library_entity_1.DiseaseLibrary)
], DiseaseRecord.prototype, "disease", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', name: 'recorded_date' }),
    __metadata("design:type", Date)
], DiseaseRecord.prototype, "recordedDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'severity_at_detection', type: 'text', nullable: true }),
    __metadata("design:type", String)
], DiseaseRecord.prototype, "severityAtDetection", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'photo_urls', type: 'text', array: true, nullable: true, default: [] }),
    __metadata("design:type", Array)
], DiseaseRecord.prototype, "photoUrls", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], DiseaseRecord.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], DiseaseRecord.prototype, "createdAt", void 0);
exports.DiseaseRecord = DiseaseRecord = __decorate([
    (0, typeorm_1.Entity)('disease_records')
], DiseaseRecord);
//# sourceMappingURL=disease-record.entity.js.map