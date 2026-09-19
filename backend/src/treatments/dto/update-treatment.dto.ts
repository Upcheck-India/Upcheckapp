import { PartialWithoutScope } from '../../common/dto/omit-scope';
import { CreateTreatmentDto } from './create-treatment.dto';

export class UpdateTreatmentDto extends PartialWithoutScope(CreateTreatmentDto) {}
