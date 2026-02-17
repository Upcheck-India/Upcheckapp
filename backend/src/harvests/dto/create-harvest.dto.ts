import { IsUUID, IsDateString, IsNumber, IsOptional, IsString, IsEnum } from 'class-validator';

export class CreateHarvestDto {
    @IsUUID()
    cropId: string;

    @IsDateString()
    harvestDate: string;

    @IsNumber()
    weightKg: number;

    @IsNumber()
    @IsOptional()
    count?: number;

    @IsNumber()
    @IsOptional()
    averageSize?: number;

    @IsNumber()
    @IsOptional()
    salePriceTotal?: number;

    @IsString()
    @IsOptional()
    buyerName?: string;

    @IsEnum(['partial', 'full'])
    harvestType: 'partial' | 'full';

    @IsEnum(['pending', 'sold', 'discarded'])
    @IsOptional()
    status?: 'pending' | 'sold' | 'discarded';

    @IsString()
    @IsOptional()
    notes?: string;
}
