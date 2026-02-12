import { apiClient } from './apiClient';
import { Farm } from '../types/database';

export const FarmService = {
    async fetchFarms(): Promise<Farm[]> {
        try {
            return await apiClient.get('/farms');
        } catch (error) {
            console.error('Error fetching farms:', error);
            // Return empty array or throw? Previous handled error by throwing (implicit in snippet logs? no explicit throw)
            // Original: if error throw error.
            throw error;
        }
    },

    async createFarm(farmData: Partial<Farm>): Promise<Farm | null> {
        try {
            // Backend handles user_id assignment from token
            return await apiClient.post('/farms', farmData);
        } catch (error) {
            console.error('Error creating farm:', error);
            throw error;
        }
    },

    async updateFarm(id: string, updates: Partial<Farm>): Promise<Farm | null> {
        try {
            return await apiClient.patch(`/farms/${id}`, updates);
        } catch (error) {
            console.error('Error updating farm:', error);
            throw error;
        }
    },

    async deleteFarm(id: string): Promise<void> {
        try {
            await apiClient.delete(`/farms/${id}`);
        } catch (error) {
            console.error('Error deleting farm:', error);
            throw error;
        }
    }
};
