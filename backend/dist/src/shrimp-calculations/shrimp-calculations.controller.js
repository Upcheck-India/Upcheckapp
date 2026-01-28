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
exports.ShrimpCalculationsController = void 0;
const common_1 = require("@nestjs/common");
const shrimp_calculations_service_1 = require("./shrimp-calculations.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const calculation_dto_1 = require("./dto/calculation.dto");
const advanced_calculations_dto_1 = require("./dto/advanced-calculations.dto");
let ShrimpCalculationsController = class ShrimpCalculationsController {
    calculationsService;
    constructor(calculationsService) {
        this.calculationsService = calculationsService;
    }
    calculateFcr(dto) {
        return {
            fcr: this.calculationsService.calculateFcr(dto.totalFeedKg, dto.harvestWeightKg),
        };
    }
    calculateAdg(dto) {
        return {
            adgG: this.calculationsService.calculateAdg(dto.initialWeightG, dto.finalWeightG, dto.daysOfCulture),
        };
    }
    calculateSurvivalRate(dto) {
        return {
            survivalRatePercent: this.calculationsService.calculateSurvivalRate(dto.initialStock, dto.harvestedCount),
        };
    }
    calculateDailyFeed(dto) {
        return {
            dailyFeedKg: this.calculationsService.calculateDailyFeed(dto.biomassKg, dto.feedingPercentage),
        };
    }
    calculateExpectedHarvest(dto) {
        return this.calculationsService.calculateExpectedHarvest(dto.stockingCount, dto.survivalRatePercent, dto.targetWeightG);
    }
    projectGrowth(dto) {
        return this.calculationsService.projectGrowth(dto.currentWeightG, dto.adgG, dto.daysToProject);
    }
    calculatePerformance(dto) {
        return this.calculationsService.calculateCultivationPerformance(dto.dailyFeed, dto.fr, dto.abw, dto.cumulativeFeed, dto.initialStocking);
    }
    calculateFreeAmmonia(dto) {
        return this.calculationsService.calculateFreeAmmonia(dto.tan, dto.ph, dto.temperature);
    }
    calculateProductAmount(dto) {
        return this.calculationsService.calculateProductDosage(dto.pondArea, dto.waterLevel, dto.dosage);
    }
    calculateBiomass(stockCount, averageWeightG) {
        return {
            biomassKg: this.calculationsService.calculateBiomass(Number(stockCount), Number(averageWeightG)),
        };
    }
    getRecommendedFeedingRate(averageWeightG) {
        return {
            recommendedFeedingRatePercent: this.calculationsService.getRecommendedFeedingRate(Number(averageWeightG)),
        };
    }
};
exports.ShrimpCalculationsController = ShrimpCalculationsController;
__decorate([
    (0, common_1.Post)('fcr'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [calculation_dto_1.CalculateFcrDto]),
    __metadata("design:returntype", void 0)
], ShrimpCalculationsController.prototype, "calculateFcr", null);
__decorate([
    (0, common_1.Post)('adg'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [calculation_dto_1.CalculateAdgDto]),
    __metadata("design:returntype", void 0)
], ShrimpCalculationsController.prototype, "calculateAdg", null);
__decorate([
    (0, common_1.Post)('survival-rate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [calculation_dto_1.CalculateSurvivalRateDto]),
    __metadata("design:returntype", void 0)
], ShrimpCalculationsController.prototype, "calculateSurvivalRate", null);
__decorate([
    (0, common_1.Post)('daily-feed'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [calculation_dto_1.CalculateFeedingRateDto]),
    __metadata("design:returntype", void 0)
], ShrimpCalculationsController.prototype, "calculateDailyFeed", null);
__decorate([
    (0, common_1.Post)('expected-harvest'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [calculation_dto_1.CalculateExpectedHarvestDto]),
    __metadata("design:returntype", void 0)
], ShrimpCalculationsController.prototype, "calculateExpectedHarvest", null);
__decorate([
    (0, common_1.Post)('growth-projection'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [calculation_dto_1.GrowthProjectionDto]),
    __metadata("design:returntype", void 0)
], ShrimpCalculationsController.prototype, "projectGrowth", null);
__decorate([
    (0, common_1.Post)('cultivation-performance'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [advanced_calculations_dto_1.CultivationPerformanceDto]),
    __metadata("design:returntype", void 0)
], ShrimpCalculationsController.prototype, "calculatePerformance", null);
__decorate([
    (0, common_1.Post)('free-ammonia'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [advanced_calculations_dto_1.FreeAmmoniaDto]),
    __metadata("design:returntype", void 0)
], ShrimpCalculationsController.prototype, "calculateFreeAmmonia", null);
__decorate([
    (0, common_1.Post)('product-amount'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [advanced_calculations_dto_1.ProductDosageDto]),
    __metadata("design:returntype", void 0)
], ShrimpCalculationsController.prototype, "calculateProductAmount", null);
__decorate([
    (0, common_1.Get)('biomass'),
    __param(0, (0, common_1.Query)('stockCount')),
    __param(1, (0, common_1.Query)('averageWeightG')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], ShrimpCalculationsController.prototype, "calculateBiomass", null);
__decorate([
    (0, common_1.Get)('recommended-feeding-rate'),
    __param(0, (0, common_1.Query)('averageWeightG')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ShrimpCalculationsController.prototype, "getRecommendedFeedingRate", null);
exports.ShrimpCalculationsController = ShrimpCalculationsController = __decorate([
    (0, common_1.Controller)('shrimp-calculations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [shrimp_calculations_service_1.ShrimpCalculationsService])
], ShrimpCalculationsController);
//# sourceMappingURL=shrimp-calculations.controller.js.map