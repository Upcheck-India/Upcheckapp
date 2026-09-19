/**
 * The disease library through the persisted TanStack cache, so the disease
 * picker works offline (spec D6, fixes H2: the picker used to be a bare API
 * call — no signal meant an empty list and a blocked save).
 *
 * `prefetchDiseaseLibrary` runs from the pond dashboard, so the library is on
 * disk before the farmer walks out to the pond.
 * ponytail: persisted copies expire with the whole cache (CACHE_MAX_AGE_MS,
 * 24h); the prefetch on every pond visit is what keeps it fresh enough.
 */
import i18n from '../i18n';
import { diseaseApi, type DiseaseLibrary } from '../api/diseases';
import { qk, queryClient } from '../query/client';
import { useAppQuery } from '../query/hooks';

const libraryQuery = (lang: string) => ({
    queryKey: qk.diseaseLibrary(lang),
    queryFn: async (): Promise<DiseaseLibrary[]> => {
        const { data } = await diseaseApi.getAllDiseases();
        return Array.isArray(data) ? data : [];
    },
    // Reference data: changes only when an admin edits the library.
    staleTime: 12 * 60 * 60 * 1000,
});

export const useDiseaseLibrary = () => useAppQuery(libraryQuery(i18n.language));

export const prefetchDiseaseLibrary = (): Promise<void> =>
    queryClient.prefetchQuery(libraryQuery(i18n.language)).catch(() => undefined);
