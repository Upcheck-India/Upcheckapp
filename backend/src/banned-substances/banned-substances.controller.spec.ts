import { BannedSubstancesController } from './banned-substances.controller';

describe('BannedSubstancesController', () => {
  const controller = new BannedSubstancesController();

  it('serves a versioned, non-empty authoritative list', () => {
    const res = controller.list();
    expect(res.version).toBeTruthy();
    expect(res.substances.length).toBeGreaterThan(0);
    // Chloramphenicol is a hard CAA ban — must always be present.
    expect(
      res.substances.some(
        (s) => s.name === 'Chloramphenicol' && s.category === 'banned',
      ),
    ).toBe(true);
  });

  it('stays readable by old app builds (name, aliases: string[], category)', () => {
    for (const s of controller.list().substances) {
      expect(typeof s.name).toBe('string');
      expect(['banned', 'restricted']).toContain(s.category);
      expect(Array.isArray(s.aliases)).toBe(true);
      expect(s.aliases.length).toBeGreaterThan(0);
      s.aliases.forEach((a) => expect(typeof a).toBe('string'));
    }
  });
});
