import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    BANNED_SUBSTANCES,
    BANNED_LIST_VERSION,
    BANNED_LIST_REVIEWED_ON,
    BANNED_LIST_REVIEWED_BY,
    type BannedSubstance,
} from './bannedSubstances';
import { fetchBannedSubstances } from '../api/bannedSubstances';

/**
 * Holds the banned-substance list used by the guardrail (BANNED-1). Defaults to
 * the list bundled with the app, is replaced by the authoritative server list on
 * `hydrate()`, and persists so the last server list is available OFFLINE. This
 * lets the regulatory list change with a server deploy instead of an app-store
 * release.
 */
interface BannedState {
    substances: BannedSubstance[];
    /** List date, 'YYYY-MM-DD'. */
    version: string;
    reviewedOn: string | null;
    reviewedBy: string | null;
    hydrate: () => Promise<void>;
}

type Persisted = Pick<BannedState, 'substances' | 'version' | 'reviewedOn' | 'reviewedBy'>;

const BUNDLED: Persisted = {
    substances: BANNED_SUBSTANCES,
    version: BANNED_LIST_VERSION,
    reviewedOn: BANNED_LIST_REVIEWED_ON,
    reviewedBy: BANNED_LIST_REVIEWED_BY || null,
};

/**
 * A cached list older than the one bundled with this build (e.g. cached before
 * an OTA shipped a bigger list) must not override it while offline. Versions
 * are ISO dates, so string order is date order.
 */
export function pickNewer(persisted: Partial<Persisted> | undefined): Persisted {
    if (!persisted?.substances?.length || !persisted.version) return BUNDLED;
    if (persisted.version < BUNDLED.version) return BUNDLED;
    return {
        substances: persisted.substances,
        version: persisted.version,
        reviewedOn: persisted.reviewedOn ?? null,
        reviewedBy: persisted.reviewedBy ?? null,
    };
}

export const useBannedSubstancesStore = create<BannedState>()(
    persist(
        (set) => ({
            ...BUNDLED,
            hydrate: async () => {
                try {
                    // pickNewer: a server still on an older list (deployed
                    // after this OTA) must not downgrade the bundled one.
                    set(pickNewer(await fetchBannedSubstances()));
                } catch {
                    // Offline / server unreachable — keep the cached (or bundled) list.
                }
            },
        }),
        {
            name: 'banned-substances',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (s): Persisted => ({
                substances: s.substances,
                version: s.version,
                reviewedOn: s.reviewedOn,
                reviewedBy: s.reviewedBy,
            }),
            merge: (persisted, current) => ({ ...current, ...pickNewer(persisted as Partial<Persisted>) }),
        },
    ),
);
