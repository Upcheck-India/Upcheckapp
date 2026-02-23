import apiClient from './client';

export interface SimulationRequest {
    targetBiomassKg: number;
    expectedSurvivalRate: number;
    expectedAdg: number;
    initialAbw: number;
    targetAbw: number;
    stockingDensity: number;
    farmAreaM2: number;
}

export interface SimulationResult {
    id: string;
    createdAt: string;
    targetBiomassKg: number;
    expectedSurvivalRate: number;
    expectedAdg: number;
    initialAbw: number;
    targetAbw: number;
    stockingDensity: number;
    farmAreaM2: number;

    // Results
    cultureDurationDays: number;
    totalSeedRequired: number;
    estimatedTotalFeedKg: number;
    estimatedFcr: number;
}

export const simulationsApi = {
    create: (data: SimulationRequest) => apiClient.post<SimulationResult>('/simulations', data),
    getAll: () => apiClient.get<SimulationResult[]>('/simulations'),
    getById: (id: string) => apiClient.get<SimulationResult>(`/simulations/${id}`),
};
