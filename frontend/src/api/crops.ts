import apiClient from './client';

export interface Crop {
    id: string;
    pondId: string;
    farmId?: string;
    name: string;
    cropCode?: string;
    speciesType?: string;
    seedType?: string;
    totalSeed?: number;
    stockingDensity?: number;
    stockingCount?: number;
    stockingDate?: string;
    initialAgeDays?: number;
    preparationDays?: number;
    totalFeedingTrays?: number;
    hatcheryId?: string;
    speciesId?: string;
    broodstockId?: string;
    feedPriceRpPerKg?: number;
    carryingCapacityKgM2?: number;
    targetCultivationDays?: number;
    targetSize?: number;
    targetSrPercent?: number;
    srPredictionMethod?: string;
    doc?: number;
    isActive?: boolean;
    expectedHarvestDate?: string;
    actualHarvestDate?: string;
    harvestWeightKg?: number;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCropDto {
    pondId: string;
    name: string;
    cropCode?: string;
    speciesType?: string;
    seedType?: string;
    stockingDensity?: number;
    stockingCount?: number;
    stockingDate?: string;
    expectedHarvestDate?: string;
    status?: string;
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

    close: (id: string, actualHarvestDate?: string) =>
        apiClient.patch(`/crops/${id}/close`, { actualHarvestDate: actualHarvestDate || new Date().toISOString() }),
};
