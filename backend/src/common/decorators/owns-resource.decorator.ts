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
 * `capability` controls who beyond the owner may pass (see farm-capability.ts):
 *   - READ: owner, manager, worker, viewer — member-visible GETs
 *   - WRITE_OPERATIONAL (default): owner, manager, worker — field-log writes
 *   - WRITE_MANAGEMENT: owner, manager — ponds/cycles/tasks/treatments + verify
 *   - VIEW_FINANCIALS: owner, manager — costs, P&L, financial reports
 *   - MANAGE_WORKERS: owner, manager — invite/remove workers
 *   - OWNER_ONLY: owner exclusively — delete farm/pond, transfer, role changes
 */
export const OwnsResource = (
    entityType: string,
    paramName: string = 'id',
    ownerPath: string = 'userId',
    capability: FarmCapability = 'WRITE_OPERATIONAL',
) =>
    SetMetadata(OWNS_RESOURCE_KEY, { entityType, paramName, ownerPath, capability } as OwnsResourceOptions);
