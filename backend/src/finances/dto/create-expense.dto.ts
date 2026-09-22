import { PHOTO_SURFACES } from '../../storage/photo-surfaces';
import {
  IsUUID,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
  ArrayMaxSize,
  Min,
} from 'class-validator';
import { ExpenseCategory } from '../expense.entity';

export class CreateExpenseDto {
  @IsUUID()
  pondId: string;

  @IsUUID()
  @IsOptional()
  cropId?: string;

  @IsDateString()
  date: string;

  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsOptional()
  description?: string;

  /** F5: receipt / bill (cap 3). Financial data — VIEW_FINANCIALS gated. */
  @IsArray()
  @ArrayMaxSize(PHOTO_SURFACES.expense_receipt.cap)
  @IsString({ each: true })
  @IsOptional()
  photoPaths?: string[];
}
