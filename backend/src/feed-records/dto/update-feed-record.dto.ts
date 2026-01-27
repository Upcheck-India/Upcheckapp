import { PartialType } from '@nestjs/mapped-types';
import { CreateFeedRecordDto } from './create-feed-record.dto';

export class UpdateFeedRecordDto extends PartialType(CreateFeedRecordDto) { }
