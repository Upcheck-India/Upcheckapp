import { PartialWithoutScope } from '../../common/dto/omit-scope';
import { CreateWaterQualityRecordDto } from './create-water-quality-record.dto';

export class UpdateWaterQualityRecordDto extends PartialWithoutScope(
  CreateWaterQualityRecordDto,
) {}
