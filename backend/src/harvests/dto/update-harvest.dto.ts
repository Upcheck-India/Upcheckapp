import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GradeDto, REJECTED_REASONS, RejectedReason } from './grade.dto';

/**
 * `@IsOptional` passes `null` too: an explicit null CLEARS a price / buyer /
 * deduction on edit (H1), an absent key leaves it alone.
 */
export class UpdateHarvestDto {
  @IsOptional()
  @IsDateString()
  harvestDate?: string;

  /** Replace-all: the harvest's grade lines become exactly these. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => GradeDto)
  grades?: GradeDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  rejectedKg?: number | null;

  @IsOptional()
  @IsIn(REJECTED_REASONS as unknown as string[])
  rejectedReason?: RejectedReason | null;

  @IsOptional()
  @IsBoolean()
  confirmOutOfRange?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  weightKg?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  count?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  averageSize?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salePriceTotal?: number | null;

  @IsOptional()
  @IsString()
  buyerName?: string | null;

  /**
   * Immutable after create (H2): a full harvest closed the cycle, and flipping
   * the type would leave that close behind. Old app builds still send it on
   * every edit, so the same value is accepted and ignored; a different value
   * is a 400 HARVEST_TYPE_IMMUTABLE.
   */
  @IsOptional()
  @IsIn(['partial', 'full'])
  harvestType?: 'partial' | 'full';

  @IsOptional()
  @IsIn(['pending', 'sold', 'discarded'])
  status?: 'pending' | 'sold' | 'discarded';

  @IsOptional()
  @IsString()
  notes?: string;
}
