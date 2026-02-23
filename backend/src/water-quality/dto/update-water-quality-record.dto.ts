import { PartialType } from '@nestjs/mapped-types';
import { CreateWaterQualityRecordDto } from './create-water-quality-record.dto';

export class UpdateWaterQualityRecordDto extends PartialType(CreateWaterQualityRecordDto) {}
