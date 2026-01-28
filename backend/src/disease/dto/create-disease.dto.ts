import { IsArray, IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDiseaseDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    scientificName?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    commonNames?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    symptoms?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    preventionMeasures?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    treatmentRecommendations?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    imageUrls?: string[];

    @IsOptional()
    @IsString()
    severityLevel?: string;
}

export class CreateDiseaseRecordDto {
    @IsUUID()
    cropId: string;

    @IsUUID()
    diseaseId: string;

    @IsDateString()
    recordedDate: string;

    @IsOptional()
    @IsString()
    severityAtDetection?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    photoUrls?: string[];

    @IsOptional()
    @IsString()
    notes?: string;
}
