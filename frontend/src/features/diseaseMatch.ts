import {
    DISEASE_PROFILES,
    PRIMARY_WEIGHT,
    SECONDARY_WEIGHT,
    type DiseaseProfile,
} from '../data/diseaseKnowledge';

export interface DiseaseMatch {
    key: string;
    name: string;
    libraryName: string;
    severity: DiseaseProfile['severity'];
    score: number;
    /** 0–100: share of this disease's symptom profile that the observations match. */
    confidence: number;
    /** Profile symptoms the user selected (the evidence). */
    matchedSymptoms: string[];
}

function profileTotalWeight(p: DiseaseProfile): number {
    return p.primary.length * PRIMARY_WEIGHT + p.secondary.length * SECONDARY_WEIGHT;
}

/**
 * Rank diseases by weighted symptom overlap (primary=3, secondary=1).
 * Returns the top `limit` candidates with a non-zero score, most likely first.
 * Pure + offline — safe to call with no network.
 */
export function matchDiseases(selectedSymptomIds: string[], limit = 3): DiseaseMatch[] {
    const selected = new Set(selectedSymptomIds);
    if (selected.size === 0) return [];

    const scored: DiseaseMatch[] = DISEASE_PROFILES.map((p) => {
        const matched: string[] = [];
        let score = 0;
        for (const s of p.primary) {
            if (selected.has(s)) { score += PRIMARY_WEIGHT; matched.push(s); }
        }
        for (const s of p.secondary) {
            if (selected.has(s)) { score += SECONDARY_WEIGHT; matched.push(s); }
        }
        const total = profileTotalWeight(p);
        const confidence = total > 0 ? Math.round((score / total) * 100) : 0;
        return {
            key: p.key,
            name: p.name,
            libraryName: p.libraryName,
            severity: p.severity,
            score,
            confidence,
            matchedSymptoms: matched,
        };
    });

    return scored
        .filter((m) => m.score > 0)
        .sort((a, b) => b.score - a.score || b.confidence - a.confidence)
        .slice(0, limit);
}
