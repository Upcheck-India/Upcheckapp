import {
  ALL_INDICATORS,
  DISEASES,
  DiseaseWarningService,
  DiseaseIndicators,
  IndicatorKey,
  NOT_DERIVABLE,
} from './disease-warning.service';

const svc = new DiseaseWarningService(null as any, null as any);

const find = (risks: ReturnType<typeof svc.computeRisks>, d: string) =>
  risks.find((r) => r.disease === d)!;

describe('DiseaseWarningService — signatures (farmer_features_spec §2)', () => {
  it('each full signature scores 100 and bands Critical', () => {
    const full: DiseaseIndicators = {
      // WSSV
      tempDrop3in48h: true,
      doBelow4: true,
      seasonWinter: true,
      regionalWssv: true,
      redBody: true,
      entryRisk: true,
      // AHPND
      docBelow35: true,
      yellowVibrioUp: true,
      emptyGut: true,
      paleHp: true,
      // EHP
      sizeCvUp: true,
      adgBelowExpected: true,
      whiteFecesTray: true,
      regionWfd: true,
      // WFD
      vibrioUp: true,
      ehpRiskUp: true,
      // Luminous
      luminousVibrioUp: true,
      nightGlow: true,
      // RMS
      chronicDailyMortality: true,
      multiStress: true,
      // LSS
      looseShellObs: true,
      mineralDeficit: true,
      hpStress: true,
    };
    const risks = svc.computeRisks(full);
    for (const r of risks) {
      expect(r.score).toBe(100);
      expect(r.band).toBe('Critical');
    }
  });

  it('scores partial WSSV from its weighted indicators', () => {
    // tempDrop(.3) + season(.1) = .4 → 40, Watch
    const risks = svc.computeRisks({
      tempDrop3in48h: true,
      seasonWinter: true,
    });
    const wssv = find(risks, 'WSSV');
    expect(wssv.score).toBe(40);
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

describe('DiseaseWarningService — D7 reachability, unknowns, keys', () => {
  const derivable = (keys: IndicatorKey[]) =>
    keys.filter((k) => !NOT_DERIVABLE.includes(k) && k !== 'ehpRiskUp');

  it.each(DISEASES)('%s can reach Critical (≥ 60) from derivable indicators alone', (d) => {
    const own = derivable(
      ALL_INDICATORS.filter((k) => find(svc.computeRisks({ [k]: true }), d).triggers.includes(k)),
    );
    const ind: DiseaseIndicators = Object.fromEntries(own.map((k) => [k, true]));
    const r = find(svc.computeRisks(ind), d);
    expect(r.score).toBeGreaterThanOrEqual(60);
    expect(r.band).toBe('Critical');
  });

  it('no data → every indicator unknown: coverage 0 of n, not a false negative', () => {
    for (const r of svc.computeRisks({})) {
      expect(r.coverage.known).toBe(0);
      expect(r.coverage.total).toBeGreaterThan(0);
    }
    // Known false counts as known.
    expect(find(svc.computeRisks({ luminousVibrioUp: false }), 'Luminous').coverage).toEqual({ known: 1, total: 2 });
  });

  it('ehpRiskUp: true when EHP ≥ 30; false only when EHP cannot reach 30; else unknown', () => {
    const up = svc.computeRisks({ sizeCvUp: true, adgBelowExpected: true });
    expect(find(up, 'WFD').triggers).toContain('ehpRiskUp');
    const low = svc.computeRisks({ sizeCvUp: false, adgBelowExpected: false, whiteFecesTray: false });
    expect(find(low, 'WFD').coverage.known).toBe(2); // whiteFeces + ehpRiskUp(false)
    expect(find(svc.computeRisks({ sizeCvUp: false }), 'WFD').coverage.known).toBe(0);
  });

  it('carries trigger + step keys; evidence params ride on the trigger key', () => {
    const r = find(
      svc.computeRisks(
        { tempDrop3in48h: true },
        { tempDrop3in48h: { key: 'engines.disease.why_tempDrop3in48h', params: { drop: 2.4, date: '18/09' } } },
      ),
      'WSSV',
    );
    expect(r.triggerKeys).toEqual([{ key: 'engines.disease.why_tempDrop3in48h', params: { drop: 2.4, date: '18/09' } }]);
    expect(r.stepKeys.map((k) => k.key)).toEqual(r.steps.map((_, i) => `engines.disease.step_WSSV_${i}`));
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
