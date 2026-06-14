import { IsString, IsOptional, IsNumber, IsDateString, IsUUID, IsInt, IsIn, Min } from 'class-validator';

export class CreateCropDto {
    @IsUUID()
    pondId: string;

    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    cropCode?: string;

    @IsString()
    @IsOptional()
    speciesType?: string;

    @IsString()
    @IsOptional()
    seedType?: string;

    @IsNumber()
    @IsOptional()
    stockingDensity?: number;

    @IsInt()
    @IsOptional()
    stockingCount?: number;

    @IsDateString()
    @IsOptional()
    stockingDate?: string;

    @IsDateString()
    @IsOptional()
    expectedHarvestDate?: string;

    @IsString()
    @IsOptional()
    status?: string;

    // ── Stocking detail + cycle targets (consumed by the decision engines /
    //    simulation: carrying capacity, target SR, feed price, target size). ──
    @IsInt()
    @IsOptional()
    @Min(0)
    totalSeed?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    feedPriceRpPerKg?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    carryingCapacityKgM2?: number;

    @IsInt()
    @IsOptional()
    @Min(1)
    targetCultivationDays?: number;

    @IsInt()
    @IsOptional()
    @Min(1)
    targetSize?: number; // pieces/kg

    @IsNumber()
    @IsOptional()
    @Min(0)
    targetSrPercent?: number;

    @IsString()
    @IsOptional()
    @IsIn(['feed_ratio', 'fixed', 'measurements', 'stp_table', 'custom_table'])
    srPredictionMethod?: string;

    @IsInt()
    @IsOptional()
    @Min(0)
    initialAgeDays?: number;

    @IsInt()
    @IsOptional()
    @Min(0)
    preparationDays?: number;

    @IsInt()
    @IsOptional()
    @Min(1)
    totalFeedingTrays?: number;

    @IsUUID()
    @IsOptional()
    hatcheryId?: string;

    @IsUUID()
    @IsOptional()
    speciesId?: string;

    @IsUUID()
    @IsOptional()
    broodstockId?: string;
}
