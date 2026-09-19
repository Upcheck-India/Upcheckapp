import { addDays, windowContaining, type MoltWindow } from './moltWindow';
import type { HealthObservation } from '../api/healthObservations';
import type { CycleCompliance, Ingredient } from '../api/treatments';

/**
 * Pre-harvest check (harvest spec M2, residues per disease spec D3.5–D3.6):
 * at most three computed lines — molt, soft shells, residues — or one green
 * "Ready to harvest". Warn only; nothing here ever blocks a save.
 */
export type CheckTone = 'green' | 'amber' | 'red';
export interface CheckLine {
    key: 'molt' | 'soft' | 'residues' | 'ready';
    tone: CheckTone;
    /** i18n key under `health.check`. */
    text: string;
    params?: Record<string, string | number>;
    /** Soft-shell line with the inline cast-net entry. */
    prompt?: boolean;
}

export interface CheckInput {
    /** The harvest day, `YYYY-MM-DD` (IST). */
    date: string;
    windows?: MoltWindow[];
    observations?: HealthObservation[];
    compliance?: CycleCompliance | null;
    ingredients?: Ingredient[];
    /** `YYYY-MM-DD` → display date. */
    fmt: (day: string) => string;
}

const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const latest = <T extends { date: string }>(xs: T[]) =>
    xs.reduce<T | undefined>((a, b) => (!a || b.date > a.date ? b : a), undefined);

export function preHarvestLines({ date, windows, observations, compliance, ingredients, fmt }: CheckInput): CheckLine[] {
    const lines: CheckLine[] = [];

    const hit = windowContaining(windows, date);
    if (hit?.phase === 'peak' || hit?.phase === 'post') {
        lines.push({ key: 'molt', tone: 'amber', text: hit.phase === 'peak' ? 'moltPeak' : 'moltPost', params: { date: fmt(date) } });
    }

    // Latest soft-shell observation in the 3 days up to the harvest day.
    const from = addDays(date, -3);
    const obs = (observations ?? [])
        .filter((o) => o.sign === 'soft_shell' && o.observedOn >= from && o.observedOn <= date)
        .sort((a, b) => (b.observedOn + b.createdAt).localeCompare(a.observedOn + a.createdAt))[0];
    if (obs) {
        if (obs.level === 'many') {
            const counted = obs.count != null && obs.sampleSize != null;
            lines.push({
                key: 'soft',
                tone: 'amber',
                text: counted ? 'softMany' : 'softManyNoCount',
                params: { date: fmt(obs.observedOn), ...(counted ? { count: obs.count!, of: obs.sampleSize! } : {}) },
            });
        } else {
            lines.push({ key: 'soft', tone: 'green', text: 'softFirm' });
        }
    } else if ([0, 1, 2, 3].some((n) => windowContaining(windows, addDays(date, -n)))) {
        // In a window, or within 3 days after one, and nobody has looked.
        lines.push({ key: 'soft', tone: 'amber', text: 'softPrompt', prompt: true });
    }

    // Residues: re-evaluated server-side on every read (D3.4).
    const items = compliance?.items ?? [];
    const banned = latest(items.filter((i) => i.flag === 'banned'));
    const restricted = latest(items.filter((i) => i.flag === 'restricted'));
    if (banned) {
        lines.push({ key: 'residues', tone: 'red', text: 'banned', params: { substances: banned.substances.join(', '), date: fmt(banned.date.slice(0, 10)) } });
    } else if (restricted) {
        const day = restricted.date.slice(0, 10);
        // A period only when the catalogue carries a SOURCED one — never invented (D3.6).
        const sourced = restricted.substances
            .map((s) => ({ s, w: ingredients?.find((i) => i.bannedKey === slug(s) && i.withdrawalDays)?.withdrawalDays }))
            .find((x) => x.w);
        lines.push(
            sourced?.w
                ? {
                      key: 'residues',
                      tone: 'amber',
                      text: 'withdrawal',
                      params: {
                          substance: sourced.s,
                          date: fmt(day),
                          until: fmt(addDays(day, sourced.w.value)),
                          source: sourced.w.source.instrument,
                      },
                  }
                : { key: 'residues', tone: 'amber', text: 'restricted', params: { substances: restricted.substances.join(', '), date: fmt(day) } },
        );
    }

    return lines.some((l) => l.tone !== 'green') ? lines : [{ key: 'ready', tone: 'green', text: 'ready' }];
}
