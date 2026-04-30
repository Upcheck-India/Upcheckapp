import apiClient from './client';

export interface Species {
    id: string;
    name: string;
    scientificName?: string;
    description?: string;
}

export interface Hatchery {
    id: string;
    name: string;
    location?: string;
    contact?: string;
}

export interface Broodstock {
    id: string;
    name: string;
    speciesId?: string;
    origin?: string;
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