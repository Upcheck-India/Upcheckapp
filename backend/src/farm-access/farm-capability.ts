import { FarmRole } from './farm-member.entity';

/**
 * Capability classes used to authorize farm-scoped actions. The OwnershipGuard
 * and the member-aware service methods both consult the same map, so the
 * owner/worker policy lives in exactly one place.
 *
 *  - READ               : any member may view (owner or worker)
 *  - WRITE_OPERATIONAL  : owner or worker may write field/operational logs
 *  - OWNER_ONLY         : owner exclusively (economics + farm/pond lifecycle)
 */
export type FarmCapability = 'READ' | 'WRITE_OPERATIONAL' | 'OWNER_ONLY';

export const CAPABILITY_ROLES: Record<FarmCapability, FarmRole[]> = {
    READ: ['owner', 'worker'],
    WRITE_OPERATIONAL: ['owner', 'worker'],
    OWNER_ONLY: ['owner'],
};

export function roleSatisfies(role: FarmRole | null, capability: FarmCapability): boolean {
    if (!role) return false;
    return CAPABILITY_ROLES[capability].includes(role);
}
