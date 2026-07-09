import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BANNED_SUBSTANCES, type BannedSubstance } from './bannedSubstances';
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
    version: string | null;
    hydrate: () => Promise<void>;
}

export const useBannedSubstancesStore = create<BannedState>()(
    persist(
        (set) => ({
            substances: BANNED_SUBSTANCES,
            version: null,
            hydrate: async () => {
                try {
                    const res = await fetchBannedSubstances();
                    if (res?.substances?.length) {
                        set({ substances: res.substances, version: res.version });
                    }
                } catch {
                    // Offline / server unreachable — keep the cached (or bundled) list.
                }
            },
        }),
        {
            name: 'banned-substances',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (s) => ({ substances: s.substances, version: s.version }),
        },
    ),
);
