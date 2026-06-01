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

export interface CreateSpeciesDto {
    scientificName: string;
    commonName?: string;
    optimalPhMin?: number;
    optimalPhMax?: number;
    optimalSalinityMin?: number;
    optimalSalinityMax?: number;
    optimalTempMin?: number;
    optimalTempMax?: number;
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

export interface CreateHatcheryDto {
    name: string;
    location?: string;
    contactInfo?: object;
    isActive?: boolean;
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

export interface CreateBroodstockDto {
    supplier: string;
    lineCode?: string;
    origin?: string;
    specifications?: object;
    isActive?: boolean;
}

export const referenceApi = {
    // Species
    getAllSpecies: () =>
        apiClient.get<Species[]>('/reference/species'),

    getSpeciesById: (id: string) =>
        apiClient.get<Species>(`/reference/species/${id}`),

    createSpecies: (data: CreateSpeciesDto) =>
        apiClient.post<Species>('/reference/species', data),

    // Hatcheries
    getAllHatcheries: () =>
        apiClient.get<Hatchery[]>('/reference/hatcheries'),

    getHatcheryById: (id: string) =>
        apiClient.get<Hatchery>(`/reference/hatcheries/${id}`),

    createHatchery: (data: CreateHatcheryDto) =>
        apiClient.post<Hatchery>('/reference/hatcheries', data),

    // Broodstocks
    getAllBroodstocks: () =>
        apiClient.get<Broodstock[]>('/reference/broodstocks'),

    getBroodstockById: (id: string) =>
        apiClient.get<Broodstock>(`/reference/broodstocks/${id}`),

    createBroodstock: (data: CreateBroodstockDto) =>
        apiClient.post<Broodstock>('/reference/broodstocks', data),
};
