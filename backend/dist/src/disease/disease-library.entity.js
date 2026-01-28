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
exports.DiseaseLibrary = void 0;
const typeorm_1 = require("typeorm");
let DiseaseLibrary = class DiseaseLibrary {
    id;
    name;
    scientificName;
    commonNames;
    symptoms;
    preventionMeasures;
    treatmentRecommendations;
    imageUrls;
    severityLevel;
    createdAt;
};
exports.DiseaseLibrary = DiseaseLibrary;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], DiseaseLibrary.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], DiseaseLibrary.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'scientific_name', type: 'text', nullable: true }),
    __metadata("design:type", String)
], DiseaseLibrary.prototype, "scientificName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', array: true, nullable: true, default: [] }),
    __metadata("design:type", Array)
], DiseaseLibrary.prototype, "commonNames", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', array: true, nullable: true, default: [] }),
    __metadata("design:type", Array)
], DiseaseLibrary.prototype, "symptoms", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'prevention_measures', type: 'text', array: true, nullable: true, default: [] }),
    __metadata("design:type", Array)
], DiseaseLibrary.prototype, "preventionMeasures", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'treatment_recommendations', type: 'text', array: true, nullable: true, default: [] }),
    __metadata("design:type", Array)
], DiseaseLibrary.prototype, "treatmentRecommendations", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'image_urls', type: 'text', array: true, nullable: true, default: [] }),
    __metadata("design:type", Array)
], DiseaseLibrary.prototype, "imageUrls", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'severity_level', type: 'text', nullable: true }),
    __metadata("design:type", String)
], DiseaseLibrary.prototype, "severityLevel", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], DiseaseLibrary.prototype, "createdAt", void 0);
exports.DiseaseLibrary = DiseaseLibrary = __decorate([
    (0, typeorm_1.Entity)('disease_library')
], DiseaseLibrary);
//# sourceMappingURL=disease-library.entity.js.map