import { DiseaseWarningService, DiseaseIndicators } from './disease-warning.service';

const svc = new DiseaseWarningService(null as any, null as any);

const find = (risks: ReturnType<typeof svc.computeRisks>, d: string) =>
  risks.find((r) => r.disease === d)!;

describe('DiseaseWarningService — signatures (farmer_features_spec §2)', () => {
  it('each full signature scores 100 and bands Critical', () => {
    const full: DiseaseIndicators = {
      // WSSV
      tempDrop3in48h: true, doBelow4: true, seasonWinter: true, regionalWssv: true, redBody: true,
      // AHPND
      docBelow35: true, yellowVibrioUp: true, emptyGut: true, paleHp: true,
      // EHP
      sizeCvUp: true, adgBelowExpected: true, whiteFecesTray: true, regionWfd: true,
      // WFD
      vibrioUp: true, ehpRiskUp: true,
      // Luminous
      luminousVibrioUp: true, nightGlow: true,
      // RMS
      chronicDailyMortality: true, multiStress: true,
      // LSS
      looseShellObs: true, mineralDeficit: true, hpStress: true,
    };
    const risks = svc.computeRisks(full);
    for (const r of risks) {
      expect(r.score).toBe(100);
      expect(r.band).toBe('Critical');
    }
  });

  it('scores partial WSSV from its weighted indicators', () => {
    // tempDrop(.3) + season(.2) = .5 → 50, Watch
    const risks = svc.computeRisks({ tempDrop3in48h: true, seasonWinter: true });
    const wssv = find(risks, 'WSSV');
    expect(wssv.score).toBe(50);
    expect(wssv.band).toBe('Watch');
    expect(wssv.triggers).toEqual(['tempDrop3in48h', 'seasonWinter']);
  });

  it('Luminous fires hard on luminous vibrio alone (0.6 → Critical)', () => {
    const risks = svc.computeRisks({ luminousVibrioUp: true });
    expect(find(risks, 'Luminous').score).toBe(60);
    expect(find(risks, 'Luminous').band).toBe('Critical');
  });

  it('ranks diseases high→low; shared indicator weights each correctly', () => {
    // whiteFecesTray weights WFD .4 and EHP .25 → WFD ranks above EHP.
    const risks = svc.computeRisks({ whiteFecesTray: true });
    expect(find(risks, 'WFD').score).toBe(40);
    expect(find(risks, 'EHP').score).toBe(25);
    expect(risks[0].disease).toBe('WFD'); // highest first
    expect(risks.findIndex((r) => r.disease === 'WFD')).toBeLessThan(
      risks.findIndex((r) => r.disease === 'EHP'),
    );
  });

  it('low signal bands Low and carries no triggers', () => {
    const risks = svc.computeRisks({});
    expect(risks.every((r) => r.score === 0 && r.band === 'Low')).toBe(true);
    expect(risks[0].triggers).toEqual([]);
  });

  it('cumulativeRisk returns the top score as a 0..1 fraction', () => {
    expect(svc.cumulativeRisk({ luminousVibrioUp: true })).toBeCloseTo(0.6, 6);
    expect(svc.cumulativeRisk({})).toBe(0);
  });
});

describe('DiseaseWarningService — trend slope', () => {
  it('linearSlope sign and magnitude are correct', () => {
    expect(svc.linearSlope([1, 2, 3, 4])).toBeCloseTo(1, 6); // rising
    expect(svc.linearSlope([4, 3, 2, 1])).toBeCloseTo(-1, 6); // falling
    expect(svc.linearSlope([2, 2, 2])).toBe(0); // flat
    expect(svc.linearSlope([5])).toBe(0); // too few points
    expect(svc.linearSlope([0, 2, 4, 6, 8])).toBeCloseTo(2, 6); // slope 2
  });
});
