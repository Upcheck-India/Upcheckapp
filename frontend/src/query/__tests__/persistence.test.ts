// C5.4: Team data (names, attendance, leave) is other people's personal data
// and AsyncStorage is unencrypted on Android, so it never reaches disk, and
// copies written by older builds are discarded on the next launch.
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { persistQueryClientRestore } from '@tanstack/query-persist-client-core';
import { PERSISTED_ROOTS, persistOptions, qk } from '../client';

it('does not persist the team root', () => {
    expect(PERSISTED_ROOTS.has('team')).toBe(false);

    const qc = new QueryClient();
    qc.setQueryData(qk.team('f1'), [{ name: 'Someone', onLeave: true }]);
    qc.setQueryData(qk.farms(), [{ id: 'f1' }]);
    const state = dehydrate(qc, persistOptions.dehydrateOptions);

    expect(state.queries.map((q) => q.queryKey[0])).toEqual(['farms']);
});

it('discards a cache persisted by an older build (which included team)', async () => {
    const old = new QueryClient();
    old.setQueryData(qk.team('f1'), [{ name: 'Someone' }]);
    // Older builds persisted with no buster (TanStack default '').
    const stored = { timestamp: Date.now(), buster: '', clientState: dehydrate(old) };
    const persister = {
        persistClient: jest.fn(),
        restoreClient: jest.fn(async () => stored),
        removeClient: jest.fn(),
    };

    const fresh = new QueryClient();
    await persistQueryClientRestore({
        queryClient: fresh,
        persister,
        maxAge: persistOptions.maxAge,
        buster: persistOptions.buster,
    });

    expect(fresh.getQueryData(qk.team('f1'))).toBeUndefined();
    expect(persister.removeClient).toHaveBeenCalled();
});
