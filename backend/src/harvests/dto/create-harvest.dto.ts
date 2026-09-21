import {
  IsUUID,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsIn,
  Min,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GradeDto, REJECTED_REASONS, RejectedReason } from './grade.dto';

export class CreateHarvestDto {
  // Optional client-minted id for offline-queue idempotency (see feed-records/
  // sampling): a replayed create returns the existing row instead of double-
  // inserting the harvest and re-running closeCycle.
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsUUID()
  cropId: string;

  /**
   * The harvest plan this harvest completes (H4). The plan is completed in
   * the same transaction, only if it is on this crop's pond and still planned.
   */
  @IsUUID()
  @IsOptional()
  planId?: string;

  @IsDateString()
  harvestDate: string;

  /**
   * Graded lines (H1). When present the server derives weightKg /
   * salePriceTotal / averageSize / pieces from them and ignores the client's.
   * When absent the old single-total path runs, so old app builds keep working.
   */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => GradeDto)
  grades?: GradeDto[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  rejectedKg?: number | null;

  @IsIn(REJECTED_REASONS as unknown as string[])
  @IsOptional()
  rejectedReason?: RejectedReason | null;

  /** The farmer saw the out-of-band price warning and kept the value. */
  @IsBoolean()
  @IsOptional()
  confirmOutOfRange?: boolean;

  // Required on the old (ungraded) path only.
  @ValidateIf((o) => !o.grades)
  @IsNumber()
  @Min(0.01)
  weightKg: number;

  // `count` is an int column — a fractional value was a raw Postgres 500.
  @IsInt()
  @IsOptional()
  @Min(0)
  count?: number;

  /** g/piece (not count/kg — the entity comment used to say otherwise). */
  @IsNumber()
  @IsOptional()
  @Min(0)
  averageSize?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  salePriceTotal?: number | null;

  @IsString()
  @IsOptional()
  buyerName?: string | null;

  @IsIn(['partial', 'full'])
  harvestType: 'partial' | 'full';

  @IsIn(['pending', 'sold', 'discarded'])
  @IsOptional()
  status?: 'pending' | 'sold' | 'discarded';

  @IsString()
  @IsOptional()
  notes?: string;

  /** F5: buyer's weighing slip (cap 2, protected 12mo). VIEW_FINANCIALS gated. */
  @IsArray()
  @ArrayMaxSize(2)
  @IsString({ each: true })
  @IsOptional()
  photoPaths?: string[];
}
