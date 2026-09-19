import { PartialWithoutScope } from '../../common/dto/omit-scope';
import { CreateCropDto } from './create-crop.dto';

// pondId is not patchable: a cycle belongs to the pond it was stocked in (S1).
export class UpdateCropDto extends PartialWithoutScope(CreateCropDto) {}
