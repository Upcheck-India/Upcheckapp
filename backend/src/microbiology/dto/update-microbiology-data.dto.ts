import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateMicrobiologyDataDto {
    @IsOptional()
    @IsDateString()
    measurementDate?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    totalBacillusCfuMl?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    totalVibrioCountTvcCfuMl?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    yellowVibrioCountTvcCfuMl?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    greenVibrioCountTvcCfuMl?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    luminescentBacteriaLbCfuMl?: number;

    @IsOptional()
    @IsString()
    note?: string;
}
