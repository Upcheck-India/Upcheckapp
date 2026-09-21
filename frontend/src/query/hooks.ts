/**
 * The two bits of React glue every migrated screen uses.
 *
 * `useAppQuery` passes the app's single QueryClient EXPLICITLY rather than
 * reading it from context. TanStack supports that, and it means a screen can be
 * rendered in a test (or anywhere else) without being wrapped in a provider —
 * the provider in App.tsx is still there, but only to sequence the AsyncStorage
 * restore before the first paint.
 */
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, type QueryKey, type UseQueryOptions } from '@tanstack/react-query';
import { queryClient } from './client';

export function useAppQuery<TData>(options: UseQueryOptions<TData, any, TData, any>) {
    return useQuery(options, queryClient);
}

/**
 * Stale-while-revalidate for a screen that used to fetch into `useState` on
 * every focus and show a spinner until the network answered.
 *
 * The last answer for `key` paints immediately (React Query's in-memory
 * cache, kept for the session — gcTime 24h), and every focus refetches in the
 * background. So the first open of a screen still waits for the network; every
 * open after that is instant, and still as fresh as before, because focus
 * always revalidates (`staleTime: 0`) — a teammate's write shows up the same
 * way it always did.
 *
 * Keys live under the `screen` root, which is deliberately NOT in
 * PERSISTED_ROOTS: the persisted cache is one AsyncStorage row that Android
 * cannot read back past ~2MB, and history lists would push it there. Offline
 * cold starts keep falling back to the HTTP-layer cache as before.
 *
 * Not for person data (C5.4 — team, members, attendance, leave, feedback):
 * those screens stay online-only.
 *
 * Returns the query plus the three states a screen renders:
 * - `isInitialLoading` — nothing to show yet (full-screen spinner is fine)
 * - `isRefreshing`     — a PULL-to-refresh in flight (for RefreshControl);
 *                        background revalidation never sets it
 * - `error`            — the latest attempt failed (with data: StaleNotice;
 *                        without: ErrorState)
 */
export function useCachedFetch<T>(
    key: readonly unknown[],
    fetcher: () => Promise<T>,
    options: { enabled?: boolean } = {},
) {
    const queryKey = ['screen', ...key] as const;
    const query = useAppQuery<T>({
        queryKey,
        queryFn: fetcher,
        enabled: options.enabled ?? true,
        staleTime: 0,
        // A failed background refresh keeps the painted data; one retry just
        // delays the StaleNotice on a dead connection.
        retry: 0,
    });
    const k = JSON.stringify(queryKey);
    const [pulling, setPulling] = useState(false);

    useFocusEffect(
        useCallback(() => {
            // cancelRefetch:false joins the mount fetch instead of restarting it.
            void queryClient.refetchQueries({ queryKey: JSON.parse(k), type: 'active' }, { cancelRefetch: false });
        }, [k]),
    );

    const refresh = useCallback(async () => {
        setPulling(true);
        try {
            await query.refetch();
        } finally {
            setPulling(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query.refetch]);

    /** Optimistic edits (e.g. drop a deleted row, restore it on failure). */
    const setData = useCallback(
        (updater: (prev: T | undefined) => T | undefined) => queryClient.setQueryData<T>(JSON.parse(k), updater),
        [k],
    );

    return {
        ...query,
        isInitialLoading: query.data === undefined && query.isFetching,
        isRefreshing: pulling,
        refresh,
        setData,
    };
}

/**
 * Refetch when the screen regains NAVIGATION focus.
 *
 * React Navigation keeps screens mounted, so AppState focus tracking is not
 * enough on its own — coming back from a log screen never changes AppState.
 * `stale: true` keeps this honest: within `staleTime` the return is instant and
 * silent, but a query invalidated by the farmer's own write refetches the
 * moment they land back on the screen. That is the "I shouldn't have to pull to
 * refresh after logging" complaint, closed at the framework level.
 */
export const useRefetchOnFocus = (queryKey: QueryKey): void => {
    const key = JSON.stringify(queryKey);
    useFocusEffect(
        useCallback(() => {
            void queryClient.refetchQueries({ queryKey: JSON.parse(key), type: 'active', stale: true });
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [key]),
    );
};
