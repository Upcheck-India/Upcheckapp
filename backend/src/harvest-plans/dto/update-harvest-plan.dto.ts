import { PartialType } from '@nestjs/mapped-types';
import { CreateHarvestPlanDto } from './create-harvest-plan.dto';

export class UpdateHarvestPlanDto extends PartialType(CreateHarvestPlanDto) { }
