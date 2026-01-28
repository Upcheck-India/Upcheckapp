export declare class ShrimpCalculationsService {
    calculateFcr(totalFeedKg: number, harvestWeightKg: number): number;
    calculateAdg(initialWeightG: number, finalWeightG: number, daysOfCulture: number): number;
    calculateSurvivalRate(initialStock: number, harvestedCount: number): number;
    calculateDailyFeed(biomassKg: number, feedingPercentage: number): number;
    calculateExpectedHarvest(stockingCount: number, survivalRatePercent: number, targetWeightG: number): {
        expectedCount: number;
        expectedWeightKg: number;
    };
    projectGrowth(currentWeightG: number, adgG: number, daysToProject: number): {
        projectedWeightG: number;
        projectedWeightByWeek: number[];
    };
    calculateBiomass(stockCount: number, averageWeightG: number): number;
    getRecommendedFeedingRate(averageWeightG: number): number;
    calculateCultivationPerformance(dailyFeed: number, fr: number, abw: number, cumulativeFeed: number, initialStocking: number): {
        biomass: number;
        population: number;
        fcr: number;
        sr: number;
    };
    calculateFreeAmmonia(tan: number, ph: number, temperature: number): {
        unionizedAmmonia: number;
        toxicityLevel: string;
    };
    calculateProductDosage(pondArea: number, waterLevel: number, dosage: number): {
        amountKg: number;
    };
}
