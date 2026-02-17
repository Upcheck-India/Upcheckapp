import { apiClient } from './apiClient';
import { SamplingData } from '../types/database';

export const SamplingService = {
    async create(data: Partial<SamplingData>): Promise<SamplingData> {
        try {
            return await apiClient.post('/sampling', data);
        } catch (error) {
            console.error('Error creating sampling record:', error);
            throw error;
        }
    },

    async fetchByCrop(cropId: string): Promise<SamplingData[]> {
        try {
            return await apiClient.get(`/sampling?cropId=${cropId}`);
        } catch (error) {
            console.error('Error fetching sampling records:', error);
            throw error;
        }
    },

    // Optional: fetch by pond if backend supports it
    async fetchByPond(pondId: string): Promise<SamplingData[]> {
        try {
            // currently backend only supports cropId filtering in find all, 
            // but we might want to support pondId too later.
            // For now, we only use cropId on frontend (viewing history of a cycle).
            return [];
        } catch (error) { throw error; }
    }
};
