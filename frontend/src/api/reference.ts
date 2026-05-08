import apiClient from './client';

// ── Species ──

export interface Species {
    id: string;
    scientificName: string;
    commonName?: string;
    optimalPhMin?: number;
    optimalPhMax?: number;
    optimalSalinityMin?: number;
    optimalSalinityMax?: number;
    optimalTempMin?: number;
    optimalTempMax?: number;
    createdAt: string;
}

// ── Hatchery ──

export interface Hatchery {
    id: string;
    name: string;
    location?: string;
    contactInfo?: object;
    isActive: boolean;
    createdAt: string;
}

// ── Broodstock ──

export interface Broodstock {
    id: string;
    supplier: string;
    lineCode?: string;
    origin?: string;
    specifications?: object;
    isActive: boolean;
    createdAt: string;
}

export const referenceApi = {
    // Species
    getAllSpecies: () =>
        apiClient.get<Species[]>('/reference/species'),

    getSpeciesById: (id: string) =>
        apiClient.get<Species>(`/reference/species/${id}`),

    // Hatcheries
    getAllHatcheries: () =>
        apiClient.get<Hatchery[]>('/reference/hatcheries'),

    getHatcheryById: (id: string) =>
        apiClient.get<Hatchery>(`/reference/hatcheries/${id}`),

    // Broodstocks
    getAllBroodstocks: () =>
        apiClient.get<Broodstock[]>('/reference/broodstocks'),

    getBroodstockById: (id: string) =>
        apiClient.get<Broodstock>(`/reference/broodstocks/${id}`),
};
