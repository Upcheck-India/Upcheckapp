/**
 * Banned / restricted aquaculture-substance guardrail (spec Requirement 18).
 *
 * India's CAA/MPEDA prohibits several antimicrobials in shrimp culture; their
 * presence triggers export rejection. This module detects references to such
 * substances in free text (treatment notes, product names) so the app can warn
 * the farmer — protectively and non-directively. It NEVER suggests an
 * alternative product to use instead (spec Requirement 4.2).
 *
 * The matcher is pure and offline. The seeded list mirrors the CAA prohibited
 * list; the backend list is authoritative and server-updatable. This is a
 * decision-support warning, not professional or legal advice.
 */

export type SubstanceCategory = 'banned' | 'restricted'

export interface BannedSubstance {
  /** Canonical display name. */
  name: string
  /** Lowercase match terms (whole-word, case-insensitive). */
  aliases: string[]
  category: SubstanceCategory
  /** Short, non-directive note (e.g. why restricted). */
  note?: string
}

/**
 * Seeded prohibited/restricted substances. Short or ambiguous abbreviations
 * (e.g. "CAP", "OTC") are intentionally omitted to avoid false positives.
 */
export const BANNED_SUBSTANCES: BannedSubstance[] = [
  { name: 'Chloramphenicol', aliases: ['chloramphenicol'], category: 'banned' },
  {
    name: 'Nitrofurans',
    aliases: [
      'nitrofuran',
      'nitrofurans',
      'furazolidone',
      'furaltadone',
      'nitrofurazone',
      'nitrofurantoin',
      'aoz',
      'amoz',
      'sem',
      'ahd',
    ],
    category: 'banned',
    note: 'Includes metabolites AOZ, AMOZ, SEM, AHD.',
  },
  {
    name: 'Fluoroquinolones',
    aliases: [
      'fluoroquinolone',
      'fluoroquinolones',
      'ciprofloxacin',
      'enrofloxacin',
      'norfloxacin',
      'ofloxacin',
      'pefloxacin',
      'sarafloxacin',
    ],
    category: 'banned',
  },
  {
    name: 'Nitroimidazoles',
    aliases: ['nitroimidazole', 'metronidazole', 'dimetridazole', 'ronidazole', 'ipronidazole'],
    category: 'banned',
  },
  { name: 'Colistin', aliases: ['colistin'], category: 'banned' },
  { name: 'Neomycin', aliases: ['neomycin'], category: 'banned' },
  { name: 'Nalidixic acid', aliases: ['nalidixic'], category: 'banned' },
  { name: 'Sulfamethoxazole', aliases: ['sulfamethoxazole'], category: 'banned' },
  { name: 'Chloroform', aliases: ['chloroform'], category: 'banned' },
  { name: 'Aristolochia', aliases: ['aristolochia'], category: 'banned' },
  {
    name: 'Oxytetracycline',
    aliases: ['oxytetracycline'],
    category: 'restricted',
    note: 'MRL-limited — observe the withdrawal period before harvest.',
  },
]

/** Escape a string for safe use inside a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Find every banned/restricted substance referenced in the given text.
 * Matching is case-insensitive and whole-word (so "neomycin" matches but a
 * substring inside an unrelated word does not). Returns each substance once.
 */
export function findBannedSubstances(
  text: string | null | undefined,
  list: BannedSubstance[] = BANNED_SUBSTANCES,
): BannedSubstance[] {
  if (!text) return []
  const haystack = text.toLowerCase()
  const found: BannedSubstance[] = []
  for (const sub of list) {
    const hit = sub.aliases.some((alias) => {
      const re = new RegExp(`\\b${escapeRegExp(alias.toLowerCase())}\\b`)
      return re.test(haystack)
    })
    if (hit) found.push(sub)
  }
  return found
}

/** Convenience boolean: does the text reference any banned/restricted substance? */
export function containsBannedSubstance(
  text: string | null | undefined,
  list: BannedSubstance[] = BANNED_SUBSTANCES,
): boolean {
  return findBannedSubstances(text, list).length > 0
}

export default { BANNED_SUBSTANCES, findBannedSubstances, containsBannedSubstance }
