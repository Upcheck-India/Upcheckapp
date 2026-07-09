import {
  roleSatisfies,
  canAssignRole,
  canManageMember,
  CAPABILITY_ROLES,
  ROLE_RANK,
} from './farm-capability';
import { FarmRole } from './farm-member.entity';

describe('farm-capability matrix (4 roles)', () => {
  const ALL: FarmRole[] = ['owner', 'manager', 'worker', 'viewer'];

  it('READ: every member role can read', () => {
    ALL.forEach((r) => expect(roleSatisfies(r, 'READ')).toBe(true));
    expect(roleSatisfies(null, 'READ')).toBe(false);
  });

  it('WRITE_OPERATIONAL: owner/manager/worker yes, viewer no', () => {
    expect(roleSatisfies('owner', 'WRITE_OPERATIONAL')).toBe(true);
    expect(roleSatisfies('manager', 'WRITE_OPERATIONAL')).toBe(true);
    expect(roleSatisfies('worker', 'WRITE_OPERATIONAL')).toBe(true);
    expect(roleSatisfies('viewer', 'WRITE_OPERATIONAL')).toBe(false);
  });

  it('WRITE_MANAGEMENT / VIEW_FINANCIALS / MANAGE_WORKERS: owner+manager only', () => {
    (
      ['WRITE_MANAGEMENT', 'VIEW_FINANCIALS', 'MANAGE_WORKERS'] as const
    ).forEach((cap) => {
      expect(roleSatisfies('owner', cap)).toBe(true);
      expect(roleSatisfies('manager', cap)).toBe(true);
      expect(roleSatisfies('worker', cap)).toBe(false);
      expect(roleSatisfies('viewer', cap)).toBe(false);
    });
  });

  it('OWNER_ONLY: owner only', () => {
    expect(roleSatisfies('owner', 'OWNER_ONLY')).toBe(true);
    (['manager', 'worker', 'viewer'] as FarmRole[]).forEach((r) =>
      expect(roleSatisfies(r, 'OWNER_ONLY')).toBe(false),
    );
  });

  it('preserves the pre-existing owner/worker behaviour (no regression)', () => {
    // The two roles that existed before the extension keep exactly their old access.
    expect(roleSatisfies('owner', 'READ')).toBe(true);
    expect(roleSatisfies('owner', 'WRITE_OPERATIONAL')).toBe(true);
    expect(roleSatisfies('owner', 'OWNER_ONLY')).toBe(true);
    expect(roleSatisfies('worker', 'READ')).toBe(true);
    expect(roleSatisfies('worker', 'WRITE_OPERATIONAL')).toBe(true);
    expect(roleSatisfies('worker', 'OWNER_ONLY')).toBe(false);
  });

  it('every capability lists at least the owner', () => {
    Object.values(CAPABILITY_ROLES).forEach((roles) =>
      expect(roles).toContain('owner'),
    );
  });

  describe('canAssignRole', () => {
    it('owner can assign manager/worker/viewer but never owner', () => {
      expect(canAssignRole('owner', 'manager')).toBe(true);
      expect(canAssignRole('owner', 'worker')).toBe(true);
      expect(canAssignRole('owner', 'viewer')).toBe(true);
      expect(canAssignRole('owner', 'owner')).toBe(false);
    });
    it('manager can assign worker only', () => {
      expect(canAssignRole('manager', 'worker')).toBe(true);
      expect(canAssignRole('manager', 'manager')).toBe(false);
      expect(canAssignRole('manager', 'viewer')).toBe(false);
    });
    it('worker/viewer/null cannot assign anyone', () => {
      (['worker', 'viewer', null] as (FarmRole | null)[]).forEach((r) =>
        expect(canAssignRole(r, 'worker')).toBe(false),
      );
    });
  });

  describe('canManageMember', () => {
    it('owner manages manager/worker/viewer, not other owners', () => {
      expect(canManageMember('owner', 'manager')).toBe(true);
      expect(canManageMember('owner', 'worker')).toBe(true);
      expect(canManageMember('owner', 'viewer')).toBe(true);
      expect(canManageMember('owner', 'owner')).toBe(false);
    });
    it('manager manages workers only', () => {
      expect(canManageMember('manager', 'worker')).toBe(true);
      expect(canManageMember('manager', 'manager')).toBe(false);
      expect(canManageMember('manager', 'viewer')).toBe(false);
    });
  });

  it('role ranks are strictly ordered owner>manager>worker>viewer', () => {
    expect(ROLE_RANK.owner).toBeGreaterThan(ROLE_RANK.manager);
    expect(ROLE_RANK.manager).toBeGreaterThan(ROLE_RANK.worker);
    expect(ROLE_RANK.worker).toBeGreaterThan(ROLE_RANK.viewer);
  });
});
