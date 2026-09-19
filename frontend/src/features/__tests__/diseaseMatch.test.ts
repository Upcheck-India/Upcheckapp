import { findLibraryEntry, matchDiseases, signsFromLogs, toHealthSigns } from '../diseaseMatch';
import { DISEASE_PROFILES, PROFILES_REVIEWED_BY, SYMPTOMS } from '../../data/diseaseKnowledge';
import { HEALTH_SIGNS } from '../../api/healthObservations';
import type { DiseaseLibrary } from '../../api/diseases';
import type { PondContext } from '../../api/pondContext';

const ALL = SYMPTOMS.map((s) => s.id);
const strongKeys = (signs: string[]) =>
    matchDiseases(signs, DISEASE_PROFILES.length).filter((m) => m.band === 'strong').map((m) => m.key);

describe('matchDiseases — honest scoring (spec D8.1)', () => {
    it('ticking every sign does not make every disease Strong', () => {
        const all = matchDiseases(ALL, DISEASE_PROFILES.length);
        expect(all).toHaveLength(DISEASE_PROFILES.length);
        expect(all.every((m) => m.band === 'strong')).toBe(false);
        // The penalty bites: no disease fits perfectly when half the signs don't belong.
        expect(all.every((m) => m.fit < 1)).toBe(true);
    });

    it('black_gills alone gives no result (fewer than 2 signs)', () => {
        expect(matchDiseases(['black_gills'])).toEqual([]);
        expect(matchDiseases([])).toEqual([]);
    });

    it('a WSSV-typical set (WOAH 2.2.9 §2.3.2) gives WSSV as the only Strong', () => {
        expect(strongKeys(['white_spots', 'reduced_feeding', 'lethargy', 'surfacing', 'erratic_swimming'])).toEqual(['wssv']);
    });

    it('unmatched selected signs lower the fit', () => {
        const clean = matchDiseases(['white_spots', 'reduced_feeding'], 20).find((m) => m.key === 'wssv')!;
        const noisy = matchDiseases(['white_spots', 'reduced_feeding', 'yellow_head', 'deformed_rostrum'], 20).find((m) => m.key === 'wssv')!;
        expect(noisy.fit).toBeLessThan(clean.fit);
    });

    it('Strong needs ≥2 primary signs, even with a high fit', () => {
        // Black gill: 1 primary + all 4 secondaries → fit 1, but one primary only.
        const bg = matchDiseases(['black_gills', 'lethargy', 'reduced_feeding', 'high_ammonia', 'abnormal_water_color'], 20)
            .find((m) => m.key === 'black_gill')!;
        expect(bg.fit).toBeCloseTo(1);
        expect(bg.band).not.toBe('strong');
    });

    it('never exposes a percentage field', () => {
        const [m] = matchDiseases(['white_spots', 'reduced_feeding']);
        expect(m).not.toHaveProperty('confidence');
        expect(['strong', 'possible', 'weak']).toContain(m.band);
    });

    it('new profiles are reachable from their own signs', () => {
        expect(strongKeys(['deformed_rostrum', 'size_variation'])).toContain('ihhnv');
        expect(strongKeys(['loose_shell', 'pale_hepatopancreas', 'steady_deaths'])).toContain('lss');
        expect(strongKeys(['white_muscle', 'steady_deaths'])).toContain('rms');
        expect(matchDiseases(['luminescence', 'reduced_feeding'])[0].key).toBe('luminous_vibriosis');
    });

    it('every profile sign is a real symptom, and every symptom is used', () => {
        const ids = new Set(ALL);
        const used = new Set(DISEASE_PROFILES.flatMap((p) => [...p.primary, ...p.secondary]));
        used.forEach((s) => expect(ids.has(s)).toBe(true));
        ALL.forEach((s) => expect(used.has(s)).toBe(true));
    });
});

