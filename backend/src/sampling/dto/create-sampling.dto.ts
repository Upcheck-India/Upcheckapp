import { IsUUID, IsString, IsOptional, IsNumber, IsDateString, IsArray } from 'class-validator';

export class CreateSamplingDto {
    @IsUUID()
    pondId: string;

    @IsUUID()
    @IsOptional()
    cropId?: string;

    @IsDateString()
    samplingDate: string;

    @IsNumber()
    @IsOptional()
    mbwG?: number;

    @IsNumber()
    @IsOptional()
    totalSamples?: number;

    @IsNumber()
    @IsOptional()
    stdDeviation?: number;

    @IsNumber()
    @IsOptional()
    biomassEstimationKg?: number;

    @IsNumber()
    @IsOptional()
    srEstimationPercent?: number;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsArray()
    @IsOptional()
    photoUrls?: string[];
}
