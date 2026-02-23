import apiClient from './client';

export interface ChemicalRecord {
    id: string;
    pondId: string;
    recordedAt: string;
    chemicalType: string;
    productName: string;
    dosage: number;
    unit: string;
    applicationMethod: string;
    reason?: string;
    notes?: string;
}

export interface PlanktonRecord {
    id: string;
    pondId: string;
    recordedAt: string;
    density?: number;
    dominantSpecies?: string;
    diversityIndex?: number;
    notes?: string;
}

export interface MicrobiologyRecord {
    id: string;
    pondId: string;
    recordedAt: string;
    vibrioCount: number;
    totalBacteriaCount?: number;
    greenVibrioCount?: number;
    yellowVibrioCount?: number;
    notes?: string;
}

export const logResourcesApi = {
    createChemical: (data: Partial<ChemicalRecord>) => apiClient.post<ChemicalRecord>('/chemicals', data),
    createPlankton: (data: Partial<PlanktonRecord>) => apiClient.post<PlanktonRecord>('/planktons', data),
    createMicrobiology: (data: Partial<MicrobiologyRecord>) => apiClient.post<MicrobiologyRecord>('/microbiologies', data),
};
