import apiClient from './client';

export interface HarvestPlan {
    id: string;
    pondId: string;
    cropId?: string;
    plannedDate: string;
    estimatedWeightKg?: number;
    estimatedSizeG?: number;
    status: string;
    notes?: string;
    createdAt: string;
}

export interface CreateHarvestPlanDto {
    pondId: string;
    cropId?: string;
    plannedDate: string;
    estimatedWeightKg?: number;
    estimatedSizeG?: number;
    notes?: string;
}

export const harvestPlansApi = {
    getAll: (pondId?: string) =>
        apiClient.get<HarvestPlan[]>('/harvest-plans', { params: { pondId } }),

    getById: (id: string) =>
        apiClient.get<HarvestPlan>(`/harvest-plans/${id}`),

    create: (data: CreateHarvestPlanDto) =>
        apiClient.post<HarvestPlan>('/harvest-plans', data),

    update: (id: string, data: Partial<CreateHarvestPlanDto>) =>
        apiClient.patch<HarvestPlan>(`/harvest-plans/${id}`, data),

    complete: (id: string, payload: {
        actualHarvestDate: Date;
        actualWeightKg: number;
        actualPricePerKg: number;
        farmId: string;
        cropId?: string;
    }) =>
        apiClient.patch<HarvestPlan>(`/harvest-plans/${id}/complete`, payload),

    getSummary: (pondId: string, farmId: string) =>
        apiClient.get(`/harvest-plans/pond/${pondId}/summary`, { params: { farmId } }),

    delete: (id: string) =>
        apiClient.delete(`/harvest-plans/${id}`),
};