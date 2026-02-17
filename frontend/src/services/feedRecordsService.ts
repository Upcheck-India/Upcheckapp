import { apiClient } from './apiClient';
import { FeedRecord } from '../types/database';

export const FeedRecordsService = {
    async create(data: Partial<FeedRecord>): Promise<FeedRecord> {
        try {
            return await apiClient.post('/feed-records', data);
        } catch (error) {
            console.error('Error creating feed record:', error);
            throw error;
        }
    },

    async fetchByPond(pondId: string): Promise<FeedRecord[]> {
        try {
            return await apiClient.get(`/feed-records?pondId=${pondId}`);
        } catch (error) {
            console.error('Error fetching feed records:', error);
            throw error;
        }
    },

    async getTotalByPond(pondId: string): Promise<number> {
        try {
            return await apiClient.get(`/feed-records/pond/${pondId}/total`);
        } catch (error) {
            console.error('Error getting total feed:', error);
            throw error;
        }
    }
};
