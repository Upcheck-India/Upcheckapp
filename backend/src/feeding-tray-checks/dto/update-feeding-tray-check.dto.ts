import { PartialWithoutScope } from '../../common/dto/omit-scope';
import { CreateFeedingTrayCheckDto } from './create-feeding-tray-check.dto';

export class UpdateFeedingTrayCheckDto extends PartialWithoutScope(
  CreateFeedingTrayCheckDto,
) {}
