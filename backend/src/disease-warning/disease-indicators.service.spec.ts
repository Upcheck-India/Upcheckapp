import { DiseaseIndicatorsService } from './disease-indicators.service';
import { DiseaseWarningService } from './disease-warning.service';

const NOW = new Date('2026-09-19T06:30:00Z'); // 12:00 IST, September (not winter)
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

type Rows = Partial<Record<'temps' | 'obs' | 'micro' | 'sampling' | 'mortality' | 'treatments' | 'bio', any[] | Error>>;

function make(rows: Rows = {}) {
  const pick = (k: keyof Rows) => {
    const v = rows[k];
    if (v instanceof Error) throw v;
    return v ?? [];
  };
  const query = jest.fn(async (sql: string) => {
    if (sql.includes('water_quality_records')) return pick('temps');
    if (sql.includes('health_observations')) return pick('obs');
    if (sql.includes('microbiology_data')) return pick('micro');
    if (sql.includes('sampling_data')) return pick('sampling');
    if (sql.includes('mortality_records')) return pick('mortality');
    if (sql.includes('FROM treatments')) return pick('treatments');
    if (sql.includes('biosecurity_checks')) return pick('bio');
    throw new Error(`unexpected SQL: ${sql}`);
  });
  const svc = new DiseaseIndicatorsService(
    { query } as any,
    new DiseaseWarningService(null as any, null as any),
    null as any,
    null as any,
  );
  return { svc, query };
}

const ctx = (over: any = {}): any => ({
  pondId: 'p1', farmId: 'f1', cropId: 'c1', species: 'vannamei', doc: null, waterQuality: null, ...over,
});
const missing = () => Object.assign(new Error('relation does not exist'), { code: '42P01' });

const derive1 = async (rows: Rows, c: any = ctx()) => {
  const { svc } = make(rows);
  return (await svc.derive([c], NOW)).get(c.pondId)!;
};

