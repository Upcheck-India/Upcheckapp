import {
  IsUUID,
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsIn,
  IsArray,
  ArrayMaxSize,
  MaxLength,
  Min,
} from 'class-validator';
import {
  DOSE_UNITS,
  INGREDIENT_CATEGORIES,
  TREATMENT_REASONS,
} from '../ingredients.data';

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

  /**
   * Free text. Old clients always send it; the structured form (D2) sends the
   * "other ingredient" text here and may leave it empty.
   */
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsNumber()
  @IsOptional()
  dosageKg?: number;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;

  // ── Structured treatment (D2) ──
  @IsIn(INGREDIENT_CATEGORIES)
  @IsOptional()
  category?: string;

  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  @IsOptional()
  ingredientKeys?: string[];

  @IsString()
  @MaxLength(200)
  @IsOptional()
  productName?: string;

  @IsIn(TREATMENT_REASONS)
  @IsOptional()
  reason?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  doseValue?: number;

  @IsIn(DOSE_UNITS)
  @IsOptional()
  doseUnit?: string;

  @IsUUID()
  @IsOptional()
  diseaseRecordId?: string;

  /**
   * "Use from stock": the inventory item this dose came out of. Create only:
   * the server deducts `doseValue` (in the item's own unit — the app offers
   * stock only when the units match) and links the movement to this
   * treatment. Not stored on the treatment row.
   */
  @IsUUID()
  @IsOptional()
  inventoryItemId?: string;
}
