import { IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateMortalityRecordDto {
    @IsOptional()
    @IsDateString()
    recordDate?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    quantity?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    estimatedWeightKg?: number;

    @IsOptional()
    @IsString()
    note?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    images?: string[];
}
