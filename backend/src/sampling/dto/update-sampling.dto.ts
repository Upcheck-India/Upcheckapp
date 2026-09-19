import { PartialWithoutScope } from '../../common/dto/omit-scope';
import { CreateSamplingDto } from './create-sampling.dto';

export class UpdateSamplingDto extends PartialWithoutScope(CreateSamplingDto) {}
