/**
 * Remote feature flags — a kill switch per feature, controlled from PostHog.
 *
 * Evaluated on the BACKEND (`GET /features`), not by the PostHog SDK: the SDK
 * only exists after analytics consent (features/analytics.ts) and the Privacy
 * Policy forbids sending anything without it. The server evaluates locally
 * against polled definitions, so no consent question arises.
 *
 * The one rule that matters: a flag the server did not send is ON. Backend
 * unconfigured, offline, old backend without the route, flag not created yet,
 * signed out — all mean "show the feature". Only a flag that is present and
 * false hides anything, so a PostHog outage can never switch the app off.
 */
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import apiClient from '../api/client';
import { reportFeatureFlagExposure } from './analytics';

/** App key → PostHog flag key. Every one defaults to on (see above). */
export const REMOTE_FLAGS = {
    news: 'app-news',
    teamTab: 'app-team-tab',
    shop: 'app-shop',
    simulators: 'app-simulators',
    diseaseEncyclopedia: 'app-disease-encyclopedia',
    diseaseDiagnosis: 'app-disease-diagnosis',
    calculators: 'app-calculators',
    lunar: 'app-lunar',
    feedAdvisor: 'app-feed-advisor',
    export: 'app-export',
    cycleAnalysis: 'app-cycle-analysis',
    tasks: 'app-tasks',
} as const;

export type RemoteFlagKey = keyof typeof REMOTE_FLAGS;

export interface FeaturesResponse {
    flags: Record<string, string | boolean>;
    payloads: Record<string, unknown>;
}

const CACHE_KEY = 'upcheck-remote-flags';
const THROTTLE_MS = 5 * 60 * 1000;

interface RemoteFlagsState extends FeaturesResponse {
    set: (r: FeaturesResponse) => void;
}

export const useRemoteFlagsStore = create<RemoteFlagsState>()((set) => ({
    flags: {},
    payloads: {},
    set: (r) => set({ flags: r.flags ?? {}, payloads: r.payloads ?? {} }),
}));

/** Absent → on. Present → anything but `false` is on (a variant string counts). */
export const resolveFlag = (flags: Record<string, string | boolean>, key: RemoteFlagKey): boolean => {
    const k = REMOTE_FLAGS[key];
    return k in flags ? flags[k] !== false : true;
};

/** Non-hook read, for building lists outside render (and for config/features.ts). */
export const isRemoteFlagOn = (key: RemoteFlagKey): boolean =>
    resolveFlag(useRemoteFlagsStore.getState().flags, key);

let lastFetchAt = 0;
// Bumped on sign-out so a response that lands afterwards is thrown away.
let generation = 0;

const isResponse = (v: any): v is FeaturesResponse =>
    !!v && typeof v.flags === 'object' && v.flags !== null && typeof v.payloads === 'object' && v.payloads !== null;

/** Restore the last response for this user — flags are right on a cold, offline start. */
export async function restoreRemoteFlags(userId: string): Promise<void> {
    const gen = generation;
    try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (!raw || gen !== generation) return;
        const parsed = JSON.parse(raw);
        if (parsed?.userId === userId && isResponse(parsed)) useRemoteFlagsStore.getState().set(parsed);
    } catch {
        /* a corrupt cache means defaults, which is always safe */
    }
}

/** Fetch now, unless one ran within 5 min (pass `force` on sign-in). Never throws. */
export async function fetchRemoteFlags(userId: string, force = false): Promise<void> {
    const now = Date.now();
    if (!force && now - lastFetchAt < THROTTLE_MS) return;
    lastFetchAt = now;
    const gen = generation;
    try {
        const { data } = await apiClient.get<FeaturesResponse>('/features');
        if (gen !== generation || !isResponse(data)) return;
        useRemoteFlagsStore.getState().set(data);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, userId }));
    } catch {
        // Keep whatever we had — cached or defaults. Retry on the next foreground.
        lastFetchAt = 0;
    }
}

/** Signed out → defaults. The cache is kept (it is keyed by user) for the next sign-in. */
export function clearRemoteFlags(): void {
    generation++;
    lastFetchAt = 0;
    useRemoteFlagsStore.getState().set({ flags: {}, payloads: {} });
}

const exposed = new Set<string>();

/** For tests: forget which exposures this session already reported. */
export const resetExposuresForTests = (): void => exposed.clear();

export function useFlag(key: RemoteFlagKey): boolean {
    const on = useRemoteFlagsStore((s) => resolveFlag(s.flags, key));
    useEffect(() => {
        const flag = REMOTE_FLAGS[key];
        if (exposed.has(flag)) return;
        // Only marked when actually sent, so consenting mid-session still reports.
        if (reportFeatureFlagExposure(flag, on)) exposed.add(flag);
    }, [key, on]);
    return on;
}

export function useFlagPayload<T = unknown>(key: RemoteFlagKey): T | undefined {
    return useRemoteFlagsStore((s) => s.payloads[REMOTE_FLAGS[key]]) as T | undefined;
}
