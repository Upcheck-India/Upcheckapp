import {
    DISEASE_PROFILES,
    HEALTH_SIGN_TO_SYMPTOM,
    PRIMARY_WEIGHT,
    SECONDARY_WEIGHT,
    type DiseaseProfile,
} from '../data/diseaseKnowledge';
import type { DiseaseLibrary } from '../api/diseases';
import type { HealthObservation } from '../api/healthObservations';
import type { PondContext } from '../api/pondContext';
import { classifyZone, getThreshold, toThresholdSpecies } from './waterQualityThresholds';

/** Never a percentage (spec D8.1): a band is all the evidence supports. */
export type MatchBand = 'strong' | 'possible' | 'weak';

export interface DiseaseMatch {
    key: string;
    name: string;
    libraryScientificName?: string;
    severity: DiseaseProfile['severity'];
    band: MatchBand;
    /** 0–1 fit; for ordering only — the UI must never show it. */
    fit: number;
    /** Profile symptoms the user selected (the evidence). */
    matchedSymptoms: string[];
}

/** Fewer signs than this is not enough to suggest anything (D8.1). */
export const MIN_SIGNS = 2;

/**
 * fit = matchedWeight / profileWeight × (1 − 0.5 × unmatchedSelected / selected)
 * (spec D8.1). Each selected sign counts once in the penalty, so ticking signs
 * that don't belong to a disease pulls it down — ticking everything no longer
 * makes every disease a perfect match.
 */
export function matchDiseases(selectedSymptomIds: string[], limit = 3): DiseaseMatch[] {
    const selected = new Set(selectedSymptomIds);
    if (selected.size < MIN_SIGNS) return [];

    return DISEASE_PROFILES.map((p): DiseaseMatch => {
        const matched = [...p.primary, ...p.secondary].filter((s) => selected.has(s));
        const primaryHits = p.primary.filter((s) => selected.has(s)).length;
        const matchedWeight = primaryHits * PRIMARY_WEIGHT + (matched.length - primaryHits) * SECONDARY_WEIGHT;
        const profileWeight = p.primary.length * PRIMARY_WEIGHT + p.secondary.length * SECONDARY_WEIGHT;
        const unmatched = selected.size - matched.length;
        const fit = profileWeight > 0 ? (matchedWeight / profileWeight) * (1 - (0.5 * unmatched) / selected.size) : 0;
        const band: MatchBand = fit >= 0.6 && primaryHits >= 2 ? 'strong' : fit >= 0.35 ? 'possible' : 'weak';
        return {
            key: p.key,
            name: p.name,
            libraryScientificName: p.libraryScientificName,
            severity: p.severity,
            band,
            fit,
            matchedSymptoms: matched,
        };
    })
        .filter((m) => m.matchedSymptoms.length > 0)
        .sort((a, b) => b.fit - a.fit)
        .slice(0, limit);
}

/**
 * The library row for a profile, by its stable seeded scientific name —
 * exact, case-insensitive. Never a substring: "White Feces" used to fall
 * through, and "Shell disease" is a common name of the Vibriosis row.
 */
export function findLibraryEntry(
    profileKey: string,
    library: DiseaseLibrary[],
): DiseaseLibrary | undefined {
    const want = DISEASE_PROFILES.find((p) => p.key === profileKey)?.libraryScientificName?.trim().toLowerCase();
    if (!want) return undefined;
    return library.find((d) => d.scientificName?.trim().toLowerCase() === want);
}

/** Diagnose symptom ids → D6 HEALTH_SIGNS, for prefilling the disease form. */
export function toHealthSigns(symptomIds: string[]): string[] {
    const back = Object.fromEntries(Object.entries(HEALTH_SIGN_TO_SYMPTOM).map(([h, s]) => [s, h]));
    return symptomIds.map((s) => back[s]).filter((s): s is string => !!s);
}

const DAY_MS = 24 * 60 * 60 * 1000;
const isRecent = (iso: string | null | undefined, now: Date) =>
    !!iso && now.getTime() - new Date(iso).getTime() <= 3 * DAY_MS;

/**
 * Free (un-ionised) NH3 caution line, mg/L — the backend's FREE_NH3.cautionHigh
 * (backend/src/common/wq-thresholds.ts); not in the frontend table.
 */
const FREE_NH3_CAUTION = 0.1;

/**
 * Signs the pond's own logs already show (D8.3): D6 observations of the last
 * 3 days (anything above "none"), plus low DO / high ammonia from pond-context
 * when that reading is itself from the last 3 days. The screen labels each one
 * "from your logs" and the farmer can untick it.
 */
export function signsFromLogs(
    observations: HealthObservation[],
    ctx: PondContext | null,
    now: Date = new Date(),
): string[] {
    const out = new Set<string>();
    for (const o of observations) {
        const s = HEALTH_SIGN_TO_SYMPTOM[o.sign];
        if (s && o.level !== 'none') out.add(s);
    }
    const wq = ctx?.waterQuality;
    if (wq) {
        const species = toThresholdSpecies(ctx?.species) ?? 'vannamei';
        const doAsOf = wq.dissolvedOxygenAsOf ?? wq.recordedAt;
        if (wq.dissolvedOxygen != null && isRecent(doAsOf, now)
            && classifyZone(wq.dissolvedOxygen, getThreshold(species, 'do')) !== 'optimal') {
            out.add('low_do');
        }
        if (isRecent(wq.chemistryAsOf, now)) {
            const free = ctx?.freeAmmoniaMgL;
            const high = free != null
                ? free > FREE_NH3_CAUTION
                : wq.ammonia != null && classifyZone(wq.ammonia, getThreshold(species, 'ammonia')) !== 'optimal';
            if (high) out.add('high_ammonia');
        }
    }
    return [...out];
}
