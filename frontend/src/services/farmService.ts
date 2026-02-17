import { apiClient } from './apiClient';
import { Farm } from '../types/database';

export const FarmService = {
    async fetchFarms(): Promise<Farm[]> {
        try {
            return await apiClient.get('/farms');
        } catch (error) {
            console.error('Error fetching farms:', error);
            throw error;
        }
    },

    async fetchFarmById(id: string): Promise<Farm> {
        try {
            return await apiClient.get(`/farms/${id}`);
        } catch (error) {
            console.error('Error fetching farm by ID:', error);
            throw error;
        }
    },

    async createFarm(farmData: Partial<Farm>): Promise<Farm> {
        try {
            // Backend handles userId assignment from JWT token
            return await apiClient.post('/farms', farmData);
        } catch (error) {
            console.error('Error creating farm:', error);
            throw error;
        }
    },

    async updateFarm(id: string, updates: Partial<Farm>): Promise<Farm> {
        try {
            return await apiClient.patch(`/farms/${id}`, updates);
        } catch (error) {
            console.error('Error updating farm:', error);
            throw error;
        }
    },

    async deleteFarm(id: string): Promise<{ message: string }> {
        try {
            // This is soft delete on backend (deletedAt)
            return await apiClient.delete(`/farms/${id}`);
        } catch (error) {
            console.error('Error deleting farm:', error);
            throw error;
        }
    }
};
