import apiClient from './client';

export interface Crop {
    id: string;
    pondId: string;
    stockingDate: string;
    totalSeed: number;
    stockingDensity?: number;
    seedType?: string;
    targetSurvivalRate?: number;
    targetSizeG?: number;
    targetFcr?: number;
    targetDays?: number;
    initialAgeDays: number;
    species: string;
    hatchery?: string;
    broodstock?: string;
    status: 'active' | 'completed' | 'failed' | 'harvested';
    closedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCropDto {
    pondId: string;
    stockingDate: string;
    totalSeed: number;
    stockingDensity?: number;
    seedType?: string;
    targetSurvivalRate?: number;
    targetSizeG?: number;
    targetFcr?: number;
    targetDays?: number;
    initialAgeDays?: number;
    species: string;
    hatchery?: string;
    broodstock?: string;
}

export interface UpdateCropDto extends Partial<Omit<CreateCropDto, 'pondId'>> {
    status?: string;
}

export const cropsApi = {
    getAll: (pondId: string) => apiClient.get<Crop[]>('/crops', { params: { pondId } }),

    getById: (id: string) => apiClient.get<Crop>(`/crops/${id}`),

    create: (data: CreateCropDto) => apiClient.post<Crop>('/crops', data),

    update: (id: string, data: UpdateCropDto) => apiClient.patch<Crop>(`/crops/${id}`, data),

    delete: (id: string) => apiClient.delete(`/crops/${id}`),

    close: (id: string) => apiClient.post(`/crops/${id}/close`),
};
