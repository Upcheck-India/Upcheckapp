/**
 * Authoritative CAA/MPEDA prohibited/restricted aquaculture-substance list
 * (BANNED-1). Serving this from the backend lets the list change with a server
 * deploy — NOT an app-store release — and lets the client hydrate + cache it
 * offline. Decision-support only; never legal advice, never suggests an
 * alternative substance.
 *
 * Bump `BANNED_LIST_VERSION` whenever the list changes so clients can cheaply
 * detect an update.
 */
export type SubstanceCategory = 'banned' | 'restricted';

export interface BannedSubstance {
  name: string;
  aliases: string[];
  category: SubstanceCategory;
  note?: string;
}

export const BANNED_LIST_VERSION = '2026-07-08';

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
    aliases: [
      'nitroimidazole',
      'metronidazole',
      'dimetridazole',
      'ronidazole',
      'ipronidazole',
    ],
    category: 'banned',
  },
  { name: 'Colistin', aliases: ['colistin'], category: 'banned' },
  { name: 'Neomycin', aliases: ['neomycin'], category: 'banned' },
  { name: 'Nalidixic acid', aliases: ['nalidixic'], category: 'banned' },
  {
    name: 'Sulfamethoxazole',
    aliases: ['sulfamethoxazole'],
    category: 'banned',
  },
  { name: 'Chloroform', aliases: ['chloroform'], category: 'banned' },
  { name: 'Aristolochia', aliases: ['aristolochia'], category: 'banned' },
  {
    name: 'Oxytetracycline',
    aliases: ['oxytetracycline'],
    category: 'restricted',
    note: 'MRL-limited — observe the withdrawal period before harvest.',
  },
];
