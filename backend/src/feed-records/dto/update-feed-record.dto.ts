import { PartialWithoutScope } from '../../common/dto/omit-scope';
import { CreateFeedRecordDto } from './create-feed-record.dto';

export class UpdateFeedRecordDto extends PartialWithoutScope(
  CreateFeedRecordDto,
) {}
