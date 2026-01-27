import { IsString, IsOptional, IsNumber, IsUUID } from 'class-validator';

export class CreateWaterQualityRecordDto {
    @IsUUID()
    pondId: string;

    @IsNumber()
    @IsOptional()
    ph?: number;

    @IsNumber()
    @IsOptional()
    temperature?: number;

    @IsNumber()
    @IsOptional()
    dissolvedOxygen?: number;

    @IsNumber()
    @IsOptional()
    salinity?: number;

    @IsNumber()
    @IsOptional()
    ammonia?: number;

    @IsNumber()
    @IsOptional()
    nitrite?: number;

    @IsNumber()
    @IsOptional()
    nitrate?: number;

    @IsNumber()
    @IsOptional()
    alkalinity?: number;

    @IsNumber()
    @IsOptional()
    hardness?: number;

    @IsNumber()
    @IsOptional()
    transparency?: number;

    @IsString()
    @IsOptional()
    notes?: string;
}
