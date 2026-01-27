import { IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CalculateFcrDto {
    @IsNumber()
    totalFeedKg: number;

    @IsNumber()
    harvestWeightKg: number;
}

export class CalculateAdgDto {
    @IsNumber()
    initialWeightG: number;

    @IsNumber()
    finalWeightG: number;

    @IsNumber()
    daysOfCulture: number;
}

export class CalculateSurvivalRateDto {
    @IsNumber()
    initialStock: number;

    @IsNumber()
    harvestedCount: number;
}

export class CalculateFeedingRateDto {
    @IsNumber()
    biomassKg: number;

    @IsNumber()
    feedingPercentage: number;
}

export class CalculateExpectedHarvestDto {
    @IsNumber()
    stockingCount: number;

    @IsNumber()
    survivalRatePercent: number;

    @IsNumber()
    targetWeightG: number;
}

export class GrowthProjectionDto {
    @IsNumber()
    currentWeightG: number;

    @IsNumber()
    adgG: number;

    @IsNumber()
    daysToProject: number;
}
