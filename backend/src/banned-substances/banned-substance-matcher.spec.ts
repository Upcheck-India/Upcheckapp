import {
  findBannedSubstances,
  evaluateBannedSubstances,
} from './banned-substance-matcher';

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
