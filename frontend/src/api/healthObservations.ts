import * as Crypto from 'expo-crypto';
import apiClient from './client';
import { saveRecord } from '../sync/recordSync';

/**
 * Health observations (spec 2026-09-19 disease/health D6). Mirrors
 * backend/src/health-observations/health.constants.ts.
 */
export const HEALTH_SIGNS = [
    'soft_shell',
    'white_feces',
    'red_body',
    'empty_gut',
    'loose_shell',
    'black_gill',
    'luminescence',
    'surface_gathering',
    'erratic_swimming',
    'white_spots',
    'pale_hp',
] as const;
export type HealthSign = (typeof HEALTH_SIGNS)[number];
export type HealthLevel = 'none' | 'few' | 'many';
export type HealthSource = 'quick' | 'sampling' | 'harvest' | 'tray';

export const MORTALITY_CAUSES = ['unknown', 'low_do', 'disease', 'molt', 'handling', 'predator', 'other'] as const;
export const DISEASE_SEVERITIES = ['mild', 'moderate', 'severe'] as const;
export const CONFIRMED_BY = ['suspected', 'microscopy', 'pcr', 'lab_other'] as const;
export const DISEASE_OUTCOMES = ['ongoing', 'recovered', 'emergency_harvest', 'crop_lost'] as const;

/** Old free-text severity → the one vocabulary (same map as the backend's). */
export const normaliseSeverity = (v?: string | null): (typeof DISEASE_SEVERITIES)[number] | null => {
    const s = (v ?? '').trim().toLowerCase();
    if (['mild', 'low', 'minor'].includes(s)) return 'mild';
    if (['moderate', 'medium'].includes(s)) return 'moderate';
    if (['severe', 'high', 'critical'].includes(s)) return 'severe';
    return null;
};

export interface HealthObservation {
    id: string;
    pondId: string;
    cropId: string | null;
    observedOn: string;
    sign: HealthSign;
    level: HealthLevel;
    sampleSize: number | null;
    count: number | null;
    moltDeaths: number | null;
    source: HealthSource;
    windowKey: string | null;
    photoUrls: string[];
    photoSignedUrls?: string[];
    createdAt: string;
}

export interface SaveObservationsInput {
    pondId: string;
    cropId?: string;
    observedOn: string;
    source: HealthSource;
    sampleSize?: number;
    moltDeaths?: number;
    photoUrls?: string[];
    signs: { sign: HealthSign; level: HealthLevel; count?: number }[];
}

/**
 * Soft shells in a cast-net sample → a level.
 * ponytail: <10% few, ≥10% many is a field rule of thumb, uncalibrated
 * (harvest spec M2 / E4 provenance). M3 calibration replaces it.
 */
export const levelFromCount = (count: number, sampleSize: number): HealthLevel =>
    count <= 0 ? 'none' : sampleSize > 0 && count / sampleSize >= 0.1 ? 'many' : 'few';

export const healthObservationsApi = {
    /**
     * One health check = one queue entry; every sign carries its own
     * client-minted id, so a replay inserts nothing twice. Saves offline.
     */
    save: ({ signs, ...rest }: SaveObservationsInput) =>
        saveRecord({
            entity: 'health_observation',
            endpoint: '/health-observations',
            payload: { ...rest, signs: signs.map((s) => ({ id: Crypto.randomUUID(), ...s })) },
        }),

    /** The pond's observations of the last `days` IST days. */
    listForPond: (pondId: string, days = 3) =>
        apiClient.get<HealthObservation[]>(`/health-observations/pond/${pondId}`, { params: { days } }),

    /** One compressed photo → its private storage path. Online only. */
    uploadPhoto: (pondId: string, uri: string) => {
        const form = new FormData();
        form.append('file', { uri, name: 'photo.jpg', type: 'image/jpeg' } as any);
        return apiClient.post<{ path: string }>(`/health-observations/photos/${pondId}`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000,
        });
    },
};
