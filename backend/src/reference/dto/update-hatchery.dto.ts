import { PartialType } from '@nestjs/mapped-types';
import { CreateHatcheryDto } from './create-hatchery.dto';

export class UpdateHatcheryDto extends PartialType(CreateHatcheryDto) {}
