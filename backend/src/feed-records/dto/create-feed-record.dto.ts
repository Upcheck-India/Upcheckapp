import { IsString, IsOptional, IsNumber, IsUUID, IsBoolean } from 'class-validator';

export class CreateFeedRecordDto {
    // Client-minted idempotency key — lets offline replays be safe (insert-or-return).
    @IsUUID()
    @IsOptional()
    id?: string;

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

    @IsBoolean()
    @IsOptional()
    isFasting?: boolean;
}
