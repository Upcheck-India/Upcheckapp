import { HarvestCycleSummary, HarvestPlan } from '../types/harvest';

const API_BASE_URL = 'https://upcheckapp-c612.onrender.com/api';

export const HarvestService = {
    async createPlan(payload: {
        pondId: string;
        cropId?: string;
        plannedHarvestDate?: string;
        targetWeightKg?: number;
        expectedPricePerKg?: number;
        expectedRevenue?: number;
        notes?: string;
    }): Promise<HarvestPlan> {
        const response = await fetch(`${API_BASE_URL}/harvest-plans`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error('Failed to create harvest plan');
        }

        return response.json();
    },

    async fetchPlans(pondId: string): Promise<HarvestPlan[]> {
        const response = await fetch(`${API_BASE_URL}/harvest-plans?pondId=${pondId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch harvest plans');
        }
        return response.json();
    },

    async completePlan(payload: {
        planId: string;
        farmId: string;
        cropId?: string;
        actualHarvestDate: string;
        actualWeightKg: number;
        actualPricePerKg: number;
    }): Promise<HarvestPlan> {
        const response = await fetch(`${API_BASE_URL}/harvest-plans/${payload.planId}/complete`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                farmId: payload.farmId,
                cropId: payload.cropId,
                actualHarvestDate: payload.actualHarvestDate,
                actualWeightKg: payload.actualWeightKg,
                actualPricePerKg: payload.actualPricePerKg,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to complete harvest plan');
        }

        return response.json();
    },

    async getSummary(pondId: string, farmId: string): Promise<HarvestCycleSummary> {
        const response = await fetch(`${API_BASE_URL}/harvest-plans/pond/${pondId}/summary?farmId=${farmId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch cycle summary');
        }
        return response.json();
    },
};
