import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ShrimpCalculationsService } from './shrimp-calculations.service';
import {
    CalculateFcrDto,
    CalculateAdgDto,
    CalculateSurvivalRateDto,
    CalculateFeedingRateDto,
    CalculateExpectedHarvestDto,
    GrowthProjectionDto,
} from './dto/calculation.dto';

@Controller('shrimp-calculations')
export class ShrimpCalculationsController {
    constructor(private readonly calculationsService: ShrimpCalculationsService) { }

    @Post('fcr')
    calculateFcr(@Body() dto: CalculateFcrDto) {
        return {
            fcr: this.calculationsService.calculateFcr(dto.totalFeedKg, dto.harvestWeightKg),
        };
    }

    @Post('adg')
    calculateAdg(@Body() dto: CalculateAdgDto) {
        return {
            adgG: this.calculationsService.calculateAdg(dto.initialWeightG, dto.finalWeightG, dto.daysOfCulture),
        };
    }

    @Post('survival-rate')
    calculateSurvivalRate(@Body() dto: CalculateSurvivalRateDto) {
        return {
            survivalRatePercent: this.calculationsService.calculateSurvivalRate(dto.initialStock, dto.harvestedCount),
        };
    }

    @Post('daily-feed')
    calculateDailyFeed(@Body() dto: CalculateFeedingRateDto) {
        return {
            dailyFeedKg: this.calculationsService.calculateDailyFeed(dto.biomassKg, dto.feedingPercentage),
        };
    }

    @Post('expected-harvest')
    calculateExpectedHarvest(@Body() dto: CalculateExpectedHarvestDto) {
        return this.calculationsService.calculateExpectedHarvest(
            dto.stockingCount,
            dto.survivalRatePercent,
            dto.targetWeightG,
        );
    }

    @Post('growth-projection')
    projectGrowth(@Body() dto: GrowthProjectionDto) {
        return this.calculationsService.projectGrowth(dto.currentWeightG, dto.adgG, dto.daysToProject);
    }

    @Get('biomass')
    calculateBiomass(@Query('stockCount') stockCount: number, @Query('averageWeightG') averageWeightG: number) {
        return {
            biomassKg: this.calculationsService.calculateBiomass(Number(stockCount), Number(averageWeightG)),
        };
    }

    @Get('recommended-feeding-rate')
    getRecommendedFeedingRate(@Query('averageWeightG') averageWeightG: number) {
        return {
            recommendedFeedingRatePercent: this.calculationsService.getRecommendedFeedingRate(Number(averageWeightG)),
        };
    }
}
