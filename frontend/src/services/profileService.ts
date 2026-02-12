import { apiClient } from './apiClient';
import { Profile } from '../types/database';

export const ProfileService = {
    async getProfile(userId: string): Promise<Profile | null> {
        try {
            return await apiClient.get(`/profiles/${userId}`);
        } catch (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
    },

    async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
        try {
            return await apiClient.patch(`/profiles/${userId}`, updates);
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    },
};
