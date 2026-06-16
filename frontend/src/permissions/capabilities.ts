import type { FarmRole } from '../api/farmMembers';

/**
 * Frontend mirror of the backend capability matrix
 * (backend/src/farm-access/farm-capability.ts). Keep the two in sync — the
 * backend is the source of truth and the real enforcer; this drives UI
 * visibility only (hide, never merely disable). Never rely on these checks for
 * security: the user could call the API directly, where guards + RLS apply.
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

export function roleCan(role: FarmRole | null, capability: FarmCapability): boolean {
    if (!role) return false;
    return CAPABILITY_ROLES[capability].includes(role);
}

export const ROLE_RANK: Record<FarmRole, number> = {
    viewer: 0,
    worker: 1,
    manager: 2,
    owner: 3,
};

/** owner → manager/worker/viewer, manager → worker only. */
export function canAssignRole(actor: FarmRole | null, target: FarmRole): boolean {
    if (target === 'owner') return false;
    if (actor === 'owner') return true;
    if (actor === 'manager') return target === 'worker';
    return false;
}

/** owner manages any non-owner; manager manages workers only. */
export function canManageMember(actor: FarmRole | null, target: FarmRole): boolean {
    if (!actor) return false;
    if (target === 'owner') return false;
    if (actor === 'owner') return true;
    if (actor === 'manager') return target === 'worker';
    return false;
}

/** Human-readable role label (English fallback; localize via i18n where shown). */
export const ROLE_LABEL: Record<FarmRole, string> = {
    owner: 'Owner',
    manager: 'Manager',
    worker: 'Worker',
    viewer: 'Viewer',
};
