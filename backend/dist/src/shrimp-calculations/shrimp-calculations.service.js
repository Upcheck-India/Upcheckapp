"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShrimpCalculationsService = void 0;
const common_1 = require("@nestjs/common");
let ShrimpCalculationsService = class ShrimpCalculationsService {
    calculateFcr(totalFeedKg, harvestWeightKg) {
        if (harvestWeightKg === 0)
            return 0;
        return Math.round((totalFeedKg / harvestWeightKg) * 100) / 100;
    }
    calculateAdg(initialWeightG, finalWeightG, daysOfCulture) {
        if (daysOfCulture === 0)
            return 0;
        return Math.round(((finalWeightG - initialWeightG) / daysOfCulture) * 1000) / 1000;
    }
    calculateSurvivalRate(initialStock, harvestedCount) {
        if (initialStock === 0)
            return 0;
        return Math.round((harvestedCount / initialStock) * 10000) / 100;
    }
    calculateDailyFeed(biomassKg, feedingPercentage) {
        return Math.round((biomassKg * feedingPercentage / 100) * 100) / 100;
    }
    calculateExpectedHarvest(stockingCount, survivalRatePercent, targetWeightG) {
        const expectedCount = Math.round(stockingCount * survivalRatePercent / 100);
        const expectedWeightKg = Math.round((expectedCount * targetWeightG / 1000) * 100) / 100;
        return { expectedCount, expectedWeightKg };
    }
    projectGrowth(currentWeightG, adgG, daysToProject) {
        const projectedWeightG = Math.round((currentWeightG + adgG * daysToProject) * 100) / 100;
        const projectedWeightByWeek = [];
        for (let week = 1; week <= Math.ceil(daysToProject / 7); week++) {
            const days = Math.min(week * 7, daysToProject);
            projectedWeightByWeek.push(Math.round((currentWeightG + adgG * days) * 100) / 100);
        }
        return { projectedWeightG, projectedWeightByWeek };
    }
    calculateBiomass(stockCount, averageWeightG) {
        return Math.round((stockCount * averageWeightG / 1000) * 100) / 100;
    }
    getRecommendedFeedingRate(averageWeightG) {
        if (averageWeightG < 3)
            return 10;
        if (averageWeightG < 5)
            return 8;
        if (averageWeightG < 10)
            return 5;
        if (averageWeightG < 15)
            return 4;
        if (averageWeightG < 20)
            return 3;
        return 2.5;
    }
    calculateCultivationPerformance(dailyFeed, fr, abw, cumulativeFeed, initialStocking) {
        if (fr === 0 || abw === 0) {
            return { biomass: 0, population: 0, fcr: 0, sr: 0 };
        }
        const biomass = dailyFeed / (fr / 100);
        const population = (biomass * 1000) / abw;
        const fcr = biomass > 0 ? cumulativeFeed / biomass : 0;
        const sr = initialStocking > 0 ? (population / initialStocking) * 100 : 0;
        return {
            biomass: Math.round(biomass * 100) / 100,
            population: Math.round(population),
            fcr: Math.round(fcr * 100) / 100,
            sr: Math.round(sr * 100) / 100,
        };
    }
    calculateFreeAmmonia(tan, ph, temperature) {
        const tempK = temperature + 273.15;
        const pKa = 0.09018 + (2729.92 / tempK);
        const nh3 = tan * (1 / (1 + Math.pow(10, pKa - ph)));
        let toxicityLevel = 'safe';
        if (nh3 > 0.5)
            toxicityLevel = 'critical';
        else if (nh3 > 0.1)
            toxicityLevel = 'warning';
        return {
            unionizedAmmonia: Number(nh3.toFixed(4)),
            toxicityLevel,
        };
    }
    calculateProductDosage(pondArea, waterLevel, dosage) {
        const amountKg = (pondArea * waterLevel * dosage) / 1000;
        return {
            amountKg: Math.round(amountKg * 100) / 100,
        };
    }
};
exports.ShrimpCalculationsService = ShrimpCalculationsService;
exports.ShrimpCalculationsService = ShrimpCalculationsService = __decorate([
    (0, common_1.Injectable)()
], ShrimpCalculationsService);
//# sourceMappingURL=shrimp-calculations.service.js.map