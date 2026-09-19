import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';

/**
 * `farmId` and `scope` are deliberately not patchable: moving a task between
 * farms or flipping a personal note into a farm-wide one would change who can
 * see it, which is a create decision, not an edit.
 *
 * `pondId`/`cropId` neither (S1): update() never checked them against the
 * task's farm, so a PATCH could link a task to another farm's pond or crop.
 */
export class UpdateTaskDto extends PartialType(
  OmitType(CreateTaskDto, ['farmId', 'scope', 'pondId', 'cropId'] as const),
) {}
