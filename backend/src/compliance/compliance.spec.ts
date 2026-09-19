import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BANNED_SUBSTANCES } from '../banned-substances/banned-substances.data';
import { INGREDIENTS } from '../treatments/ingredients.data';
import { TreatmentsService } from '../treatments/treatments.service';
import { Treatment } from '../treatments/treatment.entity';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { InventoryService } from '../inventory/inventory.service';
import { bannedKeyOf, evaluateRecord, nextFlagHistory } from './compliance-eval';
import { ComplianceService } from './compliance.service';

const OWNER = 'owner-1';
const MANAGER = 'manager-1';
const WORKER = 'worker-1';

/**
 * Fake database for ComplianceService: `seen` = compliance alerts already
 * raised (recordId|flag), plus the rows a cycle read returns.
 */
function makeCompliance(opts: {
  seen?: Set<string>;
  treatments?: any[];
  diseases?: any[];
  failAll?: boolean;
} = {}) {
  const seen = opts.seen ?? new Set<string>();
  const updates: any[][] = [];
  const query = jest.fn(async (sql: string, params: any[]) => {
    if (opts.failAll) throw new Error('db down');
    if (sql.includes("type = 'compliance'")) return seen.has(`${params[0]}|${params[1]}`) ? [{}] : [];
    if (sql.includes('FROM crops c JOIN ponds')) return [{ pondId: 'p1', pondName: 'Pond 3', farmId: 'f1', ownerId: OWNER }];
    if (sql.includes('FROM farm_members')) return [{ userId: MANAGER }];
    if (sql.includes('FROM users u')) return [{ name: 'Ravi' }];
    if (sql.includes('FROM profiles')) return [{ id: MANAGER, lang: 'te' }];
    if (sql.startsWith('UPDATE')) {
      updates.push(params);
      return [];
    }
    if (sql.includes('FROM treatments')) return opts.treatments ?? [];
    if (sql.includes('FROM disease_records')) return opts.diseases ?? [];
    return [];
  });
  const alerts = {
    create: jest.fn(async (a: any) => {
      seen.add(`${a.data.recordId}|${a.data.flag}`);
      return a;
    }),
  };
  const push = { sendToUser: jest.fn().mockResolvedValue(true) };
  const svc = new ComplianceService({ query } as any, alerts as any, push as any);
  return { svc, query, alerts, push, updates };
}

describe('D2 ingredient catalogue', () => {
  it('every banned/restricted list entry is a pickable ingredient (bannedKey)', () => {
    const keys = new Set(INGREDIENTS.map((i) => i.bannedKey).filter(Boolean));
    expect(BANNED_SUBSTANCES.map(bannedKeyOf).filter((k) => !keys.has(k))).toEqual([]);
  });

  it('an ingredient with bannedKey flags exactly, with no text at all', () => {
    expect(evaluateRecord({ ingredientKeys: ['chloramphenicol'] })).toEqual({
      flag: 'banned',
      matches: ['Chloramphenicol'],
    });
    expect(evaluateRecord({ ingredientKeys: ['oxytetracycline'] })).toEqual({
      flag: 'restricted',
      matches: ['Oxytetracycline'],
    });
    expect(evaluateRecord({ ingredientKeys: ['potassium_chloride', 'dolomite'] })).toEqual({
      flag: 'none',
      matches: [],
    });
  });

  it('product name and free text are still matched', () => {
    expect(evaluateRecord({ ingredientKeys: ['bacillus'], productName: 'Colistin mix' }).flag).toBe('banned');
  });

  it('no withdrawal period is ever invented (only with a source)', () => {
    for (const i of INGREDIENTS) {
      if (i.withdrawalDays) expect(i.withdrawalDays.source.url).toMatch(/^https?:\/\//);
    }
  });
});

describe('D3 flag history', () => {
  const banned = { flag: 'banned' as const, matches: ['Colistin'] };
  const none = { flag: 'none' as const, matches: [] };

  it('lowering the flag without a reason → 400 REASON_REQUIRED', () => {
    expect(() => nextFlagHistory(banned, none, 'u1')).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code: 'REASON_REQUIRED' }) }),
    );
    expect(() => nextFlagHistory(banned, none, 'u1', '   ')).toThrow();
  });

  it('with a reason it is kept in the history; the system needs none', () => {
    expect(nextFlagHistory(banned, none, 'u1', 'Wrong product')).toEqual([
      expect.objectContaining({ by: 'u1', from: 'banned', to: 'none', reason: 'Wrong product' }),
    ]);
    expect(nextFlagHistory(banned, none, 'system')).toHaveLength(1);
  });

  it('raising never needs a reason; no change → no entry', () => {
    expect(nextFlagHistory(none, banned, 'u1')).toHaveLength(1);
    expect(nextFlagHistory(banned, banned, 'u1')).toBeNull();
  });
});

