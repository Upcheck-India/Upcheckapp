import { IsUUID, IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateHarvestDto {
    @IsUUID()
    cropId: string;

    @IsDateString()
    harvestDate: string;

    @IsString()
    @IsOptional()
    harvestType?: string; // 'partial' | 'final' | 'emergency'

    @IsNumber()
    totalWeightKg: number;

    @IsNumber()
    @IsOptional()
    countPerKg?: number;

    @IsNumber()
    @IsOptional()
    pricePerKgRp?: number;

    @IsString()
    @IsOptional()
    buyerName?: string;

    @IsString()
    @IsOptional()
    notes?: string;
}
