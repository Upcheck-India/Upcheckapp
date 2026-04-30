import apiClient from './client';

export interface FeedingTrayCheck {
    id: string;
    pondId: string;
    cropId?: string;
    checkDate: string;
    checkTime?: string;
    totalTrays: number;
    traysWithFeed: number;
    traysEmpty: number;
    feedConsumptionPercent?: number;
    notes?: string;
    createdAt: string;
}

export interface CreateFeedingTrayCheckDto {
    pondId: string;
    cropId?: string;
    checkDate: string;
    checkTime?: string;
    totalTrays: number;
    traysWithFeed: number;
    traysEmpty: number;
    notes?: string;
}

export const feedingTrayChecksApi = {
    getAll: (cropId?: string) =>
        apiClient.get<FeedingTrayCheck[]>('/feeding-tray-checks', { params: { cropId } }),

    getById: (id: string) =>
        apiClient.get<FeedingTrayCheck>(`/feeding-tray-checks/${id}`),

    create: (data: CreateFeedingTrayCheckDto) =>
        apiClient.post<FeedingTrayCheck>('/feeding-tray-checks', data),

    update: (id: string, data: Partial<CreateFeedingTrayCheckDto>) =>
        apiClient.patch<FeedingTrayCheck>(`/feeding-tray-checks/${id}`, data),

    delete: (id: string) =>
        apiClient.delete(`/feeding-tray-checks/${id}`),
};