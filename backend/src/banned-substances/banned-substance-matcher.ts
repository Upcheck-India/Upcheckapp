import { BANNED_SUBSTANCES, BannedSubstance } from './banned-substances.data';

/**
 * Server-side banned-substance evaluation (BANNED-1 write-time flag).
 *
 * Mirrors the frontend's client-only matcher
 * (frontend/src/features/bannedSubstances.ts) EXACTLY — same whole-word,
 * case-insensitive regex approach — so client and server never disagree on
 * what counts as a match (the same PWDVAL-1 lesson: two independent
 * implementations of "the same rule" must be kept in lockstep, or tested
 * against each other, not just each trusted alone). This is the authoritative
 * evaluation: it runs against the server's own BANNED_SUBSTANCES list at
 * write time, regardless of what (if anything) the client detected or sent —
 * a client that skips its own check, is offline-stale, or is deliberately
 * bypassed cannot suppress this flag.
 */
export type BannedSubstanceFlag = 'none' | 'restricted' | 'banned';

export interface BannedSubstanceEvaluation {
  flag: BannedSubstanceFlag;
  /** Canonical names of every matched substance (banned AND restricted). */
  matches: string[];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whole-word, case-insensitive substance matching against the given text. */
export function findBannedSubstances(
  text: string | null | undefined,
  list: BannedSubstance[] = BANNED_SUBSTANCES,
): BannedSubstance[] {
  if (!text) return [];
  const haystack = text.toLowerCase();
  const found: BannedSubstance[] = [];
  for (const sub of list) {
    const hit = sub.aliases.some((alias) => {
      const re = new RegExp(`\\b${escapeRegExp(alias.toLowerCase())}\\b`);
      return re.test(haystack);
    });
    if (hit) found.push(sub);
  }
  return found;
}

/**
 * Evaluate one or more free-text fields together (e.g. description + notes)
 * and return the single worst flag ('banned' > 'restricted' > 'none') plus
 * every matched substance name, deduplicated.
 */
export function evaluateBannedSubstances(
  ...texts: Array<string | null | undefined>
): BannedSubstanceEvaluation {
  const combined = texts.filter(Boolean).join(' ');
  const found = findBannedSubstances(combined);
  const matches = [...new Set(found.map((s) => s.name))];
  const flag: BannedSubstanceFlag = found.some((s) => s.category === 'banned')
    ? 'banned'
    : found.length > 0
      ? 'restricted'
      : 'none';
  return { flag, matches };
}
