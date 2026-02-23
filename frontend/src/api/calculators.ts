import apiClient from './client';

export interface CultivationPerformanceRequest {
    initialCount: number;
    currentCount?: number;
    totalHarvestKg: number;
    totalFeedKg: number;
    daysOfCulture: number;
    areaM2?: number;
}

export interface CultivationPerformanceResponse {
    survivalRate: number | null;
    adg: number | null;
    abw: number | null;
    fcr: number;
    productivity: number | null;
}

export interface DailyFeedRequest {
    abw: number;
    estimatedSurvival: number;
    initialCount: number;
    feedPercentBodyWeight: number;
}

export interface DailyFeedResponse {
    dailyFeedKg: number;
}

export interface ProductAmountRequest {
    pondVolumeM3: number;
    targetDosagePpm: number;
}

export interface ProductAmountResponse {
    productAmountKg: number;
}

export interface FreeAmmoniaRequest {
    totalAmmoniaNitrogen: number;
    temperature: number;
    ph: number;
    salinity: number;
}

export interface FreeAmmoniaResponse {
    freeAmmonia: number;
    toxicLevel: boolean;
}

export const calculatorsApi = {
    calculatePerformance: (data: CultivationPerformanceRequest) =>
        apiClient.post<CultivationPerformanceResponse>('/calculators/performance', data),

    calculateDailyFeed: (data: DailyFeedRequest) =>
        apiClient.post<DailyFeedResponse>('/calculators/daily-feed', data),

    calculateProductAmount: (data: ProductAmountRequest) =>
        apiClient.post<ProductAmountResponse>('/calculators/product-amount', data),

    calculateFreeAmmonia: (data: FreeAmmoniaRequest) =>
        apiClient.post<FreeAmmoniaResponse>('/calculators/free-ammonia', data),
};
