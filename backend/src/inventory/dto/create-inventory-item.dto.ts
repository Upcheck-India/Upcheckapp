import { IsString, IsOptional, IsNumber, IsUUID, IsDateString } from 'class-validator';

export class CreateInventoryItemDto {
    @IsUUID()
    farmId: string;

    @IsString()
    name: string;

    @IsString()
    category: string;

    @IsNumber()
    @IsOptional()
    quantity?: number;

    @IsString()
    @IsOptional()
    unit?: string;

    @IsNumber()
    @IsOptional()
    unitPrice?: number;

    @IsNumber()
    @IsOptional()
    reorderLevel?: number;

    @IsString()
    @IsOptional()
    supplier?: string;

    @IsDateString()
    @IsOptional()
    expiryDate?: string;

    @IsString()
    @IsOptional()
    notes?: string;
}
