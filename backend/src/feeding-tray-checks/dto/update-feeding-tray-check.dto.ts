import { PartialType } from '@nestjs/mapped-types';
import { CreateFeedingTrayCheckDto } from './create-feeding-tray-check.dto';

export class UpdateFeedingTrayCheckDto extends PartialType(
  CreateFeedingTrayCheckDto,
) {}
