import { PartialWithoutScope } from '../../common/dto/omit-scope';
import { CreatePondDto } from './create-pond.dto';

// farmId is not patchable: a pond stays on the farm it was created on (S1).
export class UpdatePondDto extends PartialWithoutScope(CreatePondDto) {
  changeReason?: string;
  activeCycleId?: string | null;
}
