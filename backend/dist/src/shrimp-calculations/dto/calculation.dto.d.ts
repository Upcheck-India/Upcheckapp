export declare class CalculateFcrDto {
    totalFeedKg: number;
    harvestWeightKg: number;
}
export declare class CalculateAdgDto {
    initialWeightG: number;
    finalWeightG: number;
    daysOfCulture: number;
}
export declare class CalculateSurvivalRateDto {
    initialStock: number;
    harvestedCount: number;
}
export declare class CalculateFeedingRateDto {
    biomassKg: number;
    feedingPercentage: number;
}
export declare class CalculateExpectedHarvestDto {
    stockingCount: number;
    survivalRatePercent: number;
    targetWeightG: number;
}
export declare class GrowthProjectionDto {
    currentWeightG: number;
    adgG: number;
    daysToProject: number;
}
