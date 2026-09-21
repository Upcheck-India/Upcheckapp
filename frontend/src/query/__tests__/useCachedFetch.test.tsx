// Stale-while-revalidate: a second open paints the last answer at once and
// refreshes silently; only a pull shows the refresh spinner.
jest.mock('@react-navigation/native', () => {
    const actual = jest.requireActual('@react-navigation/native');
    return {
        ...actual,
        useFocusEffect: (effect: () => void) => {
            const React = require('react');
            React.useEffect(effect, []);
        },
    };
});

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useCachedFetch } from '../hooks';
import { PERSISTED_ROOTS } from '../client';

it('first open loads; a later open paints cached data while revalidating in the background', async () => {
    let n = 0;
    let release: () => void = () => undefined;
    const fetcher = jest.fn(
        () =>
            new Promise<number>((resolve) => {
                const v = ++n;
                release = () => resolve(v);
                if (v === 1) resolve(v);
            }),
    );

    const first = renderHook(() => useCachedFetch(['t', 'a'], fetcher));
    expect(first.result.current.isInitialLoading).toBe(true);
    await waitFor(() => expect(first.result.current.data).toBe(1));
    first.unmount();

    const second = renderHook(() => useCachedFetch(['t', 'a'], fetcher));
    // Instant paint from cache, no spinner of either kind.
    expect(second.result.current.data).toBe(1);
    expect(second.result.current.isInitialLoading).toBe(false);
    expect(second.result.current.isRefreshing).toBe(false);
    // …while the revalidation is in flight — joined, not duplicated.
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    await act(async () => release());
    await waitFor(() => expect(second.result.current.data).toBe(2));
});

it('a failed revalidation keeps the data and reports the error', async () => {
    const fetcher = jest.fn().mockResolvedValueOnce(['row']).mockRejectedValueOnce(new Error('Network Error'));
    const { result } = renderHook(() => useCachedFetch(['t', 'b'], fetcher));
    await waitFor(() => expect(result.current.data).toEqual(['row']));
    await act(async () => {
        await result.current.refresh();
    });
    expect(result.current.data).toEqual(['row']);
    expect(result.current.error).toBeTruthy();
    expect(result.current.isRefreshing).toBe(false);
});

it('never reaches the disk-persisted cache', () => {
    expect(PERSISTED_ROOTS.has('screen')).toBe(false);
});
