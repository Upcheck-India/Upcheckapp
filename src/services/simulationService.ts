import { SimulationScenarioType } from '../types/simulation';

const API_BASE_URL = 'http://localhost:3000'; // TODO: replace with deployed backend URL

export interface SimulationResponse {
    simulation: any;
    result: {
        baselineNetProfit: number;
        simulatedNetProfit: number;
        profitDifference: number;
        projectedBiomass: number;
        projectedFcr: number;
        totalRevenue: number;
        totalCost: number;
        riskWarning?: string;
    };
}

export const SimulationService = {
    async runSimulation(payload: {
        pondId: string;
        scenarioType: SimulationScenarioType;
        variables: {
            feedPrice?: number;
            growthImprovement?: number;
            sellingPrice?: number;
            stockingDensity?: number;
        };
    }): Promise<SimulationResponse> {
        const response = await fetch(`${API_BASE_URL}/simulations/run`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error('Failed to run simulation');
        }

        return response.json();
    },
};
