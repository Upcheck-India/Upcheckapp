import {
  findBannedSubstances,
  evaluateBannedSubstances,
} from './banned-substance-matcher';
import { normalizeForMatch } from './banned-substance-matcher.core';
import { BANNED_SUBSTANCES } from './banned-substances.data';

const names = (text: string) => findBannedSubstances(text).map((s) => s.name);

describe('banned-substance-matcher v2 (spec D1)', () => {
  it('matches native-script aliases in every locale', () => {
    expect(names('आज क्लोरैम्फेनिकॉल डाला')).toEqual(['Chloramphenicol']);
    expect(names('చెరువులో క్లోరాంఫెనికాల్ వేశాము')).toEqual(['Chloramphenicol']);
    expect(names('குளோரம்பெனிகால் கொடுத்தோம்')).toEqual(['Chloramphenicol']);
    expect(names('ক্লোরামফেনিকল দেওয়া হয়েছে')).toEqual(['Chloramphenicol']);
    expect(names('କ୍ଲୋରାମଫେନିକଲ ଦିଆଗଲା')).toEqual(['Chloramphenicol']);
  });

  it('does not match a native alias that is only the start of a longer word', () => {
    // A trailing vowel sign (a combining mark) makes it a different word.
    expect(names('कोलिस्टिना')).toEqual([]);
  });

  it('matches the "sulpha" spelling via Latin ph→f', () => {
    expect(names('gave sulphamethoxazole 2g')).toEqual(['Sulfamethoxazole']);
    expect(names('SULPHONAMIDE powder')).toEqual(['Sulfonamides']);
  });

  it('matches known misspellings and hyphenated multi-word aliases', () => {
    expect(names('enrofloxacine')).toEqual(['Fluoroquinolones']);
    expect(names('furazolidon')).toEqual(['Nitrofurans']);
    expect(names('Chloramphenicole')).toEqual(['Chloramphenicol']);
    expect(names('nalidixic-acid')).toEqual(['Nalidixic acid']);
  });

  it('does not match the metabolite code "sem" inside a sentence', () => {
    expect(names('sem sample sent to lab')).toEqual([]);
    expect(names('AOZ AMOZ AHD')).toEqual([]);
  });

  it('keeps metabolite codes out of free-text aliases', () => {
    const codes = ['aoz', 'amoz', 'sem', 'ahd'];
    for (const s of BANNED_SUBSTANCES) {
      for (const a of s.aliases) expect(codes).not.toContain(a.toLowerCase());
    }
  });

  it('normalises NFC, case, punctuation and whitespace', () => {
    expect(normalizeForMatch('  Sulpha–Drug,\n  X ')).toBe('sulfa drug x');
    // Decomposed "é" (e + U+0301) equals composed "é" after NFC.
    expect(normalizeForMatch('é')).toBe('é');
  });

  it('reads an old-format list (aliases only, no localAliases)', () => {
    const legacy = [{ name: 'X', aliases: ['colistin'], category: 'banned' as const }];
    expect(
      findBannedSubstances('colistin', legacy as never).map((s) => s.name),
    ).toEqual(['X']);
  });
});

describe('banned-substances data integrity', () => {
  it('has unique keys', () => {
    const keys = BANNED_SUBSTANCES.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every entry cites a source with a URL, or is marked UNSOURCED', () => {
    for (const s of BANNED_SUBSTANCES) {
      if (s.sources.length === 0) {
        expect(s.note ?? '').toMatch(/^UNSOURCED/);
      } else {
        s.sources.forEach((src) => expect(src.url).toMatch(/^https:\/\//));
      }
    }
  });
});

describe('banned-substance-matcher (BANNED-1 write-time evaluation)', () => {
  describe('findBannedSubstances', () => {
    it('matches a banned substance whole-word, case-insensitively', () => {
      const found = findBannedSubstances('Applied Chloramphenicol 5ml today');
      expect(found.map((s) => s.name)).toEqual(['Chloramphenicol']);
    });

    it('does not match a substring inside an unrelated word', () => {
      // "colistin" must not match inside "chocolate-tinted" or similar false positives.
      const found = findBannedSubstances('chocolate tinted feed pellets');
      expect(found).toHaveLength(0);
    });

    it('matches a restricted (not outright banned) substance', () => {
      const found = findBannedSubstances('Used oxytetracycline before harvest');
      expect(found.map((s) => s.name)).toEqual(['Oxytetracycline']);
      expect(found[0].category).toBe('restricted');
    });

    it('returns nothing for clean text', () => {
      expect(findBannedSubstances('Applied probiotics and lime')).toHaveLength(0);
    });

    it('returns nothing for null/undefined/empty text', () => {
      expect(findBannedSubstances(null)).toHaveLength(0);
      expect(findBannedSubstances(undefined)).toHaveLength(0);
      expect(findBannedSubstances('')).toHaveLength(0);
    });
  });

  describe('evaluateBannedSubstances', () => {
    it('flags "banned" when any matched substance is in the banned category', () => {
      const result = evaluateBannedSubstances('Description text', 'Notes mention colistin');
      expect(result.flag).toBe('banned');
      expect(result.matches).toEqual(['Colistin']);
    });

    it('flags "restricted" when only restricted substances match', () => {
      const result = evaluateBannedSubstances('Oxytetracycline dose', null);
      expect(result.flag).toBe('restricted');
      expect(result.matches).toEqual(['Oxytetracycline']);
    });

    it('flags "none" when nothing matches across any of the fields', () => {
      const result = evaluateBannedSubstances('Probiotic application', 'Water exchange done');
      expect(result.flag).toBe('none');
      expect(result.matches).toEqual([]);
    });

    it('combines multiple text fields and dedupes repeated matches', () => {
      const result = evaluateBannedSubstances(
        'Treated with colistin',
        'Follow-up colistin dose administered',
      );
      expect(result.flag).toBe('banned');
      expect(result.matches).toEqual(['Colistin']); // deduped, not ['Colistin', 'Colistin']
    });

    it('ignores null/undefined fields mixed with a real one', () => {
      const result = evaluateBannedSubstances(undefined, null, 'neomycin applied');
      expect(result.flag).toBe('banned');
      expect(result.matches).toEqual(['Neomycin']);
    });
  });
});
