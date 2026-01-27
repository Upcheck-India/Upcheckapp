import { Injectable } from '@nestjs/common';

@Injectable()
export class ShrimpCalculationsService {
    /**
     * Calculate Feed Conversion Ratio (FCR)
     * FCR = Total Feed Used (kg) / Total Harvest Weight (kg)
     * Lower is better (typically 1.2-1.8 for shrimp)
     */
    calculateFcr(totalFeedKg: number, harvestWeightKg: number): number {
        if (harvestWeightKg === 0) return 0;
        return Math.round((totalFeedKg / harvestWeightKg) * 100) / 100;
    }

    /**
     * Calculate Average Daily Growth (ADG) in grams
     * ADG = (Final Weight - Initial Weight) / Days of Culture
     */
    calculateAdg(initialWeightG: number, finalWeightG: number, daysOfCulture: number): number {
        if (daysOfCulture === 0) return 0;
        return Math.round(((finalWeightG - initialWeightG) / daysOfCulture) * 1000) / 1000;
    }

    /**
     * Calculate Survival Rate (%)
     * SR = (Harvested Count / Initial Stock) * 100
     */
    calculateSurvivalRate(initialStock: number, harvestedCount: number): number {
        if (initialStock === 0) return 0;
        return Math.round((harvestedCount / initialStock) * 10000) / 100;
    }

    /**
     * Calculate Daily Feeding Amount based on biomass
     * Daily Feed = Biomass (kg) * Feeding Rate (%)
     */
    calculateDailyFeed(biomassKg: number, feedingPercentage: number): number {
        return Math.round((biomassKg * feedingPercentage / 100) * 100) / 100;
    }

    /**
     * Calculate Expected Harvest Weight
     * Expected = Stock Count * Survival Rate * Target Weight
     */
    calculateExpectedHarvest(stockingCount: number, survivalRatePercent: number, targetWeightG: number): {
        expectedCount: number;
        expectedWeightKg: number;
    } {
        const expectedCount = Math.round(stockingCount * survivalRatePercent / 100);
        const expectedWeightKg = Math.round((expectedCount * targetWeightG / 1000) * 100) / 100;
        return { expectedCount, expectedWeightKg };
    }

    /**
     * Project growth based on ADG
     */
    projectGrowth(currentWeightG: number, adgG: number, daysToProject: number): {
        projectedWeightG: number;
        projectedWeightByWeek: number[];
    } {
        const projectedWeightG = Math.round((currentWeightG + adgG * daysToProject) * 100) / 100;
        const projectedWeightByWeek: number[] = [];

        for (let week = 1; week <= Math.ceil(daysToProject / 7); week++) {
            const days = Math.min(week * 7, daysToProject);
            projectedWeightByWeek.push(Math.round((currentWeightG + adgG * days) * 100) / 100);
        }

        return { projectedWeightG, projectedWeightByWeek };
    }

    /**
     * Calculate biomass
     * Biomass = (Stock Count * Average Weight) / 1000
     */
    calculateBiomass(stockCount: number, averageWeightG: number): number {
        return Math.round((stockCount * averageWeightG / 1000) * 100) / 100;
    }

    /**
     * Get feeding rate recommendation based on shrimp size
     */
    getRecommendedFeedingRate(averageWeightG: number): number {
        if (averageWeightG < 3) return 10;
        if (averageWeightG < 5) return 8;
        if (averageWeightG < 10) return 5;
        if (averageWeightG < 15) return 4;
        if (averageWeightG < 20) return 3;
        return 2.5;
    }
}
