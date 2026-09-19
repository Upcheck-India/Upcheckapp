/**
 * Banned / restricted aquaculture-substance guardrail (spec Requirement 18,
 * v2 spec D1).
 *
 * The list and the matcher are GENERATED from the backend
 * (`npm run gen:banned`), so the bundled offline copy and the server's
 * write-time check are the same code and data. The server list is fetched on
 * launch and cached (bannedSubstancesStore). Warn-only and non-directive: it
 * NEVER suggests an alternative product. Not professional or legal advice.
 */
import {
  BANNED_SUBSTANCES,
  BANNED_LIST_VERSION,
  BANNED_LIST_REVIEWED_ON,
  BANNED_LIST_REVIEWED_BY,
  type BannedSubstance,
  type BannedSource,
  type SubstanceCategory,
} from './bannedSubstances.generated'
import { matchSubstances } from './bannedSubstanceMatcher.generated'

export {
  BANNED_SUBSTANCES,
  BANNED_LIST_VERSION,
  BANNED_LIST_REVIEWED_ON,
  BANNED_LIST_REVIEWED_BY,
}
export type { BannedSubstance, BannedSource, SubstanceCategory }

/**
 * Every banned/restricted substance referenced in the text, once each.
 * Whole-token, any of the 6 app scripts, "sulpha" = "sulfa".
 */
export function findBannedSubstances(
  text: string | null | undefined,
  list: BannedSubstance[] = BANNED_SUBSTANCES,
): BannedSubstance[] {
  return matchSubstances(text, list)
}

/** Convenience boolean: does the text reference any banned/restricted substance? */
export function containsBannedSubstance(
  text: string | null | undefined,
  list: BannedSubstance[] = BANNED_SUBSTANCES,
): boolean {
  return findBannedSubstances(text, list).length > 0
}

/** Unique source instruments across a list, for the sources sheet. */
export function listSources(list: BannedSubstance[] = BANNED_SUBSTANCES): BannedSource[] {
  const seen = new Map<string, BannedSource>()
  for (const s of list) {
    for (const src of s.sources ?? []) {
      const id = `${src.instrument}|${src.url}`
      if (!seen.has(id)) seen.set(id, { authority: src.authority, instrument: src.instrument, url: src.url })
    }
  }
  return [...seen.values()]
}

export default { BANNED_SUBSTANCES, findBannedSubstances, containsBannedSubstance }
