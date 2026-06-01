import apiClient from './client';

export type SimulationScenarioType = 'feed_change' | 'price_change' | 'stocking_density';

export interface SimulationVariables {
    feedPrice?: number;
    growthImprovement?: number;
    sellingPrice?: number;
    stockingDensity?: number;
}

export interface RunSimulationRequest {
    pondId: string;
    scenarioType: SimulationScenarioType;
    variables: SimulationVariables;
}

export interface SimulationResultData {
    baselineNetProfit: number;
    simulatedNetProfit: number;
    profitDifference: number;
    projectedBiomass: number;
    projectedFcr: number;
    totalRevenue: number;
    totalCost: number;
    riskWarning?: string;
}

export interface SavedSimulation {
    id: string;
    userId: string;
    pondId: string;
    scenarioType: string;
    inputFeedPrice?: number;
    inputGrowthRate?: number;
    inputSellingPrice?: number;
    inputStockingDensity?: number;
    resultProjectedBiomass?: number;
    resultProjectedFcr?: number;
    resultTotalRevenue?: number;
    resultTotalCost?: number;
    resultNetProfit?: number;
    resultProfitDiff?: number;
    createdAt: string;
}

export interface RunSimulationResponse {
    simulation: SavedSimulation;
    result: SimulationResultData;
}

// Keep backward-compatible alias for screens that reference SimulationResult
export type SimulationResult = SavedSimulation;

export const simulationsApi = {
    run: (data: RunSimulationRequest) => apiClient.post<RunSimulationResponse>('/simulations/run', data),
    create: (data: RunSimulationRequest) => apiClient.post<RunSimulationResponse>('/simulations/run', data),
    getAll: () => apiClient.get<SavedSimulation[]>('/simulations'),
    getById: (id: string) => apiClient.get<SavedSimulation>(`/simulations/${id}`),
    delete: (id: string) => apiClient.delete(`/simulations/${id}`),
};
