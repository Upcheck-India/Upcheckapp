import { parseGroupedNumber } from './parseNumericInput';

/**
 * Graded harvest form logic (harvest-and-molt H1), kept out of the screen so
 * it is testable. Mirrors backend `harvestTotals` for the live summary line —
 * the server recomputes on save and its numbers are the ones stored.
 */

export const COUNT_RANGE = { min: 10, max: 400 } as const;
/** ₹/kg warn-not-block band; same as the server's PRICE_BAND. */
export const PRICE_BAND = { min: 50, max: 2000 } as const;
export const MAX_GRADES = 6;
export const REJECTED_REASONS = ['soft_shell', 'broken', 'dead', 'other'] as const;

/** One grade row as typed (strings, so a half-typed "1," is not destroyed). */
export interface GradeDraft {
    id?: string;
    kg: string;
    count: string;
    price: string;
}

export interface ParsedGrade {
    id?: string;
    weightKg: number;
    countPerKg: number | null;
    pricePerKg: number | null;
}

export type GradeError = 'weight' | 'count' | 'price';

/** Parse every row; the first bad field wins. Blank count/price = not given. */
export function parseGrades(
    drafts: GradeDraft[],
): { grades: ParsedGrade[]; error: { index: number; field: GradeError } | null } {
    const grades: ParsedGrade[] = [];
    for (let i = 0; i < drafts.length; i++) {
        const d = drafts[i];
        const kg = parseGroupedNumber(d.kg);
        if (kg == null || kg <= 0) return { grades, error: { index: i, field: 'weight' } };
        const count = d.count.trim() ? parseGroupedNumber(d.count) : null;
        if (d.count.trim() && (count == null || count < COUNT_RANGE.min || count > COUNT_RANGE.max)) {
            return { grades, error: { index: i, field: 'count' } };
        }
        const price = d.price.trim() ? parseGroupedNumber(d.price) : null;
        if (d.price.trim() && (price == null || price <= 0)) {
            return { grades, error: { index: i, field: 'price' } };
        }
        grades.push({ id: d.id, weightKg: kg, countPerKg: count, pricePerKg: price });
    }
    return { grades, error: null };
}

export const priceOutOfBand = (g: ParsedGrade) =>
    g.pricePerKg != null && (g.pricePerKg < PRICE_BAND.min || g.pricePerKg > PRICE_BAND.max);

export interface GradeSummary {
    weightKg: number;
    /** Null when any line has no price (never a partial sum). */
    totalRupees: number | null;
    pieces: number | null;
    piecesEstimated: boolean;
    /** Weighted buyer count (pieces/kg) over the graded lines. */
    avgCount: number | null;
}

export function summarize(grades: ParsedGrade[], abwG: number | null): GradeSummary {
    const weightKg = grades.reduce((s, g) => s + g.weightKg, 0);
    const totalRupees =
        grades.length > 0 && grades.every((g) => g.pricePerKg != null)
            ? Math.round(grades.reduce((s, g) => s + g.weightKg * (g.pricePerKg as number), 0) * 100) / 100
            : null;
    const graded = grades.filter((g) => g.countPerKg != null);
    const gradedKg = graded.reduce((s, g) => s + g.weightKg, 0);
    const gradedPieces = graded.reduce((s, g) => s + g.weightKg * (g.countPerKg as number), 0);
    const avgCount = gradedKg > 0 ? Math.round(gradedPieces / gradedKg) : null;
    if (grades.length > 0 && graded.length === grades.length) {
        return { weightKg, totalRupees, pieces: Math.round(gradedPieces), piecesEstimated: false, avgCount };
    }
    if (abwG != null && abwG > 0 && weightKg > 0) {
        return { weightKg, totalRupees, pieces: Math.round((weightKg * 1000) / abwG), piecesEstimated: true, avgCount };
    }
    return { weightKg, totalRupees, pieces: null, piecesEstimated: false, avgCount };
}

/**
 * The form's starting rows for an existing harvest. An old, ungraded harvest
 * (no grade lines) is read as one implicit line: its weight, the count its
 * g/piece implies, and its total spread per kg.
 */
export function draftsFor(h: {
    grades?: { id: string; weightKg: number; countPerKg: number | null; pricePerKg: number | null }[];
    weightKg?: number | null;
    averageSize?: number | null;
    salePriceTotal?: number | string | null;
}): GradeDraft[] {
    const s = (n: number | null | undefined) => (n == null ? '' : String(n));
    if (h.grades?.length) {
        return h.grades.map((g) => ({ id: g.id, kg: s(g.weightKg), count: s(g.countPerKg), price: s(g.pricePerKg) }));
    }
    const kg = Number(h.weightKg) || 0;
    const total = h.salePriceTotal == null ? null : Number(h.salePriceTotal);
    return [
        {
            kg: kg ? String(kg) : '',
            count: h.averageSize ? String(Math.round(1000 / Number(h.averageSize))) : '',
            price: total != null && kg > 0 ? String(Math.round((total / kg) * 100) / 100) : '',
        },
    ];
}

/** Count/kg a latest ABW implies — the labelled prefill for a new harvest. */
export const countFromAbw = (abwG: number | null | undefined): number | null =>
    abwG != null && abwG > 0 ? Math.round(1000 / abwG) : null;
