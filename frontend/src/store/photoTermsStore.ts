import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { photosApi } from '../api/photos';

/**
 * F8.1: "Farm records only. Personal photos are not allowed here." — shown
 * once, before a user's FIRST photo upload anywhere, then never again.
 *
 * `acked` is the LOCAL source of truth so the dialog never reappears offline
 * (it persists across restarts via AsyncStorage); `synced` tracks whether the
 * server has recorded it yet. The ack still counts locally even offline — the
 * spec requires it be shown before upload, not that the network round-trip
 * complete first — and `syncIfNeeded` retries the POST once connectivity is
 * back, same spirit as the offline record queue.
 */
interface PhotoTermsState {
    acked: boolean;
    synced: boolean;
    setAcked: () => void;
    syncIfNeeded: () => Promise<void>;
    /** For a returning user whose ack predates this device (re-login, reinstall). */
    hydrateFromServer: () => Promise<void>;
}

export const usePhotoTermsStore = create<PhotoTermsState>()(
    persist(
        (set, get) => ({
            acked: false,
            synced: false,

            setAcked: () => {
                set({ acked: true, synced: false });
                void get().syncIfNeeded();
            },

            syncIfNeeded: async () => {
                if (!get().acked || get().synced) return;
                try {
                    await photosApi.postTermsAck();
                    set({ synced: true });
                } catch {
                    // Retried on next app open / next ack attempt — never blocks the upload.
                }
            },

            hydrateFromServer: async () => {
                if (get().acked) return;
                try {
                    const { data } = await photosApi.getTermsAck();
                    if (data.ackedAt) set({ acked: true, synced: true });
                } catch {
                    // Offline or not yet migrated — the dialog just shows once more, which is safe.
                }
            },
        }),
        { name: 'photo-terms-ack', storage: createJSONStorage(() => AsyncStorage) },
    ),
);
