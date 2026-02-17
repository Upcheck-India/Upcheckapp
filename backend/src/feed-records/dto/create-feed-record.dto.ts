import { IsString, IsOptional, IsNumber, IsUUID } from 'class-validator';

export class CreateFeedRecordDto {
    @IsUUID()
    pondId: string;

    @IsString()
    feedType: string;

    @IsString()
    @IsOptional()
    feedBrand?: string;

    @IsNumber()
    quantityKg: number;

    @IsString()
    @IsOptional()
    feedingTime?: string;

    @IsString()
    @IsOptional()
    feedingMethod?: string;

    @IsNumber()
    @IsOptional()
    waterTemperature?: number;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsUUID()
    @IsOptional()
    inventoryItemId?: string;
}
