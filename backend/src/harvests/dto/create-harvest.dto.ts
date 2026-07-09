import {
  IsUUID,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsIn,
  Min,
} from 'class-validator';

export class CreateHarvestDto {
  // Optional client-minted id for offline-queue idempotency (see feed-records/
  // sampling): a replayed create returns the existing row instead of double-
  // inserting the harvest and re-running closeCycle.
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsUUID()
  cropId: string;

  @IsDateString()
  harvestDate: string;

  @IsNumber()
  @Min(0.01)
  weightKg: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  count?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  averageSize?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  salePriceTotal?: number;

  @IsString()
  @IsOptional()
  buyerName?: string;

  @IsIn(['partial', 'full'])
  harvestType: 'partial' | 'full';

  @IsIn(['pending', 'sold', 'discarded'])
  @IsOptional()
  status?: 'pending' | 'sold' | 'discarded';

  @IsString()
  @IsOptional()
  notes?: string;
}
