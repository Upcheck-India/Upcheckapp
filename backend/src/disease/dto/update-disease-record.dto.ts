import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PartialWithoutScope } from '../../common/dto/omit-scope';
import { CreateDiseaseRecordDto } from './create-disease.dto';

/**
 * A real class (not `Partial<…>`) so the global ValidationPipe validates and
 * whitelists the PATCH body (S2). cropId/id/createdById can't be patched.
 */
export class UpdateDiseaseRecordDto extends PartialWithoutScope(
  CreateDiseaseRecordDto,
) {
  /** Required when an edit lowers the banned flag (D3.3, 400 REASON_REQUIRED). */
  @IsString()
  @MaxLength(500)
  @IsOptional()
  flagChangeReason?: string;
}
