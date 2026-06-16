import { FarmRole } from './farm-member.entity';

/**
 * Capability classes used to authorize farm-scoped actions. The OwnershipGuard
 * and the member-aware service methods both consult the same map, so the
 * four-role policy (blueprint §28) lives in exactly one place.
 *
 *  - READ              : any member may view (owner, manager, worker, viewer)
 *  - WRITE_OPERATIONAL : record field/operational logs (owner, manager, worker)
 *  - WRITE_MANAGEMENT  : ponds/cycles/tasks/treatments lifecycle + verify
 *                        (owner, manager)
 *  - VIEW_FINANCIALS   : costs, transactions, P&L, financial reports
 *                        (owner, manager — viewer only if the owner grants it,
 *                        handled separately per-farm)
 *  - MANAGE_WORKERS    : invite/remove/assign the worker role (owner, manager)
 *  - OWNER_ONLY        : farm/pond delete, ownership transfer, role changes,
 *                        inviting manager/viewer (owner exclusively)
 */
export type FarmCapability =
    | 'READ'
    | 'WRITE_OPERATIONAL'
    | 'WRITE_MANAGEMENT'
    | 'VIEW_FINANCIALS'
    | 'MANAGE_WORKERS'
    | 'OWNER_ONLY';

export const CAPABILITY_ROLES: Record<FarmCapability, FarmRole[]> = {
    READ: ['owner', 'manager', 'worker', 'viewer'],
    WRITE_OPERATIONAL: ['owner', 'manager', 'worker'],
    WRITE_MANAGEMENT: ['owner', 'manager'],
    VIEW_FINANCIALS: ['owner', 'manager'],
    MANAGE_WORKERS: ['owner', 'manager'],
    OWNER_ONLY: ['owner'],
};

export function roleSatisfies(role: FarmRole | null, capability: FarmCapability): boolean {
    if (!role) return false;
    return CAPABILITY_ROLES[capability].includes(role);
}

/** Authority ranking; higher = more privileged. Used for member management. */
export const ROLE_RANK: Record<FarmRole, number> = {
    viewer: 0,
    worker: 1,
    manager: 2,
    owner: 3,
};

/**
 * May `actor` invite/assign a member to `target` role? (blueprint §13.3, §28.5)
 *   - owner   → manager, worker, viewer
 *   - manager → worker only
 * Ownership is transferred via a dedicated flow, never assigned here.
 */
export function canAssignRole(actor: FarmRole | null, target: FarmRole): boolean {
    if (target === 'owner') return false; // ownership transfer is a separate flow
    if (actor === 'owner') return true;
    if (actor === 'manager') return target === 'worker';
    return false;
}

/**
 * May `actor` remove/modify an existing member currently holding `target` role?
 * Owner manages anyone below owner; manager manages workers only.
 */
export function canManageMember(actor: FarmRole | null, target: FarmRole): boolean {
    if (!actor) return false;
    if (target === 'owner') return false; // the owner row is managed via transfer
    if (actor === 'owner') return true;
    if (actor === 'manager') return target === 'worker';
    return false;
}
