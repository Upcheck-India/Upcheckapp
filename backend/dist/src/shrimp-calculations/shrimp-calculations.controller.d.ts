import { ShrimpCalculationsService } from './shrimp-calculations.service';
import { CalculateFcrDto, CalculateAdgDto, CalculateSurvivalRateDto, CalculateFeedingRateDto, CalculateExpectedHarvestDto, GrowthProjectionDto } from './dto/calculation.dto';
import { CultivationPerformanceDto, FreeAmmoniaDto, ProductDosageDto } from './dto/advanced-calculations.dto';
export declare class ShrimpCalculationsController {
    private readonly calculationsService;
    constructor(calculationsService: ShrimpCalculationsService);
    calculateFcr(dto: CalculateFcrDto): {
        fcr: number;
    };
    calculateAdg(dto: CalculateAdgDto): {
        adgG: number;
    };
    calculateSurvivalRate(dto: CalculateSurvivalRateDto): {
        survivalRatePercent: number;
    };
    calculateDailyFeed(dto: CalculateFeedingRateDto): {
        dailyFeedKg: number;
    };
    calculateExpectedHarvest(dto: CalculateExpectedHarvestDto): {
        expectedCount: number;
        expectedWeightKg: number;
    };
    projectGrowth(dto: GrowthProjectionDto): {
        projectedWeightG: number;
        projectedWeightByWeek: number[];
    };
    calculatePerformance(dto: CultivationPerformanceDto): {
        biomass: number;
        population: number;
        fcr: number;
        sr: number;
    };
    calculateFreeAmmonia(dto: FreeAmmoniaDto): {
        unionizedAmmonia: number;
        toxicityLevel: string;
    };
    calculateProductAmount(dto: ProductDosageDto): {
        amountKg: number;
    };
    calculateBiomass(stockCount: number, averageWeightG: number): {
        biomassKg: number;
    };
    getRecommendedFeedingRate(averageWeightG: number): {
        recommendedFeedingRatePercent: number;
    };
}
