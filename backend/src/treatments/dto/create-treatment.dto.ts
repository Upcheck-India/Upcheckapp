import { IsUUID, IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateTreatmentDto {
    @IsUUID()
    cropId: string;

    @IsDateString()
    treatmentDate: string;

    @IsString()
    @IsOptional()
    basedOn?: string; // 'written_notes' | 'product_usage'

    @IsString()
    description: string;

    @IsUUID()
    @IsOptional()
    productId?: string;

    @IsNumber()
    @IsOptional()
    dosageKg?: number;

    @IsString()
    @IsOptional()
    notes?: string;
}
