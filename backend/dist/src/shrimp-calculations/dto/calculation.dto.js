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
exports.GrowthProjectionDto = exports.CalculateExpectedHarvestDto = exports.CalculateFeedingRateDto = exports.CalculateSurvivalRateDto = exports.CalculateAdgDto = exports.CalculateFcrDto = void 0;
const class_validator_1 = require("class-validator");
class CalculateFcrDto {
    totalFeedKg;
    harvestWeightKg;
}
exports.CalculateFcrDto = CalculateFcrDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CalculateFcrDto.prototype, "totalFeedKg", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CalculateFcrDto.prototype, "harvestWeightKg", void 0);
class CalculateAdgDto {
    initialWeightG;
    finalWeightG;
    daysOfCulture;
}
exports.CalculateAdgDto = CalculateAdgDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CalculateAdgDto.prototype, "initialWeightG", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CalculateAdgDto.prototype, "finalWeightG", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CalculateAdgDto.prototype, "daysOfCulture", void 0);
class CalculateSurvivalRateDto {
    initialStock;
    harvestedCount;
}
exports.CalculateSurvivalRateDto = CalculateSurvivalRateDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CalculateSurvivalRateDto.prototype, "initialStock", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CalculateSurvivalRateDto.prototype, "harvestedCount", void 0);
class CalculateFeedingRateDto {
    biomassKg;
    feedingPercentage;
}
exports.CalculateFeedingRateDto = CalculateFeedingRateDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CalculateFeedingRateDto.prototype, "biomassKg", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CalculateFeedingRateDto.prototype, "feedingPercentage", void 0);
class CalculateExpectedHarvestDto {
    stockingCount;
    survivalRatePercent;
    targetWeightG;
}
exports.CalculateExpectedHarvestDto = CalculateExpectedHarvestDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CalculateExpectedHarvestDto.prototype, "stockingCount", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CalculateExpectedHarvestDto.prototype, "survivalRatePercent", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CalculateExpectedHarvestDto.prototype, "targetWeightG", void 0);
class GrowthProjectionDto {
    currentWeightG;
    adgG;
    daysToProject;
}
exports.GrowthProjectionDto = GrowthProjectionDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], GrowthProjectionDto.prototype, "currentWeightG", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], GrowthProjectionDto.prototype, "adgG", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], GrowthProjectionDto.prototype, "daysToProject", void 0);
//# sourceMappingURL=calculation.dto.js.map