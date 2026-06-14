import apiClient from './client';

export type FarmRole = 'owner' | 'worker';

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

    addMember: (farmId: string, userId: string) =>
        apiClient.post<FarmMember>(`/farms/${farmId}/members`, { userId }),

    removeMember: (farmId: string, userId: string) =>
        apiClient.delete(`/farms/${farmId}/members/${userId}`),
};
