import { DiseaseAlertService, DISEASE_PUSH_EVERY_MS } from './disease-alert.service';

const OWNER = 'owner-1';
const MANAGER = 'manager-1';

/** Fake DB whose `alerts` table is what the service itself writes. */
function make() {
  const rows: { pondId: string; disease: string; createdAt: Date }[] = [];
  let clock = new Date('2026-09-19T06:30:00Z');
  const query = jest.fn(async (sql: string, params: any[]) => {
    if (sql.includes("type = 'disease'")) {
      const since: Date = params[1];
      return rows
        .filter((r) => params[0].includes(r.pondId) && r.createdAt > since)
        .map((r) => ({ pondId: r.pondId, disease: r.disease }));
    }
    if (sql.includes('FROM ponds p')) return [{ pondId: 'p1', pondName: 'Pond 3', farmId: 'f1', ownerId: OWNER }];
    if (sql.includes('FROM farm_members')) return [{ farmId: 'f1', userId: MANAGER }];
    if (sql.includes('FROM profiles')) return [{ id: MANAGER, lang: 'te' }];
    return [];
  });
  const alerts = {
    create: jest.fn(async (a: any) => {
      rows.push({ pondId: a.pondId, disease: a.data.disease, createdAt: clock });
      return a;
    }),
  };
  const push = { sendToUser: jest.fn().mockResolvedValue(true) };
  const svc = new DiseaseAlertService({ query } as any, alerts as any, push as any);
  return {
    svc, alerts, push,
    at: (d: Date) => (clock = d),
    now: () => clock,
  };
}

describe('DiseaseAlertService (D7 push dedup)', () => {
  const crit = [{ pondId: 'p1', disease: 'WSSV' as const }];

  it('pushes owner + manager once; the recipient language is used', async () => {
    const m = make();
    expect(await m.svc.notify(crit, m.now())).toBe(2);
    expect(m.push.sendToUser.mock.calls.map((c) => c[0]).sort()).toEqual([MANAGER, OWNER]);
    const toManager = m.push.sendToUser.mock.calls.find((c) => c[0] === MANAGER)![1];
    // C5.2: the push itself carries no pond name or disease name.
    expect(toManager.title).not.toContain('Pond 3');
    expect(toManager.title).not.toContain('risk is high');
    expect(toManager.title).toBe('వ్యాధి ప్రమాద హెచ్చరిక'); // recipient reads Telugu
    expect(m.alerts.create.mock.calls[0][0]).toMatchObject({ type: 'disease', severity: 'critical', isRead: true });
  });

  it('once per (pond, disease) per 3 days', async () => {
    const m = make();
    const t0 = m.now();
    await m.svc.notify(crit, t0);
    m.at(new Date(t0.getTime() + DISEASE_PUSH_EVERY_MS - 60_000)); // just under 3 days
    expect(await m.svc.notify(crit, m.now())).toBe(0);
    // A different disease on the same pond is its own alert.
    expect(await m.svc.notify([{ pondId: 'p1', disease: 'EHP' }], m.now())).toBe(2);
    m.at(new Date(t0.getTime() + DISEASE_PUSH_EVERY_MS + 60_000)); // past 3 days
    expect(await m.svc.notify(crit, m.now())).toBe(2);
    expect(m.push.sendToUser).toHaveBeenCalledTimes(6);
  });

  it('never throws', async () => {
    const svc = new DiseaseAlertService(
      { query: jest.fn().mockRejectedValue(new Error('db down')) } as any,
      {} as any,
      {} as any,
    );
    await expect(svc.notify(crit)).resolves.toBe(0);
  });
});
