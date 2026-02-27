import apiClient from './client';

export interface WaterQualityRecord {
    id: string;
    pondId: string;
    ph?: number;
    dissolvedOxygen?: number;
    temperature?: number;
    salinity?: number;
    ammonia?: number;
    nitrite?: number;
    nitrate?: number;
    alkalinity?: number;
    hardness?: number;
    transparency?: number;
    notes?: string;
    recordedAt?: string;
}

export interface CreateWaterQualityRecordDto {
    pondId: string;
    ph?: number;
    dissolvedOxygen?: number;
    temperature?: number;
    salinity?: number;
    ammonia?: number;
    nitrite?: number;
    nitrate?: number;
    alkalinity?: number;
    hardness?: number;
    transparency?: number;
    notes?: string;
}

export const waterQualityApi = {
    getAll: (pondId: string, params?: { page?: number; take?: number }) =>
        apiClient.get<any>('/water-quality', { params: { pondId, ...params } }),

    getLatest: (pondId: string) =>
        apiClient.get<WaterQualityRecord>(`/water-quality/pond/${pondId}/latest`),

    create: (data: CreateWaterQualityRecordDto) =>
        apiClient.post<WaterQualityRecord>('/water-quality', data),
};
