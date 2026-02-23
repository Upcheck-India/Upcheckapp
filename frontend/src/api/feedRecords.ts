import apiClient from './client';

export interface FeedRecord {
    id: string;
    pondId: string;
    recordedAt: string;
    totalAmountKg: number;
    feedType?: string;
    feedingMethod?: string;
    wasFasting: boolean;
    notes?: string;
}

export interface CreateFeedRecordDto {
    pondId: string;
    recordedAt: string;
    totalAmountKg: number;
    feedType?: string;
    feedingMethod?: string;
    wasFasting?: boolean;
    notes?: string;
}

export const feedApi = {
    getLatest: (pondId: string) => apiClient.get<FeedRecord>(`/feed-records/pond/${pondId}/latest`),
    getAll: () => apiClient.get<FeedRecord[]>('/feed-records'),
    create: (data: CreateFeedRecordDto) => apiClient.post<FeedRecord>('/feed-records', data),
};
