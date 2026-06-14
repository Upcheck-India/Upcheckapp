import apiClient from './client';

export interface DiseaseReport {
  farmId: string;
  lat: number;
  lon: number;
  disease: string;
  daysAgo: number;
}

export interface HeatCell {
  cellLat: number;
  cellLon: number;
  farms: number;
  reports: number;
  diseases: string[];
}

export const regionalMapApi = {
  risk: (body: {
    pondLat: number;
    pondLon: number;
    reports: DiseaseReport[];
    disease?: string;
    radiusKm?: number;
    days?: number;
    k?: number;
  }) =>
    apiClient.post<{ riskFactor: number; distinctFarms: number; suppressed: boolean }>(
      '/regional-map/risk',
      body,
    ),

  heatmap: (body: { reports: DiseaseReport[]; gridDeg?: number; k?: number }) =>
    apiClient.post<HeatCell[]>('/regional-map/heatmap', body),
};
