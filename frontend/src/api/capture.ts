import apiClient from './client';
import type { Measurement } from './measurements';

export interface CvResult {
  n: number;
  mbw: number;
  sd: number;
  cvPct: number;
}

export const captureApi = {
  /** Record a sampling event from individual weights → ABW + CV measurements. */
  sampling: (body: { pondId: string; cropId?: string; weights: number[]; measuredAt?: string }) =>
    apiClient.post<{ cv: CvResult; measurements: Measurement[] }>('/capture/sampling', body),

  /** Record the clinical-signs checklist → one measurement per sign. */
  clinicalSigns: (body: {
    pondId: string;
    cropId?: string;
    signs: Record<string, boolean | string>;
    measuredAt?: string;
  }) => apiClient.post<Measurement[]>('/capture/clinical-signs', body),

  /** Record a water-exchange event. */
  waterExchange: (body: {
    pondId: string;
    cropId?: string;
    pct?: number;
    volumeM3?: number;
    source?: string;
    measuredAt?: string;
  }) => apiClient.post<Measurement[]>('/capture/water-exchange', body),
};
