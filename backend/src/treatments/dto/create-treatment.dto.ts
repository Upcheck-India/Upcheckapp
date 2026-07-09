import {
  IsUUID,
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
} from 'class-validator';

export class CreateTreatmentDto {
  // Client-minted idempotency key — lets offline replays be safe (insert-or-return).
  @IsUUID()
  @IsOptional()
  id?: string;

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
