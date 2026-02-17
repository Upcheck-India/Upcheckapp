import { apiClient } from './apiClient';
import { Crop } from '../types/database';

export const CropsService = {
    async fetchCropsByPond(pondId: string): Promise<Crop[]> {
        try {
            return await apiClient.get(`/crops?pondId=${pondId}`);
        } catch (error) {
            console.error('Error fetching crops:', error);
            throw error;
        }
    },

    async fetchActiveCrop(pondId: string): Promise<Crop | undefined> {
        try {
            const crops = await this.fetchCropsByPond(pondId);
            return crops.find(c => c.status === 'active');
        } catch (error) {
            console.error('Error fetching active crop:', error);
            return undefined;
        }
    },

    async createCrop(data: Partial<Crop>): Promise<Crop> {
        try {
            return await apiClient.post('/crops', data);
        } catch (error) {
            console.error('Error creating crop:', error);
            throw error;
        }
    },

    async harvestCrop(id: string, data: { actualHarvestDate: Date; harvestWeightKg: number }): Promise<Crop> {
        try {
            return await apiClient.post(`/crops/${id}/harvest`, data);
        } catch (error) {
            console.error('Error harvesting crop:', error);
            throw error;
        }
    }
};