describe('D3 escalation', () => {
  const rec = { id: 'r1', cropId: 'c1', date: '2026-09-19', flag: 'banned' as const, matches: ['Chloramphenicol'] };

  it('banned save → push to owner and manager, never to the logger', async () => {
    const { svc, push, alerts } = makeCompliance();
    await svc.escalate(rec, 'treatment', WORKER);
    expect(push.sendToUser.mock.calls.map((c) => c[0]).sort()).toEqual([MANAGER, OWNER]);
    expect(alerts.create).toHaveBeenCalledTimes(2);
    const a = alerts.create.mock.calls[0][0];
    expect(a).toMatchObject({ type: 'compliance', severity: 'critical', pondId: 'p1' });
    expect(a.data.titleKey.key).toBe('compliance.alert.bannedTitle');
    expect(a.data.bodyKey.params).toMatchObject({ pond: 'Pond 3', substances: 'Chloramphenicol', name: 'Ravi', date: '19/09/2026' });
    // The manager reads Telugu.
    const toManager = push.sendToUser.mock.calls.find((c) => c[0] === MANAGER)![1];
    expect(toManager.body).toContain('Pond 3');
    expect(toManager.title).not.toBe('Banned substance logged');
  });

  it('the logger is skipped even when they are the owner', async () => {
    const { svc, push } = makeCompliance();
    await svc.escalate(rec, 'treatment', OWNER);
    expect(push.sendToUser.mock.calls.map((c) => c[0])).toEqual([MANAGER]);
  });

  it('replay → no second push', async () => {
    const { svc, push } = makeCompliance();
    await svc.escalate(rec, 'treatment', WORKER);
    await svc.escalate(rec, 'treatment', WORKER);
    expect(push.sendToUser).toHaveBeenCalledTimes(2); // owner + manager, once
  });

  it('restricted → alert item only, no push', async () => {
    const { svc, push, alerts } = makeCompliance();
    await svc.escalate({ ...rec, flag: 'restricted', matches: ['Oxytetracycline'] }, 'disease', WORKER);
    expect(push.sendToUser).not.toHaveBeenCalled();
    expect(alerts.create.mock.calls[0][0].severity).toBe('warning');
  });

  it('never throws, whatever breaks', async () => {
    const { svc } = makeCompliance({ failAll: true });
    await expect(svc.escalate(rec, 'treatment', WORKER)).resolves.toBeUndefined();
  });
});

describe('D3 cycle compliance (re-evaluated on read)', () => {
  it('a list change flips an old cycle on read and refreshes the stored flag by system', async () => {
    const old = { id: 't1', date: '2026-08-12', description: 'Applied dapsone', notes: null, flag: 'none', matches: [] };
    const before = makeCompliance({ treatments: [old] });
    expect((await before.svc.cycleCompliance('c1')).status).toBe('none_logged');
    expect(before.updates).toHaveLength(0);

    BANNED_SUBSTANCES.push({ name: 'Dapsone', aliases: ['dapsone'], category: 'banned' });
    try {
      const after = makeCompliance({ treatments: [old] });
      const c = await after.svc.cycleCompliance('c1');
      expect(c.status).toBe('banned_logged');
      expect(c.items).toEqual([
        { date: '2026-08-12', source: 'treatment', recordId: 't1', substances: ['Dapsone'], flag: 'banned' },
      ]);
      expect(after.updates).toHaveLength(1);
      expect(after.updates[0].slice(0, 3)).toEqual(['t1', 'banned', ['Dapsone']]);
      expect(JSON.parse(after.updates[0][4])[0]).toMatchObject({ by: 'system', from: 'none', to: 'banned' });
    } finally {
      BANNED_SUBSTANCES.pop();
    }
  });

  it('restricted only → restricted_logged; disease records count too', async () => {
    const { svc } = makeCompliance({
      diseases: [{ id: 'd1', date: '2026-08-01', notes: 'gave oxytetracycline', flag: 'restricted', matches: ['Oxytetracycline'] }],
    });
    const c = await svc.cycleCompliance('c1');
    expect(c.status).toBe('restricted_logged');
    expect(c.items[0]).toMatchObject({ source: 'disease', recordId: 'd1' });
  });
});

describe('D3 never block: a flagged treatment always saves', () => {
  it('saves (and escalates) even when every notification path fails', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((e) => e),
      save: jest.fn((e) => Promise.resolve({ id: 'new-1', ...e })),
    };
    const { svc: compliance } = makeCompliance({ failAll: true });
    const module = await Test.createTestingModule({
      providers: [
        TreatmentsService,
        { provide: getRepositoryToken(Treatment), useValue: repo },
        { provide: FarmAccessService, useValue: {} },
        { provide: ComplianceService, useValue: compliance },
        { provide: InventoryService, useValue: {} },
      ],
    }).compile();
    const saved = await module.get(TreatmentsService).create(
      { cropId: 'c1', treatmentDate: '2026-09-19', ingredientKeys: ['chloramphenicol'], category: 'antimicrobial' } as any,
      WORKER,
    );
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(saved).toMatchObject({ bannedSubstanceFlag: 'banned', bannedSubstanceMatches: ['Chloramphenicol'] });
    expect(saved.flagHistory).toEqual([expect.objectContaining({ from: 'none', to: 'banned', by: WORKER })]);
  });
});
