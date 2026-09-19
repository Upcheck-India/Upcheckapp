import apiClient from './client';
import { saveRecord } from '../sync/recordSync';

/**
 * Seed PCR + biosecurity checklist (spec 2026-09-19 D5). Mirrors
 * `backend/src/crops/biosecurity.service.ts`.
 */
export const BIOSECURITY_ITEMS = [
    { key: 'pond_dried', stage: 'prep' },
    { key: 'bottom_limed', stage: 'prep' },
    { key: 'water_filtered', stage: 'prep' },
    { key: 'water_disinfected', stage: 'prep' },
    { key: 'bird_net', stage: 'prep' },
    { key: 'crab_fence', stage: 'prep' },
    { key: 'footbath', stage: 'culture' },
    { key: 'separate_tools', stage: 'culture' },
    { key: 'dead_shrimp_disposal', stage: 'culture' },
] as const;

export const PCR_TESTS = ['wssv', 'ehp', 'ahpnd', 'ihhnv'] as const;
export const PCR_RESULTS = ['negative', 'positive', 'not_tested'] as const;
export type PcrTest = (typeof PCR_TESTS)[number];
export type PcrResult = (typeof PCR_RESULTS)[number];
export type PcrResults = Partial<Record<PcrTest, PcrResult>>;

export interface SeedHealth {
    plSpf: boolean | null;
    plPcrDate: string | null;
    plPcrLab: string | null;
    plPcrResults: PcrResults | null;
}

export interface CropBiosecurity {
    cropId: string;
    /** false until the backend migration is applied — hide the UI. */
    available: boolean;
    seed: SeedHealth | null;
    items: { key: string; stage: 'prep' | 'culture'; done: boolean; doneOn: string | null; note: string | null }[];
    done: number;
    total: number;
}

/**
 * Warn-only seed message (never a gate): any positive → 'positive' (red
 * confirm); WSSV or EHP not tested / missing → 'untested'; else null.
 */
export function seedWarning(r: PcrResults | null | undefined): 'positive' | 'untested' | null {
    if (r && PCR_TESTS.some((k) => r[k] === 'positive')) return 'positive';
    const tested = (k: PcrTest) => r?.[k] === 'negative';
    return tested('wssv') && tested('ehp') ? null : 'untested';
}

export const biosecurityApi = {
    get: (cropId: string) => apiClient.get<CropBiosecurity>(`/crops/${cropId}/biosecurity`),
    /** WRITE_MANAGEMENT. `null` clears a field; an omitted one is left as is. */
    setSeed: (cropId: string, seed: Partial<SeedHealth>) =>
        apiClient.patch<CropBiosecurity>(`/crops/${cropId}/seed`, seed),
    /**
     * Tick / un-tick (WRITE_OPERATIONAL). Offline-first: a client id + the
     * queue; the server ignores a replay (unique crop+item), and a replay
     * after the cycle closed comes back 409, which the drain treats as done.
     */
    setCheck: (cropId: string, body: { itemKey: string; done: boolean }) =>
        saveRecord({ entity: 'biosecurity', endpoint: `/crops/${cropId}/biosecurity`, payload: body }) as Promise<{
            id: string;
            queued: boolean;
            data?: CropBiosecurity;
        }>,
};
