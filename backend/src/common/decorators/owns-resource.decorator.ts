import { SetMetadata } from '@nestjs/common';
import { FarmCapability } from '../../farm-access/farm-capability';

export const OWNS_RESOURCE_KEY = 'ownsResource';

export interface OwnsResourceOptions {
    entityType: string;
    paramName: string;
    ownerPath: string;
    capability: FarmCapability;
}

/**
 * Authorize a farm-scoped route. `ownerPath` resolves (via relations) to the
 * farm owner's user id (e.g. 'farm.userId' or 'pond.farm.userId'). The optional
 * `capability` controls who beyond the owner may pass:
 *   - WRITE_OPERATIONAL (default): owner or worker — used for field-log writes
 *   - READ: owner or worker — used for member-visible GETs
 *   - OWNER_ONLY: owner exclusively — economics + farm/pond lifecycle
 */
export const OwnsResource = (
    entityType: string,
    paramName: string = 'id',
    ownerPath: string = 'userId',
    capability: FarmCapability = 'WRITE_OPERATIONAL',
) =>
    SetMetadata(OWNS_RESOURCE_KEY, { entityType, paramName, ownerPath, capability } as OwnsResourceOptions);
