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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiseaseController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const disease_service_1 = require("./disease.service");
const create_disease_dto_1 = require("./dto/create-disease.dto");
let DiseaseController = class DiseaseController {
    diseaseService;
    constructor(diseaseService) {
        this.diseaseService = diseaseService;
    }
    createDisease(dto) {
        return this.diseaseService.createDisease(dto);
    }
    findAllDiseases() {
        return this.diseaseService.findAllDiseases();
    }
    findDiseaseById(id) {
        return this.diseaseService.findDiseaseById(id);
    }
    recordOccurrence(dto) {
        return this.diseaseService.recordOccurrence(dto);
    }
    findRecordsByCrop(cropId) {
        return this.diseaseService.findRecordsByCrop(cropId);
    }
};
exports.DiseaseController = DiseaseController;
__decorate([
    (0, common_1.Post)('library'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_disease_dto_1.CreateDiseaseDto]),
    __metadata("design:returntype", void 0)
], DiseaseController.prototype, "createDisease", null);
__decorate([
    (0, common_1.Get)('library'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DiseaseController.prototype, "findAllDiseases", null);
__decorate([
    (0, common_1.Get)('library/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DiseaseController.prototype, "findDiseaseById", null);
__decorate([
    (0, common_1.Post)('record'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_disease_dto_1.CreateDiseaseRecordDto]),
    __metadata("design:returntype", void 0)
], DiseaseController.prototype, "recordOccurrence", null);
__decorate([
    (0, common_1.Get)('record/crop/:cropId'),
    __param(0, (0, common_1.Param)('cropId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DiseaseController.prototype, "findRecordsByCrop", null);
exports.DiseaseController = DiseaseController = __decorate([
    (0, common_1.Controller)('disease'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [disease_service_1.DiseaseService])
], DiseaseController);
//# sourceMappingURL=disease.controller.js.map