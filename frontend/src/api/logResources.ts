import apiClient from './client';

// Chemical Data
export interface ChemicalRecord {
    id: string;
    cropId: string;
    measurementDate: string;
    measurementTime: string;
    ammoniaNh3Ppm?: number;
    nitriteNo2Ppm?: number;
    alkalinityPpm?: number;
    nitrateNo3Ppm?: number;
    hardnessPpm?: number;
    calciumCaPpm?: number;
    magnesiumMgPpm?: number;
    carbonateCo3Ppm?: number;
    bicarbonateHco3Ppm?: number;
    tomPpm?: number;
    ammoniumNh4Ppm?: number;
    phosphatePo4Ppm?: number;
    totalAmmoniaPpm?: number;
    potassiumPpm?: number;
    createdAt?: string;
}

export interface CreateChemicalDataDto {
    cropId: string;
    measurementDate: string;
    measurementTime: string;
    ammoniaNh3Ppm?: number;
    nitriteNo2Ppm?: number;
    alkalinityPpm?: number;
    nitrateNo3Ppm?: number;
    hardnessPpm?: number;
    calciumCaPpm?: number;
    magnesiumMgPpm?: number;
    carbonateCo3Ppm?: number;
    bicarbonateHco3Ppm?: number;
    tomPpm?: number;
    ammoniumNh4Ppm?: number;
    phosphatePo4Ppm?: number;
    totalAmmoniaPpm?: number;
    potassiumPpm?: number;
}

// Plankton Data
export interface PlanktonRecord {
    id: string;
    cropId: string;
    measurementDate: string;
    measurementTime: string;
    greenAlgaeGaCellMl?: number;
    blueGreenAlgaeBgaCellMl?: number;
    dinoflagellataCellMl?: number;
    diatomCellMl?: number;
    protozoaCellMl?: number;
    flocCellMl?: number;
    goldenBrownAlgaeCellMl?: number;
    euglenophytaCellMl?: number;
    zooCellMl?: number;
    haptoyphytaCellMl?: number;
    goldenGreenAlgaeCellMl?: number;
    yellowGreenAlgaeCellMl?: number;
    otherPlanktonCellMl?: number;
    createdAt?: string;
}

export interface CreatePlanktonDataDto {
    cropId: string;
    measurementDate: string;
    measurementTime: string;
    greenAlgaeGaCellMl?: number;
    blueGreenAlgaeBgaCellMl?: number;
    dinoflagellataCellMl?: number;
    diatomCellMl?: number;
    protozoaCellMl?: number;
    flocCellMl?: number;
    goldenBrownAlgaeCellMl?: number;
    euglenophytaCellMl?: number;
    zooCellMl?: number;
    haptoyphytaCellMl?: number;
    goldenGreenAlgaeCellMl?: number;
    yellowGreenAlgaeCellMl?: number;
    otherPlanktonCellMl?: number;
}

// Microbiology Data
export interface MicrobiologyRecord {
    id: string;
    cropId: string;
    measurementDate: string;
    totalBacillusCfuMl?: number;
    totalVibrioCountTvcCfuMl?: number;
    yellowVibrioCountTvcCfuMl?: number;
    greenVibrioCountTvcCfuMl?: number;
    luminescentBacteriaLbCfuMl?: number;
    note?: string;
    createdAt?: string;
}

export interface CreateMicrobiologyDataDto {
    cropId: string;
    measurementDate: string;
    totalBacillusCfuMl?: number;
    totalVibrioCountTvcCfuMl?: number;
    yellowVibrioCountTvcCfuMl?: number;
    greenVibrioCountTvcCfuMl?: number;
    luminescentBacteriaLbCfuMl?: number;
    note?: string;
}

export const logResourcesApi = {
    // Chemical - requires cropId for fetching
    getChemicalByCrop: (cropId: string) =>
        apiClient.get<ChemicalRecord[]>(`/chemical-data/crop/${cropId}`),
    createChemical: (data: CreateChemicalDataDto) =>
        apiClient.post<ChemicalRecord>('/chemical-data', data),
    updateChemical: (id: string, data: Partial<CreateChemicalDataDto>) =>
        apiClient.patch<ChemicalRecord>(`/chemical-data/${id}`, data),
    removeChemical: (id: string) =>
        apiClient.delete(`/chemical-data/${id}`),

    // Plankton - requires cropId for fetching
    getPlanktonByCrop: (cropId: string) =>
        apiClient.get<PlanktonRecord[]>(`/plankton-data/crop/${cropId}`),
    createPlankton: (data: CreatePlanktonDataDto) =>
        apiClient.post<PlanktonRecord>('/plankton-data', data),
    updatePlankton: (id: string, data: Partial<CreatePlanktonDataDto>) =>
        apiClient.patch<PlanktonRecord>(`/plankton-data/${id}`, data),
    removePlankton: (id: string) =>
        apiClient.delete(`/plankton-data/${id}`),

    // Microbiology - requires cropId for fetching
    getMicrobiologyByCrop: (cropId: string) =>
        apiClient.get<MicrobiologyRecord[]>(`/microbiology-data/crop/${cropId}`),
    createMicrobiology: (data: CreateMicrobiologyDataDto) =>
        apiClient.post<MicrobiologyRecord>('/microbiology-data', data),
    updateMicrobiology: (id: string, data: Partial<CreateMicrobiologyDataDto>) =>
        apiClient.patch<MicrobiologyRecord>(`/microbiology-data/${id}`, data),
    removeMicrobiology: (id: string) =>
        apiClient.delete(`/microbiology-data/${id}`),
};

