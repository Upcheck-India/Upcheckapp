import apiClient from './client';

// ── FCR ────────────────────────────────────────────────────
export interface FcrRequest {
    totalFeedKg: number;
    harvestWeightKg: number;
}

export interface FcrResponse {
    fcr: number;
}

// ── ADG ────────────────────────────────────────────────────
export interface AdgRequest {
    initialWeightG: number;
    finalWeightG: number;
    daysOfCulture: number;
}

export interface AdgResponse {
    adgG: number;
}

// ── Survival Rate ──────────────────────────────────────────
export interface SurvivalRateRequest {
    initialStock: number;
    harvestedCount: number;
}

export interface SurvivalRateResponse {
    survivalRatePercent: number;
}

// ── Daily Feed ─────────────────────────────────────────────
export interface DailyFeedRequest {
    biomassKg: number;
    feedingPercentage: number;
}

export interface DailyFeedResponse {
    dailyFeedKg: number;
}

// ── Expected Harvest ───────────────────────────────────────
export interface ExpectedHarvestRequest {
    stockingCount: number;
    survivalRatePercent: number;
    targetWeightG: number;
}

export interface ExpectedHarvestResponse {
    expectedCount: number;
    expectedWeightKg: number;
}

// ── Cultivation Performance ────────────────────────────────
export interface CultivationPerformanceRequest {
    dailyFeed: number;
    fr: number;
    abw: number;
    cumulativeFeed: number;
    initialStocking: number;
}

export interface CultivationPerformanceResponse {
    biomass: number;
    population: number;
    fcr: number;
    sr: number;
}

// ── Free Ammonia ───────────────────────────────────────────
export interface FreeAmmoniaRequest {
    tan: number;
    ph: number;
    temperature: number;
}

export interface FreeAmmoniaResponse {
    unionizedAmmonia: number;
    toxicityLevel: string;
}

// ── Product Dosage ─────────────────────────────────────────
export interface ProductDosageRequest {
    pondArea: number;
    waterLevel: number;
    dosage: number;
}

export interface ProductDosageResponse {
    amountKg: number;
}

// ── API ────────────────────────────────────────────────────
export const calculatorsApi = {
    calculateFcr: (data: FcrRequest) =>
        apiClient.post<FcrResponse>('/shrimp-calculations/fcr', data),

    calculateAdg: (data: AdgRequest) =>
        apiClient.post<AdgResponse>('/shrimp-calculations/adg', data),

    calculateSurvivalRate: (data: SurvivalRateRequest) =>
        apiClient.post<SurvivalRateResponse>('/shrimp-calculations/survival-rate', data),

    calculateDailyFeed: (data: DailyFeedRequest) =>
        apiClient.post<DailyFeedResponse>('/shrimp-calculations/daily-feed', data),

    calculateExpectedHarvest: (data: ExpectedHarvestRequest) =>
        apiClient.post<ExpectedHarvestResponse>('/shrimp-calculations/expected-harvest', data),

    calculateCultivationPerformance: (data: CultivationPerformanceRequest) =>
        apiClient.post<CultivationPerformanceResponse>('/shrimp-calculations/cultivation-performance', data),

    calculateFreeAmmonia: (data: FreeAmmoniaRequest) =>
        apiClient.post<FreeAmmoniaResponse>('/shrimp-calculations/free-ammonia', data),

    calculateProductDosage: (data: ProductDosageRequest) =>
        apiClient.post<ProductDosageResponse>('/shrimp-calculations/product-amount', data),
};
