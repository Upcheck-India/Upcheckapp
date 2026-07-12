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
    // Backend /feed-records returns a paginated PageDto (default take:10, max take:100);
    // callers that need the full history/total must pass take explicitly.
    getAll: (pondId?: string, params?: { take?: number; page?: number }) =>
        apiClient.get<FeedRecord[]>('/feed-records', { params: { ...(pondId ? { pondId } : {}), ...params } }),
    getByCrop: (cropId: string, params?: { take?: number; page?: number }) =>
        apiClient.get<FeedRecord[]>('/feed-records', { params: { cropId, ...params } }),
    create: (data: CreateFeedRecordDto) => apiClient.post<FeedRecord>('/feed-records', data),
    update: (id: string, data: Partial<CreateFeedRecordDto>) =>
        apiClient.patch<FeedRecord>(`/feed-records/${id}`, data),
};
