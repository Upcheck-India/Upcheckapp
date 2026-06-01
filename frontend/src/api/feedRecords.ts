import apiClient from './client';

export interface FeedRecord {
    id: string;
    pondId: string;
    cropId?: string | null;
    inventoryItemId?: string | null;
    feedType: string;
    feedBrand?: string;
    quantityKg: number;
    feedingTime?: string;
    feedingMethod?: string;
    waterTemperature?: number;
    notes?: string;
    recordedAt?: string;
}

export interface CreateFeedRecordDto {
    pondId: string;
    feedType: string;
    quantityKg: number;
    feedBrand?: string;
    feedingTime?: string;
    feedingMethod?: string;
    waterTemperature?: number;
    notes?: string;
    inventoryItemId?: string;
}

export const feedApi = {
    /** Returns the total feed quantity (kg) logged for a pond, not a record. */
    getTotalByPond: (pondId: string) => apiClient.get<number>(`/feed-records/pond/${pondId}/total`),
    getAll: (pondId?: string) => apiClient.get<FeedRecord[]>('/feed-records', { params: pondId ? { pondId } : {} }),
    getByCrop: (cropId: string) => apiClient.get<FeedRecord[]>('/feed-records', { params: { cropId } }),
    create: (data: CreateFeedRecordDto) => apiClient.post<FeedRecord>('/feed-records', data),
};
