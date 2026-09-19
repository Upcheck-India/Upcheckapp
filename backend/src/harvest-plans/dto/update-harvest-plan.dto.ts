import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateHarvestPlanDto } from './create-harvest-plan.dto';

/**
 * A plan's pond and cycle are fixed at create, where they are checked against
 * each other. PATCH could rewrite both, pointing the plan at another farm's
 * crop that `completePlan` would then close.
 */
export class UpdateHarvestPlanDto extends PartialType(
  OmitType(CreateHarvestPlanDto, ['pondId', 'cropId'] as const),
) {}
