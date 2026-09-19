import { IsOptional, IsString, MaxLength } from 'class-validator';
import { OmitType } from '@nestjs/mapped-types';
import { PartialWithoutScope } from '../../common/dto/omit-scope';
import { CreateTreatmentDto } from './create-treatment.dto';

export class UpdateTreatmentDto extends PartialWithoutScope(
  // Stock is drawn once, at create; an edit never re-deducts.
  OmitType(CreateTreatmentDto, ['inventoryItemId'] as const),
) {
  /** Required when an edit lowers the banned flag (D3.3, 400 REASON_REQUIRED). */
  @IsString()
  @MaxLength(500)
  @IsOptional()
  flagChangeReason?: string;
}