// OWNER RULE (spec D8.2): profile edits need a named aquaculture-health
// reviewer. Unskip when PROFILES_REVIEWED_BY is filled in.
describe.skip('profiles.reviewed — BLOCKED until a named reviewer signs off', () => {
    it('names the aquaculture-health reviewer', () => {
        expect(PROFILES_REVIEWED_BY.trim().length).toBeGreaterThan(0);
    });
});

describe('findLibraryEntry — deep-link by stable key, not substring (D8.7)', () => {
    const lib = [
        { id: 'vib', name: 'Vibriosis', scientificName: 'Vibrio spp.', commonNames: ['Luminescent Vibriosis', 'Shell disease'] },
        { id: 'shell', name: 'Shell Disease', scientificName: 'Shell Disease', commonNames: ['Brown spot'] },
        { id: 'w', name: 'WSSV', scientificName: 'White Spot Syndrome Virus', commonNames: ['White Spot'] },
        { id: 'rms', name: 'Running Mortality Syndrome', scientificName: 'Running Mortality Syndrome', commonNames: ['RMS'] },
    ] as DiseaseLibrary[];

    it('finds the row by the profile key', () => {
        expect(findLibraryEntry('wssv', lib)?.id).toBe('w');
        expect(findLibraryEntry('rms', lib)?.id).toBe('rms');
        expect(findLibraryEntry('luminous_vibriosis', lib)?.id).toBe('vib');
    });

    it('returns nothing for a disease the library lacks, instead of a near miss', () => {
        expect(findLibraryEntry('wfs', lib)).toBeUndefined();
        expect(findLibraryEntry('white_muscle', lib)).toBeUndefined();
        expect(findLibraryEntry('lss', lib)).toBeUndefined();
    });

    it('does not substring-match a renamed row', () => {
        const renamed = [{ id: 'x', name: 'WSSV (old)', scientificName: 'White Spot Syndrome Virus variant', commonNames: [] }] as unknown as DiseaseLibrary[];
        expect(findLibraryEntry('wssv', renamed)).toBeUndefined();
    });
});

describe('pond-data prefill (D8.3)', () => {
    const now = new Date('2026-09-19T06:00:00Z');
    const obs = (sign: string, level: 'none' | 'few' | 'many') => ({ sign, level }) as any;
    const ctx = (over: Partial<NonNullable<PondContext['waterQuality']>> = {}, free: number | null = null) =>
        ({
            species: 'Penaeus vannamei',
            freeAmmoniaMgL: free,
            waterQuality: {
                dissolvedOxygen: null, ammonia: null, recordedAt: null, dissolvedOxygenAsOf: null, chemistryAsOf: null,
                ...over,
            },
        }) as unknown as PondContext;

    it('maps D6 observations, skipping "none"', () => {
        expect(signsFromLogs([obs('red_body', 'few'), obs('black_gill', 'many'), obs('white_spots', 'none')], null, now).sort())
            .toEqual(['black_gills', 'red_discoloration']);
    });

    it('adds low DO and high ammonia from recent pond-context readings only', () => {
        const recent = '2026-09-18T20:00:00Z';
        const old = '2026-09-10T20:00:00Z';
        expect(signsFromLogs([], ctx({ dissolvedOxygen: 3.2, dissolvedOxygenAsOf: recent }), now)).toEqual(['low_do']);
        expect(signsFromLogs([], ctx({ dissolvedOxygen: 3.2, dissolvedOxygenAsOf: old }), now)).toEqual([]);
        expect(signsFromLogs([], ctx({ dissolvedOxygen: 5.5, dissolvedOxygenAsOf: recent }), now)).toEqual([]);
        expect(signsFromLogs([], ctx({ chemistryAsOf: recent }, 0.2), now)).toEqual(['high_ammonia']);
        expect(signsFromLogs([], ctx({ chemistryAsOf: recent }, 0.05), now)).toEqual([]);
    });

    it('every D6 health sign maps to a Diagnose symptom and back', () => {
        const back = toHealthSigns(signsFromLogs(HEALTH_SIGNS.map((s) => obs(s, 'few')), null, now));
        expect(back.sort()).toEqual([...HEALTH_SIGNS].sort());
    });
});
