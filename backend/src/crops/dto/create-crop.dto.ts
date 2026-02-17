import { IsString, IsOptional, IsNumber, IsDateString, IsUUID, IsInt } from 'class-validator';

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
}
