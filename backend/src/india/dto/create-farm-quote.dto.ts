import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class QuoteBandDto {
  /** Count per kg (pieces). */
  @IsNumber()
  @Min(1)
  @Max(1000)
  count: number;

  /** ₹/kg. */
  @IsNumber()
  @Min(1)
  @Max(100000)
  price: number;
}

/** POST /price-quotes/farm/:farmId — the "Today's quote" sheet (H5.1). */
export class CreateFarmQuoteDto {
  @IsOptional()
  @IsDateString()
  quotedOn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  buyer?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => QuoteBandDto)
  bands: QuoteBandDto[];
}
