import { apiClient } from './apiClient';
import { Pond, PondDimensionHistory } from '../types/database';

export const PondService = {
    async fetchPonds(farmId: string, options?: {
        status?: string;
        search?: string;
        sort?: string;
        page?: number;
        includeArchived?: boolean;
    }): Promise<{ ponds: Pond[], total: number, page: number, hasMore: boolean }> {
        try {
            const params = new URLSearchParams();
            if (farmId) params.append('farmId', farmId);
            if (options?.status) params.append('status', options.status);
            if (options?.search) params.append('search', options.search);
            if (options?.sort) params.append('sort', options.sort);
            if (options?.page) params.append('page', options.page.toString());
            if (options?.includeArchived) params.append('includeArchived', 'true');

            return await apiClient.get(`/ponds?${params.toString()}`);
        } catch (error) {
            console.error('Error fetching ponds:', error);
            throw error;
        }
    },

    async fetchAllUserPonds(): Promise<Pond[]> {
        try {
            const result = await apiClient.get('/ponds/mine');
            return Array.isArray(result) ? result : [];
        } catch (error) {
            console.error('Error fetching all user ponds:', error);
            throw error;
        }
    },

    async fetchPondById(id: string): Promise<Pond> {
        try {
            return await apiClient.get(`/ponds/${id}`);
        } catch (error) {
            console.error('Error fetching pond by ID:', error);
            throw error;
        }
    },

    /**
     * Create a single pond or batch of ponds.
     * DTO: CreatePondDto supports batchCount and namePrefix.
     */
    async createPond(pondData: Partial<Pond> & { batchCount?: number, namePrefix?: string }): Promise<any> {
        try {
            return await apiClient.post('/ponds', pondData);
        } catch (error) {
            console.error('Error creating pond:', error);
            throw error;
        }
    },

    async updatePond(id: string, updates: Partial<Pond> & { changeReason?: string }): Promise<Pond> {
        try {
            return await apiClient.patch(`/ponds/${id}`, updates);
        } catch (error) {
            console.error('Error updating pond:', error);
            throw error;
        }
    },

    async archivePond(id: string): Promise<{ message: string }> {
        try {
            return await apiClient.patch(`/ponds/${id}/archive`);
        } catch (error) {
            console.error('Error archiving pond:', error);
            throw error;
        }
    },

    async deletePond(id: string): Promise<{ message: string }> {
        try {
            return await apiClient.delete(`/ponds/${id}`);
        } catch (error) {
            console.error('Error deleting pond:', error);
            throw error;
        }
    },

    async fetchDimensionHistory(pondId: string): Promise<PondDimensionHistory[]> {
        try {
            return await apiClient.get(`/ponds/${pondId}/dimension-history`);
        } catch (error) {
            console.error('Error fetching dimension history:', error);
            throw error;
        }
    }
};
