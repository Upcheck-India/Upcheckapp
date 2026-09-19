/**
 * "POND SHOWS IDLE AFTER CREATING A CYCLE."
 *
 * `/crops` was missing from URL_ENTITY_MAP, so the response interceptor
 * resolved `undefined` for every cycle write and invalidated nothing. The pond
 * dashboard kept serving its cached "no cycle" read against a 5-minute
 * staleTime — create, close, update and delete were all affected.
 *
 * These pin both halves: the path resolves to an entity, and that entity
 * actually marks the pond query stale.
 */
import { queryClient, qk, resolveEntityForUrl, invalidateForEntity } from '../client';

describe('cycle writes invalidate the pond caches', () => {
    afterEach(() => {
        queryClient.clear();
    });

    it('resolves /crops to the crop entity', () => {
        expect(resolveEntityForUrl('/crops')).toBe('crop');
    });

    it('resolves a nested crop path (close/update) to the crop entity', () => {
        expect(resolveEntityForUrl('/crops/abc/close')).toBe('crop');
    });

    it('marks a cached pond dashboard invalidated', () => {
        queryClient.setQueryData(qk.pond('p1'), { id: 'p1', activeCrop: null });

        invalidateForEntity('crop');

        expect(queryClient.getQueryState(qk.pond('p1'))?.isInvalidated).toBe(true);
    });
});

// A full harvest (or a completed plan) closes the cycle and flips the pond to
// fallow — the pond LIST must refetch too, not just the dashboard.
describe('harvest writes invalidate the pond list', () => {
    afterEach(() => {
        queryClient.clear();
    });

    it('resolves /harvest-plans to its own entity, not to harvests', () => {
        expect(resolveEntityForUrl('/harvest-plans/abc/complete')).toBe('harvest_plan');
        expect(resolveEntityForUrl('/harvests')).toBe('harvest');
    });

    it.each(['harvest', 'harvest_plan'])('%s marks the pond list and money stale', (entity) => {
        queryClient.setQueryData(['ponds', 'farm-1'], []);
        queryClient.setQueryData(['money', 'farm-1'], {});

        invalidateForEntity(entity);

        expect(queryClient.getQueryState(['ponds', 'farm-1'])?.isInvalidated).toBe(true);
        expect(queryClient.getQueryState(['money', 'farm-1'])?.isInvalidated).toBe(true);
    });
});
