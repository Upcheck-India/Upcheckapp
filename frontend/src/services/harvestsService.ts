import { apiClient } from './apiClient';
import { Harvest } from '../types/database';

export const HarvestsService = {
    async create(data: Partial<Harvest>): Promise<Harvest> {
        try {
            return await apiClient.post('/harvests', data);
        } catch (error) {
            console.error('Error creating harvest record:', error);
            throw error;
        }
    },

    async fetchByCrop(cropId: string): Promise<Harvest[]> {
        try {
            return await apiClient.get(`/harvests?cropId=${cropId}`);
        } catch (error) {
            console.error('Error fetching harvest records:', error);
            throw error;
        }
    },

    async delete(id: string): Promise<void> {
        try {
            await apiClient.delete(`/harvests/${id}`);
        } catch (error) {
            console.error('Error deleting harvest record:', error);
            throw error;
        }
    }
};
