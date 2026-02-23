import { PartialType } from '@nestjs/mapped-types';
import { CreateSamplingDto } from './create-sampling.dto';

export class UpdateSamplingDto extends PartialType(CreateSamplingDto) {}
