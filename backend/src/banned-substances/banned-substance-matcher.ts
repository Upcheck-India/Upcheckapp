import { BANNED_SUBSTANCES, BannedSubstance } from './banned-substances.data';
import {
  BannedSubstanceFlag,
  flagOf,
  matchSubstances,
} from './banned-substance-matcher.core';

/**
 * Server-side banned-substance evaluation (BANNED-1 write-time flag). This is
 * the authoritative evaluation: it runs against the server's own list at write
 * time, whatever the client detected or sent. The matching itself lives in
 * banned-substance-matcher.core.ts, which the app gets a generated copy of, so
 * client and server cannot drift (spec D1).
 */
export type { BannedSubstanceFlag };

export interface BannedSubstanceEvaluation {
  flag: BannedSubstanceFlag;
  /** Canonical names of every matched substance (banned AND restricted). */
  matches: string[];
}

export function findBannedSubstances(
  text: string | null | undefined,
  list: BannedSubstance[] = BANNED_SUBSTANCES,
): BannedSubstance[] {
  return matchSubstances(text, list);
}

/**
 * Evaluate one or more free-text fields together (e.g. description + notes)
 * and return the single worst flag ('banned' > 'restricted' > 'none') plus
 * every matched substance name, deduplicated.
 */
export function evaluateBannedSubstances(
  ...texts: Array<string | null | undefined>
): BannedSubstanceEvaluation {
  const found = findBannedSubstances(texts.filter(Boolean).join(' '));
  return {
    flag: flagOf(found),
    matches: [...new Set(found.map((s) => s.name))],
  };
}
