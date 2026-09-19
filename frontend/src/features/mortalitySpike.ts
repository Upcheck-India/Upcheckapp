/**
 * The mortality spike rule — the same one as the backend's day score and brief
 * (`isMortalitySpike`, backend/src/daily-brief/day-score.ts): ≥ 10 dead and
 * more than 3× the 7-day average.
 */
export const isMortalitySpike = (mortality: number, avg7: number | null): boolean =>
    mortality >= 10 && mortality > 3 * (avg7 ?? 0);

const dayMs = (d: string) => Date.parse(`${String(d).slice(0, 10)}T00:00:00Z`);

/** Mean daily deaths over the 7 days before `date` (÷ 7, like the brief); null if none logged. */
export const mortality7DayAvg = (
    records: { recordDate: string; quantity: number; id?: string }[],
    date: string,
    excludeId?: string,
): number | null => {
    const end = dayMs(date);
    const week = records.filter((r) => {
        if (excludeId && r.id === excludeId) return false;
        const d = dayMs(r.recordDate);
        return d < end && d >= end - 7 * 86_400_000;
    });
    return week.length ? week.reduce((s, r) => s + (Number(r.quantity) || 0), 0) / 7 : null;
};

/**
 * What to offer after a mortality save (spec D6): a spike asks for a health
 * check first; cause `disease` offers a disease record.
 */
export const afterMortalitySave = (args: {
    quantity: number;
    avg7: number | null;
    cause: string | null;
}): { kind: 'health_check'; times: number | null } | { kind: 'disease' } | null => {
    if (isMortalitySpike(args.quantity, args.avg7)) {
        return { kind: 'health_check', times: args.avg7 ? Math.round(args.quantity / args.avg7) : null };
    }
    if (args.cause === 'disease') return { kind: 'disease' };
    return null;
};
