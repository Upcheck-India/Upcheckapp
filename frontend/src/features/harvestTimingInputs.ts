/**
 * What Harvest Timing needs before it may answer (H6). ADG is REQUIRED now:
 * `Number('') = 0` used to hold ABW flat while feed cost accrued, so the
 * engine always said "Harvest now" (T1). A buyer quote ≤30 days old is
 * required too — there are no default prices any more (T2).
 */
import type { RequiredInput } from './engineInputs';

export interface HarvestTimingFields {
    abwNow: string;
    adgNow: string;
    nNow: string;
    areaM2: string;
    feedPrice: string;
    /** True when the farm has a quote ≤30 days old. */
    quoteUsable: boolean;
}

export const harvestTimingRequired = (f: HarvestTimingFields): RequiredInput[] => [
    { value: f.abwNow, labelKey: 'engines.common.needsSampling' },
    { value: f.adgNow, labelKey: 'engines.common.needsTwoSamplings' },
    { value: f.nNow, labelKey: 'engines.common.needsPopulation' },
    { value: f.areaM2, labelKey: 'engines.common.needsArea' },
    { value: f.feedPrice, labelKey: 'engines.common.needsFeedPrice' },
    { value: f.quoteUsable ? '1' : '', labelKey: 'engines.common.needsQuote' },
];

/** The backend default when the crop has no carrying capacity (shown as an assumption). */
export const DEFAULT_CARRYING_KG_M2 = 1.5;

/** `YYYY-MM-DD` + n days, calendar arithmetic (no TZ). */
export const addDaysIso = (day: string, n: number): string =>
    new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Signed rupees: "+₹1,100" / "−₹3,200". */
export const signedInr = (n: number): string =>
    `${n < 0 ? '−' : '+'}₹${Math.abs(Math.round(n)).toLocaleString('en-IN')}`;
