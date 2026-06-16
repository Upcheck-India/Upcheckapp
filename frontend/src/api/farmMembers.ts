import apiClient from './client';

// Mirrors backend FarmRole (backend/src/farm-access/farm-member.entity.ts).
export type FarmRole = 'owner' | 'manager' | 'worker' | 'viewer';

/** Roles a member can be invited/added as (ownership is transferred separately). */
export type AssignableRole = Exclude<FarmRole, 'owner'>;

export interface PublicUser {
    id: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    avatarUrl: string | null;
}

export interface FarmMember {
    id: string;
    farmId: string;
    userId: string;
    role: FarmRole;
    createdAt: string;
    user: PublicUser | null;
}

export interface MyMembership {
    farmId: string;
    role: FarmRole;
    farm: { id: string; name: string; farmCode?: string } | null;
}

/** Prefix that wraps a user id inside their profile QR, to reject unrelated codes. */
export const WORKER_QR_PREFIX = 'upcheck-worker:';

export const farmMembersApi = {
    lookupUser: (params: { userId?: string; phone?: string; email?: string }) =>
        apiClient.get<PublicUser>('/farm-members/users/lookup', { params }),

    listMine: () => apiClient.get<MyMembership[]>('/farm-members/mine'),

    listMembers: (farmId: string) =>
        apiClient.get<FarmMember[]>(`/farms/${farmId}/members`),

    addMember: (farmId: string, userId: string, role?: AssignableRole) =>
        apiClient.post<FarmMember>(`/farms/${farmId}/members`, role ? { userId, role } : { userId }),

    removeMember: (farmId: string, userId: string) =>
        apiClient.delete(`/farms/${farmId}/members/${userId}`),

    changeRole: (farmId: string, userId: string, role: AssignableRole) =>
        apiClient.patch<FarmMember>(`/farms/${farmId}/members/${userId}`, { role }),

    transferOwnership: (farmId: string, newOwnerUserId: string) =>
        apiClient.post(`/farms/${farmId}/transfer-ownership`, { newOwnerUserId }),
};
