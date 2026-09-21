import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PartialWithoutScope } from '../../common/dto/omit-scope';
import { CreatePondDto } from './create-pond.dto';

// farmId is not patchable: a pond stays on the farm it was created on (S1).
export class UpdatePondDto extends PartialWithoutScope(CreatePondDto) {
  changeReason?: string;
  activeCycleId?: string | null;

  /** F5 identity photo (cap 1, replaces). `null` clears it; omit to leave unchanged. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  photoPath?: string | null;
}