describe('DiseaseIndicatorsService.derive (D7)', () => {
  it('a fixed number of queries, whatever the pond count', async () => {
    const one = make();
    await one.svc.derive([ctx()], NOW);
    const five = make();
    await five.svc.derive(
      ['p1', 'p2', 'p3', 'p4', 'p5'].map((p, i) => ctx({ pondId: p, cropId: `c${i}` })),
      NOW,
    );
    expect(one.query.mock.calls.length).toBe(7);
    expect(five.query.mock.calls.length).toBe(one.query.mock.calls.length);
  });

  it('no data → unknown, not false (only the calendar is known)', async () => {
    const { indicators } = await derive1({});
    expect(indicators).toEqual({ seasonWinter: false });
  });

  it('a table not migrated yet reads as unknown, never throws', async () => {
    const { indicators } = await derive1({ obs: missing(), bio: missing() });
    expect(indicators.redBody).toBeUndefined();
    expect(indicators.entryRisk).toBeUndefined();
  });

  describe('tempDrop', () => {
    it('fell ≥ 2 °C between readings < 24 h apart → true, with the drop and IST day', async () => {
      const r = await derive1({ temps: [
        { pondId: 'p1', at: hoursAgo(20), t: 30.5 },
        { pondId: 'p1', at: hoursAgo(14), t: 28.1 }, // 22:00 IST on the 18th
      ] });
      expect(r.indicators.tempDrop3in48h).toBe(true);
      expect(r.evidence.tempDrop3in48h).toEqual({ key: 'engines.disease.why_tempDrop3in48h', params: { drop: 2.4, date: '18/09' } });
    });
    it('the same drop over ≥ 24 h, or a 1.9 °C drop → false', async () => {
      expect((await derive1({ temps: [
        { pondId: 'p1', at: hoursAgo(50), t: 30.5 },
        { pondId: 'p1', at: hoursAgo(2), t: 28.1 },
      ] })).indicators.tempDrop3in48h).toBe(false);
      expect((await derive1({ temps: [
        { pondId: 'p1', at: hoursAgo(5), t: 30 },
        { pondId: 'p1', at: hoursAgo(2), t: 28.1 },
      ] })).indicators.tempDrop3in48h).toBe(false);
    });
    it('a single reading → unknown', async () => {
      expect((await derive1({ temps: [{ pondId: 'p1', at: hoursAgo(2), t: 28 }] })).indicators.tempDrop3in48h).toBeUndefined();
    });
  });

  it('chronicMortality: ≥ 5 of the last 7 days true; fewer false; none logged unknown', async () => {
    expect((await derive1({ mortality: [{ cropId: 'c1', days: 5 }] })).indicators.chronicDailyMortality).toBe(true);
    expect((await derive1({ mortality: [{ cropId: 'c1', days: 4 }] })).indicators.chronicDailyMortality).toBe(false);
    expect((await derive1({})).indicators.chronicDailyMortality).toBeUndefined();
  });

  it('sizeCv: latest std/mbw > 0.30', async () => {
    expect((await derive1({ sampling: [{ cropId: 'c1', day: '2026-09-18', mbw: 4, sd: 1.5 }] })).indicators.sizeCvUp).toBe(true);
    expect((await derive1({ sampling: [{ cropId: 'c1', day: '2026-09-18', mbw: 4, sd: 1.2 }] })).indicators.sizeCvUp).toBe(false);
    expect((await derive1({ sampling: [{ cropId: 'c1', day: '2026-09-18', mbw: 4, sd: null }] })).indicators.sizeCvUp).toBeUndefined();
  });

  it('adgLow: < 0.1 g/d between the last two samplings, only after DOC 30', async () => {
    const sampling = [
      { cropId: 'c1', day: '2026-09-18', mbw: 5.5, sd: null },
      { cropId: 'c1', day: '2026-09-08', mbw: 5.0, sd: null },
    ];
    expect((await derive1({ sampling }, ctx({ doc: 45 }))).indicators.adgBelowExpected).toBe(true);
    expect((await derive1({ sampling }, ctx({ doc: 25 }))).indicators.adgBelowExpected).toBe(false);
    expect((await derive1({ sampling: sampling.slice(0, 1) }, ctx({ doc: 45 }))).indicators.adgBelowExpected).toBeUndefined();
  });

  describe('mineralDeficit (D2 category)', () => {
    const lowAlk = ctx({ waterQuality: { alkalinity: 80, alkalinityAsOf: hoursAgo(24) } });
    it('no mineral treatment in 14 d and alkalinity < 100 → true', async () => {
      expect((await derive1({}, lowAlk)).indicators.mineralDeficit).toBe(true);
    });
    it('a mineral-category treatment → false', async () => {
      const treatments = [{ cropId: 'c1', category: 'mineral', ingredientKeys: [], description: null, notes: null }];
      expect((await derive1({ treatments }, lowAlk)).indicators.mineralDeficit).toBe(false);
    });
    it('an antimicrobial that merely mentions potassium is not a mineral dose → still true', async () => {
      const treatments = [{ cropId: 'c1', category: 'antimicrobial', ingredientKeys: [], description: 'potassium salt', notes: null }];
      expect((await derive1({ treatments }, lowAlk)).indicators.mineralDeficit).toBe(true);
    });
    it('alkalinity ≥ 100 → false; no recent alkalinity → unknown', async () => {
      expect((await derive1({}, ctx({ waterQuality: { alkalinity: 120, alkalinityAsOf: hoursAgo(24) } }))).indicators.mineralDeficit).toBe(false);
      expect((await derive1({}, ctx({ waterQuality: { alkalinity: 80, alkalinityAsOf: hoursAgo(24 * 20) } }))).indicators.mineralDeficit).toBeUndefined();
    });
  });

  describe('entryRisk (D5)', () => {
    it('prep < 50 % done → true', async () => {
      const r = await derive1({ bio: [{ cropId: 'c1', pcr: { wssv: 'negative' }, prepDone: 2 }] });
      expect(r.indicators.entryRisk).toBe(true);
      expect(r.evidence.entryRisk).toEqual({ key: 'engines.disease.why_entryRisk_prep', params: { done: 2, total: 6 } });
    });
    it('prep done but seed WSSV not tested → true', async () => {
      const r = await derive1({ bio: [{ cropId: 'c1', pcr: { wssv: 'not_tested' }, prepDone: 4 }] });
      expect(r.evidence.entryRisk?.key).toBe('engines.disease.why_entryRisk_not_tested');
    });
    it('prep done and seed negative → false; seed unknown → unknown', async () => {
      expect((await derive1({ bio: [{ cropId: 'c1', pcr: { wssv: 'negative' }, prepDone: 3 }] })).indicators.entryRisk).toBe(false);
      expect((await derive1({ bio: [{ cropId: 'c1', pcr: null, prepDone: 6 }] })).indicators.entryRisk).toBeUndefined();
    });
  });

  it('health observations: seen → true, only "checked, none" → false, unchecked → unknown', async () => {
    const r = await derive1({ obs: [
      { pondId: 'p1', sign: 'red_body', level: 'few', day: '2026-09-18' },
      { pondId: 'p1', sign: 'empty_gut', level: 'none', day: '2026-09-19' },
    ] });
    expect(r.indicators.redBody).toBe(true);
    expect(r.indicators.emptyGut).toBe(false);
    expect(r.indicators.paleHp).toBeUndefined();
  });

  it('microbiology: yellow > 10³, TVC ×10, luminescent > 0, within 7 days', async () => {
    const r = await derive1({ micro: [
      { cropId: 'c1', day: '2026-09-17', tvc: 5000, yellow: 1500, green: 100, lum: 20 },
      { cropId: 'c1', day: '2026-09-10', tvc: 400, yellow: 100, green: 10, lum: 0 },
    ] });
    expect(r.indicators).toMatchObject({ yellowVibrioUp: true, vibrioUp: true, luminousVibrioUp: true });
    const stale = await derive1({ micro: [{ cropId: 'c1', day: '2026-09-01', tvc: 5000, yellow: 1500, green: 100, lum: 20 }] });
    expect(stale.indicators.yellowVibrioUp).toBeUndefined();
  });

  it('doBelow4 only from a DO logged within 24 h', async () => {
    expect((await derive1({}, ctx({ waterQuality: { dissolvedOxygen: 3.5, dissolvedOxygenAsOf: hoursAgo(3) } }))).indicators.doBelow4).toBe(true);
    expect((await derive1({}, ctx({ waterQuality: { dissolvedOxygen: 3.5, dissolvedOxygenAsOf: hoursAgo(30) } }))).indicators.doBelow4).toBeUndefined();
  });

  it('assess scores the derived set and reports overall coverage', async () => {
    const { svc } = make({ mortality: [{ cropId: 'c1', days: 6 }] });
    const a = (await svc.assess([ctx()], NOW)).get('p1')!;
    expect(a.risks.find((r) => r.disease === 'RMS')!.score).toBe(50);
    expect(a.coverage.known).toBe(2); // season + chronic mortality
    expect(a.coverage.total).toBeGreaterThan(20);
  });
});
