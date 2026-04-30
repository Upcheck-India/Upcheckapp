import apiClient from './client';

export interface Profile {
    id: string;
    userId: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatarUrl?: string;
    preferences?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export interface UpdateProfileDto {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatarUrl?: string;
    preferences?: Record<string, any>;
}

export const profilesApi = {
    getMine: () =>
        apiClient.get<Profile>('/profiles/me'),

    update: (userId: string, data: UpdateProfileDto) =>
        apiClient.patch<Profile>(`/profiles/${userId}`, data),
};