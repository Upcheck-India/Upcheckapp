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
});
