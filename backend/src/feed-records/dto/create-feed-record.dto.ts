import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

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
  @Min(0) // feed cannot be negative; 0 is valid (fasting day)
  quantityKg: number;

  @IsString()
  @IsOptional()
  feedingTime?: string;

  @IsString()
  @IsOptional()
  feedingMethod?: string;

  @IsNumber()
  @IsOptional()
  @Min(0) // water temperature 0–50 °C (physical range)
  @Max(50)
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
