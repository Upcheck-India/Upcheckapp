import apiClient from './client';

export interface WeatherInput {
  rainfallMm?: number;
  tempDropC?: number;
  cycloneWarning?: boolean;
  heavyRainMm?: number;
}

export interface WeatherAdvisory {
  source: string;
  severity: 'info' | 'watch' | 'critical';
  title: string;
  steps: string[];
}

export interface WeatherResult {
  advisories: WeatherAdvisory[];
  preCycloneChecklist: string[] | null;
  emergencyHarvestRecommended: boolean;
}

export const weatherApi = {
  evaluate: (input: WeatherInput) =>
    apiClient.post<WeatherResult>('/weather/evaluate', input),
};
