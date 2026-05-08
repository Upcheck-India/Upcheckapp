import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateHarvestDto {
    @IsOptional()
    @IsDateString()
    harvestDate?: string;

    @IsOptional()
    @IsNumber()
    weightKg?: number;

    @IsOptional()
    @IsInt()
    count?: number;

    @IsOptional()
    @IsNumber()
    averageSize?: number;

    @IsOptional()
    @IsNumber()
    salePriceTotal?: number;

    @IsOptional()
    @IsString()
    buyerName?: string;

    @IsOptional()
    @IsEnum(['partial', 'full'])
    harvestType?: 'partial' | 'full';

    @IsOptional()
    @IsEnum(['pending', 'sold', 'discarded'])
    status?: 'pending' | 'sold' | 'discarded';

    @IsOptional()
    @IsString()
    notes?: string;
}
