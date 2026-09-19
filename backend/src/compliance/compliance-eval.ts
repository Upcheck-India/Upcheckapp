import { BadRequestException } from '@nestjs/common';
import {
  BANNED_LIST_VERSION,
  BANNED_SUBSTANCES,
  BannedSubstance,
} from '../banned-substances/banned-substances.data';
import {
  BannedSubstanceEvaluation,
  BannedSubstanceFlag,
  findBannedSubstances,
} from '../banned-substances/banned-substance-matcher';
import { INGREDIENTS_BY_KEY } from '../treatments/ingredients.data';

/**
 * Stable key of a banned-list entry, derived from its name at HEAD
 * ("Nalidixic acid" → "nalidixic_acid"). D1 (banned list v2) gives entries an
 * explicit `key`; switch to it then — the ingredient `bannedKey`s were chosen
 * to equal these slugs.
 */
export const bannedKeyOf = (s: Pick<BannedSubstance, 'name'>): string =>
  s.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export interface EvaluableRecord {
  ingredientKeys?: string[] | null;
  productName?: string | null;
  description?: string | null;
  notes?: string | null;
}

/**
 * The one server evaluation (D2): picked ingredients flag EXACTLY through
 * `bannedKey`; product name, description and notes still go through the text
 * matcher. Worst flag wins. `list` defaults to the live list, read at call
 * time, so a list change re-flags old records on the next read (D3.4).
 */
export function evaluateRecord(
  r: EvaluableRecord,
  list: BannedSubstance[] = BANNED_SUBSTANCES,
): BannedSubstanceEvaluation {
  const byKey = new Map(list.map((s) => [bannedKeyOf(s), s]));
  const picked = (r.ingredientKeys ?? [])
    .map((k) => INGREDIENTS_BY_KEY.get(k)?.bannedKey)
    .map((bk) => (bk ? byKey.get(bk) : undefined))
    .filter((s): s is BannedSubstance => !!s);
  const texted = findBannedSubstances(
    [r.productName, r.description, r.notes].filter(Boolean).join(' '),
    list,
  );
  const found = [...picked, ...texted];
  const flag: BannedSubstanceFlag = found.some((s) => s.category === 'banned')
    ? 'banned'
    : found.length
      ? 'restricted'
      : 'none';
  return { flag, matches: [...new Set(found.map((s) => s.name))] };
}

export const FLAG_RANK: Record<BannedSubstanceFlag, number> = {
  none: 0,
  restricted: 1,
  banned: 2,
};

export interface FlagHistoryEntry {
  at: string;
  /** User id, or 'system' for a re-evaluation against a newer list. */
  by: string;
  from: BannedSubstanceFlag;
  to: BannedSubstanceFlag;
  matches: string[];
  listVersion: string;
  reason?: string;
}

const sameSet = (a: string[] = [], b: string[] = []) =>
  a.length === b.length && a.every((x) => b.includes(x));

/**
 * The flag cannot be edited away silently (D3.3). Returns the new history, or
 * null when nothing changed. A person lowering the flag must say why:
 * 400 `REASON_REQUIRED` otherwise. The system (a list change) needs no reason.
 */
export function nextFlagHistory(
  prev: {
    flag: BannedSubstanceFlag;
    matches?: string[] | null;
    history?: FlagHistoryEntry[] | null;
  },
  next: BannedSubstanceEvaluation,
  by: string,
  reason?: string | null,
  now: Date = new Date(),
): FlagHistoryEntry[] | null {
  if (prev.flag === next.flag && sameSet(prev.matches ?? [], next.matches))
    return null;
  const why = reason?.trim();
  if (by !== 'system' && FLAG_RANK[next.flag] < FLAG_RANK[prev.flag] && !why) {
    throw new BadRequestException({
      statusCode: 400,
      code: 'REASON_REQUIRED',
      message: 'Lowering a banned-substance flag needs a flagChangeReason',
    });
  }
  return [
    ...(prev.history ?? []),
    {
      at: now.toISOString(),
      by,
      from: prev.flag,
      to: next.flag,
      matches: next.matches,
      listVersion: BANNED_LIST_VERSION,
      ...(why ? { reason: why } : {}),
    },
  ];
}
