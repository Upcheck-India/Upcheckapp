import { PartialWithoutScope } from '../../common/dto/omit-scope';
import { CreateDiseaseRecordDto } from './create-disease.dto';

/**
 * A real class (not `Partial<…>`) so the global ValidationPipe validates and
 * whitelists the PATCH body (S2). cropId/id/createdById can't be patched.
 */
export class UpdateDiseaseRecordDto extends PartialWithoutScope(
  CreateDiseaseRecordDto,
) {}
