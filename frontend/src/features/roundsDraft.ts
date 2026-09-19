/**
 * The morning-rounds grid's unsaved draft.
 *
 * A farmer halfway down ten ponds who closes the screen — by accident, a call,
 * or on purpose — must get their readings back. And a draft must never become
 * a bug, so every rule below exists to stop an OLD or FOREIGN draft from being
 * submitted as today's:
 *
 *  • Keyed by user AND IST day: `morning-rounds:draft:<userId>:<YYYY-MM-DD>`.
 *    Another account on a shared phone never reads it, and it is wiped on
 *    sign-out (authStore.clearSession).
 *  • Only today's draft restores. Older ones are deleted unread on open —
 *    readings are time-sensitive, and yesterday's DO is not this morning's.
 *  • A row restores only with a valid, today-dated `editedAt`, which becomes
 *    its `recordedAt` on submit (the time it was read, not restored).
 *  • Rows for ponds the user no longer has, and cells that do not parse, are
 *    dropped. Anything unreadable → start empty. It never throws.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { istDate } from './dailyBriefText';

export type ColKey = 'ph' | 'dissolvedOxygen' | 'temperature';
export const COL_KEYS: ColKey[] = ['ph', 'dissolvedOxygen', 'temperature'];

/**
 * One grid cell. `prefillAt` marks a value copied from the pond's last reading
 * (and when that reading was taken); such a cell does not count as entered
 * until the farmer edits it (which drops `prefillAt`) or confirms it (`ok`).
 */
export interface Cell {
    v: string;
    prefillAt?: string;
    ok?: boolean;
}

export interface Row {
    cells: Partial<Record<ColKey, Cell>>;
    /** When the farmer last typed in / confirmed this row — the reading time. */
    editedAt?: string;
    /** Client-minted record id, fixed once a save is attempted (idempotent retry). */
    id?: string;
    /** Came back from a draft — submit with editedAt, not press time. */
    restored?: boolean;
}

export type Rows = Record<string, Row>;

export interface Draft {
    savedAt: string | null;
    rows: Rows;
}

const PREFIX = 'morning-rounds:draft:';

export const draftKey = (userId: string, now: Date = new Date()): string =>
    `${PREFIX}${userId}:${istDate(now)}`;

/** Entered by the farmer (typed, or a prefill they confirmed). */
export const cellCounts = (cell: Cell | undefined): boolean =>
    !!cell && cell.v.trim() !== '' && (!cell.prefillAt || cell.ok === true);

const hasEntries = (rows: Rows): boolean =>
    Object.values(rows).some((r) => COL_KEYS.some((k) => cellCounts(r.cells[k])));

const validIso = (s: unknown): s is string =>
    typeof s === 'string' && !Number.isNaN(Date.parse(s));

const cleanCell = (raw: any): Cell | null => {
    if (!raw || typeof raw !== 'object' || typeof raw.v !== 'string') return null;
    // '' is a real state (a prefill the farmer cleared); anything else must be
    // a number, or it is junk that must never reach a payload.
    if (raw.v.trim() !== '' && !Number.isFinite(Number(raw.v))) return null;
    const cell: Cell = { v: raw.v };
    if (raw.prefillAt !== undefined) {
        // A prefill whose date is unreadable could pass for typed data — drop it.
        if (!validIso(raw.prefillAt)) return null;
        cell.prefillAt = raw.prefillAt;
        if (raw.ok === true) cell.ok = true;
    }
    return cell;
};

/** Parsed draft → only what is safe to put back on screen today. */
export const sanitizeDraft = (
    parsed: any,
    userId: string,
    pondIds: ReadonlySet<string>,
    now: Date = new Date(),
): Draft | null => {
    if (!parsed || typeof parsed !== 'object' || parsed.userId !== userId) return null;
    if (!parsed.rows || typeof parsed.rows !== 'object') return null;
    const today = istDate(now);
    const rows: Rows = {};
    for (const [pondId, raw] of Object.entries<any>(parsed.rows)) {
        if (!pondIds.has(pondId) || !raw || typeof raw !== 'object') continue;
        if (!validIso(raw.editedAt) || istDate(new Date(raw.editedAt)) !== today) continue;
        const cells: Row['cells'] = {};
        for (const k of COL_KEYS) {
            const cell = cleanCell(raw.cells?.[k]);
            if (cell) cells[k] = cell;
        }
        if (!COL_KEYS.some((k) => cellCounts(cells[k]))) continue;
        rows[pondId] = {
            cells,
            editedAt: raw.editedAt,
            restored: true,
            ...(typeof raw.id === 'string' ? { id: raw.id } : {}),
        };
    }
    if (Object.keys(rows).length === 0) return null;
    return { savedAt: validIso(parsed.savedAt) ? parsed.savedAt : null, rows };
};

/**
 * Today's draft for this user, or null. Deletes this user's drafts from any
 * other day first, unread.
 */
export async function loadDraft(
    userId: string,
    pondIds: ReadonlySet<string>,
    now: Date = new Date(),
): Promise<Draft | null> {
    const key = draftKey(userId, now);
    try {
        const mine = `${PREFIX}${userId}:`;
        const stale = (await AsyncStorage.getAllKeys()).filter(
            (k) => k.startsWith(mine) && k !== key,
        );
        if (stale.length) await AsyncStorage.multiRemove(stale);
    } catch {
        /* cleanup is best-effort; today's key is still read below */
    }
    try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) return null;
        return sanitizeDraft(JSON.parse(raw), userId, pondIds, now);
    } catch {
        return null; // corrupt JSON / storage error → start empty
    }
}

/** Persist the grid, or remove the draft when nothing in it is the farmer's own. */
export async function saveDraft(userId: string, rows: Rows, now: Date = new Date()): Promise<void> {
    try {
        const key = draftKey(userId, now);
        if (!hasEntries(rows)) {
            await AsyncStorage.removeItem(key);
            return;
        }
        await AsyncStorage.setItem(
            key,
            JSON.stringify({ userId, savedAt: now.toISOString(), rows }),
        );
    } catch {
        /* a draft we could not write must never affect the screen */
    }
}

export async function clearDraft(userId: string, now: Date = new Date()): Promise<void> {
    try {
        await AsyncStorage.removeItem(draftKey(userId, now));
    } catch {
        /* ignore */
    }
}

/** Sign-out: every account's rounds drafts go with the session. */
export async function clearAllDrafts(): Promise<void> {
    try {
        const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
        if (keys.length) await AsyncStorage.multiRemove(keys);
    } catch {
        /* ignore */
    }
}
