import { ForbiddenException } from '@nestjs/common';
import { R2StorageService } from './r2-storage.service';
import { PhotoLedgerService } from './photo-ledger.service';
import { PhotoDeletionService } from './photo-deletion.service';
import { PhotosService } from './photos.service';
import { retentionDropAt } from './retention';
import { FeedbackStorageService } from '../feedback/feedback-storage.service';

/** F3 (retention) + F4 (backup) test gate, photos spec §6. */

const DAY = 86_400_000;
const FARM = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OWNER = '11111111-1111-4111-8111-111111111111';
const POND = '33333333-3333-4333-8333-333333333333';
const CROP = '44444444-4444-4444-8444-444444444444';
const P1 = `${FARM}/cccccccc-cccc-4ccc-8ccc-cccccccccccc.webp`;
const P2 = `${FARM}/dddddddd-dddd-4ddd-8ddd-dddddddddddd.webp`;
const NOW = new Date('2027-10-20T06:00:00Z');
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

describe('retentionDropAt (the one F3 clock)', () => {
  it('12 months after upload once the notice is 30+ days old', () => {
    expect(retentionDropAt(ago(366), ago(40))).toEqual(new Date(ago(366).getTime() + 365 * DAY));
  });
  it('never sooner than 30 days after the notice, however old the photo', () => {
    expect(retentionDropAt(ago(900), ago(1))).toEqual(new Date(ago(1).getTime() + 30 * DAY));
  });
  it('no notice → never', () => {
    expect(retentionDropAt(ago(900), null)).toBeNull();
  });
});

/** Fake DB: `candidates` is what the retention SELECT returns (the SQL narrows; the JS rule decides). */
function passWith(candidates: { path: string; uploaded_at: Date; notice_at: Date }[] | 'unmigrated') {
  const sql: { q: string; p: any[] }[] = [];
  const query = jest.fn(async (q: string, p: any[] = []) => {
    sql.push({ q, p });
    if (/to_regclass/.test(q)) return [{ ok: true }];
    if (/JOIN photo_retention_notices/.test(q)) {
      if (candidates === 'unmigrated') throw Object.assign(new Error('no table'), { code: '42P01' });
      return candidates;
    }
    return [];
  });
  const db = { query, manager: { query }, transaction: async (fn: any) => fn({ query }) };
  const ledger = { markDropped: jest.fn() };
  const svc = new PhotoDeletionService(db as any, { configured: true } as any, ledger as any);
  jest.spyOn((svc as any).logger, 'log').mockImplementation(() => undefined);
  const dropped = () => sql.find((s) => /^UPDATE photo_objects SET full_dropped_at/.test(s.q))?.p[0] ?? [];
  const queued = () =>
    sql.filter((s) => /^INSERT INTO photo_deletions/.test(s.q)).map((s) => ({ paths: s.p[1], reason: s.p[2] }));
  return { svc, sql, dropped, queued, ledger };
}

describe('PhotoDeletionService.retentionPass (F3)', () => {
  it('a 366-day-old photo loses its full size: full_dropped_at set, retention_full queued', async () => {
    const { svc, dropped, queued, ledger } = passWith([{ path: P1, uploaded_at: ago(366), notice_at: ago(40) }]);
    expect(await svc.retentionPass(NOW)).toBe(1);
    expect(dropped()).toEqual([P1]);
    expect(queued()).toEqual([{ paths: [P1], reason: 'retention_full' }]);
    expect(ledger.markDropped).toHaveBeenCalled();
  });

  it('nothing is dropped within 30 days of the notice — i.e. of first deploy — however old', async () => {
    // First deploy: the notice clock starts at deploy (no rows before it).
    const deploy = ago(29);
    const { svc, dropped, queued } = passWith([
      { path: P1, uploaded_at: ago(900), notice_at: deploy },
      { path: P2, uploaded_at: ago(366), notice_at: deploy },
    ]);
    expect(await svc.retentionPass(NOW)).toBe(0);
    expect(dropped()).toEqual([]);
    expect(queued()).toEqual([]);
  });

  it('drops the day the 30 days are up', async () => {
    const { svc, dropped } = passWith([{ path: P1, uploaded_at: ago(900), notice_at: ago(30) }]);
    expect(await svc.retentionPass(NOW)).toBe(1);
    expect(dropped()).toEqual([P1]);
  });

  it('the SQL only considers owners who have been shown a notice', async () => {
    const { svc, sql } = passWith([]);
    await svc.retentionPass(NOW);
    const select = sql.find((s) => /JOIN photo_retention_notices/.test(s.q))!.q;
    expect(select).toMatch(/full_dropped_at IS NULL/);
    expect(select).toMatch(/interval '365 days'/);
    expect(select).toMatch(/interval '30 days'/);
  });

  it('before the migration nothing is dropped (42P01 → 0)', async () => {
    const { svc, dropped } = passWith('unmigrated');
    expect(await svc.retentionPass(NOW)).toBe(0);
    expect(dropped()).toEqual([]);
  });
});

describe('drain of a retention_full row', () => {
  it('deletes the full-size object only and keeps the ledger row (thumbnail stays)', async () => {
    const sql: string[] = [];
    const query = jest.fn(async (q: string) => {
      sql.push(q);
      if (/^SELECT id, namespace, path, reason FROM photo_deletions/.test(q))
        return [{ id: 'r1', namespace: 'health', path: P1, reason: 'retention_full' }];
      return [];
    });
    const storage = { configured: true, deleteFull: jest.fn(async () => undefined), deleteImages: jest.fn(), deletePrefix: jest.fn() };
    const svc = new PhotoDeletionService({ query, manager: { query } } as any, storage as any);
    expect(await svc.drain()).toEqual({ deleted: 1, failed: 0 });
    expect(storage.deleteFull).toHaveBeenCalledWith('health', P1);
    expect(storage.deleteImages).not.toHaveBeenCalled();
    expect(sql.some((q) => /DELETE FROM photo_objects/.test(q))).toBe(false);
  });
});

function r2With(dropped: string[]) {
  const ledger = { droppedAmong: jest.fn(async () => new Set(dropped)) };
  const env: Record<string, string> = { R2_ACCOUNT_ID: 'a', R2_ACCESS_KEY_ID: 'k', R2_SECRET_ACCESS_KEY: 's' };
  const svc = new R2StorageService({ get: (k: string) => env[k] } as any, ledger as any);
  const send = jest.fn(async (_c: any): Promise<any> => ({}));
  (svc as any).client.send = send;
  return { svc, send };
}

describe('R2StorageService (F3)', () => {
  it('signs the thumbnail as the "full" photo once the full size is dropped — never a broken image', async () => {
    const { svc } = r2With([P1]);
    const { full, thumb } = await svc.sign('health', [P1, P2]);
    expect(full[0]).toContain('cccccccc-cccc-4ccc-8ccc-cccccccccccc.thumb.webp');
    expect(full[1]).toContain('dddddddd-dddd-4ddd-8ddd-dddddddddddd.webp');
    expect(full[1]).not.toContain('.thumb.');
    expect(thumb[0]).toContain('.thumb.webp');
  });

  it('deleteFull removes only the full-size key', async () => {
    const { svc, send } = r2With([]);
    await svc.deleteFull('health', P1);
    const keys = send.mock.calls[0][0].input.Delete.Objects.map((o: any) => o.Key);
    expect(keys).toEqual([`health/${P1}`]);
  });

  it('deleteFull refuses a photo that is its own thumbnail', async () => {
    const { svc, send } = r2With([]);
    await expect(svc.deleteFull('health', `${FARM}/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg`)).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
});

describe('PhotoLedgerService.droppedAmong', () => {
  it('skips the per-photo lookup while nothing anywhere has been dropped', async () => {
    const query = jest.fn(async (q: string) => (/SELECT EXISTS/.test(q) ? [{ any: false }] : [{ path: P1 }]));
    const ledger = new PhotoLedgerService({ query } as any);
    expect([...(await ledger.droppedAmong('health', [P1]))]).toEqual([]);
    expect([...(await ledger.droppedAmong('health', [P1]))]).toEqual([]);
    expect(query).toHaveBeenCalledTimes(1);
    ledger.markDropped();
    expect([...(await ledger.droppedAmong('health', [P1]))]).toEqual([P1]);
  });
});

describe('PhotosService.retention (F3 notice)', () => {
  function make(oldest: Date | null, existingNotice: Date | null = null) {
    let notice = existingNotice;
    const sql: string[] = [];
    const query = jest.fn(async (q: string, p: any[] = []) => {
      sql.push(q);
      if (/min\(o.uploaded_at\)/.test(q)) return [{ at: oldest }];
      if (/^INSERT INTO photo_retention_notices/.test(q)) {
        notice = notice ?? new Date(p[1]);
        return [];
      }
      if (/^SELECT notice_at/.test(q)) return [{ notice_at: notice }];
      if (/count\(\*\)::int AS n/.test(q)) return [{ n: 42 }];
      return [];
    });
    const svc = new PhotosService({ query } as any, {} as any, {} as any, {} as any, {} as any);
    return { svc, sql, notice: () => notice };
  }

  it('fires 30 days before the first downgrade, and stamps the clock the pass uses', async () => {
    const { svc, notice } = make(ago(340));
    const r = await svc.retention(OWNER, NOW);
    expect(notice()).toEqual(NOW);
    expect(r.upcoming).toEqual({ photos: 42, since: ago(340).toISOString(), date: new Date(NOW.getTime() + 30 * DAY).toISOString() });

    // The pass agrees: not a millisecond before the date on the notice.
    const date = new Date(r.upcoming!.date);
    const before = passWith([{ path: P1, uploaded_at: ago(340), notice_at: NOW }]);
    expect(await before.svc.retentionPass(new Date(date.getTime() - 1))).toBe(0);
    const on = passWith([{ path: P1, uploaded_at: ago(340), notice_at: NOW }]);
    expect(await on.svc.retentionPass(date)).toBe(1);
  });

  it('no notice (and no clock) while every photo is younger than 11 months', async () => {
    const { svc, sql, notice } = make(ago(300));
    const r = await svc.retention(OWNER, NOW);
    expect(r).toEqual({ oldestFullAt: ago(300), upcoming: null });
    expect(notice()).toBeNull();
    expect(sql.some((q) => /photo_retention_notices/.test(q))).toBe(false);
  });

  it('a later batch shrinks at its own 12 months (notice already given)', async () => {
    const { svc } = make(ago(350), ago(200));
    const r = await svc.retention(OWNER, NOW);
    expect(r.upcoming!.date).toBe(new Date(ago(350).getTime() + 365 * DAY).toISOString());
  });
});

describe('PhotosService.backup (F4)', () => {
  const row = (path: string, entity: string, over: Record<string, unknown> = {}) => ({
    path,
    entity,
    record_id: 'rec-1',
    farm_id: FARM,
    uploaded_at: ago(10),
    full_dropped_at: null,
    bytes: '1000',
    farm_name: 'Green Acres',
    pond_name: 'Pond 3',
    crop_name: 'Cycle 1',
    ...over,
  });

  function make(rows: any[], { financial = true } = {}) {
    const query = jest.fn(async (q: string) => {
      if (/SELECT pond_id FROM crops/.test(q)) return [{ pond_id: POND }];
      if (/FROM photo_objects o\s+LEFT JOIN farms/.test(q)) return rows;
      return [];
    });
    const access = {
      assertCanAccessPond: jest.fn(async () => ({})),
      assertCanAccessFarm: jest.fn(async () => ({})),
      getFarmIdsWithCapability: jest.fn(async () => (financial ? [FARM] : [])),
    };
    const storage = { sign: jest.fn(async (_ns: string, paths: string[]) => ({ full: paths.map((p) => `https://r2/health/${p}?sig`), thumb: [] })) };
    const svc = new PhotosService({ query } as any, storage as any, {} as any, {} as any, access as any);
    return { svc, access, storage, query };
  }

  it('a cycle: READ on its pond, one batch-signing call, metadata for photos.csv', async () => {
    const { svc, access, storage } = make([row(P1, 'disease'), row(P2, 'mortality', { full_dropped_at: ago(1), bytes: '90' })]);
    const items = await svc.backup(OWNER, { cropId: CROP });
    expect(access.assertCanAccessPond).toHaveBeenCalledWith(OWNER, POND, 'READ');
    expect(storage.sign).toHaveBeenCalledTimes(1);
    expect(items.map((i) => [i.path, i.entity, i.pondName, i.recordId, i.bytes])).toEqual([
      [P1, 'disease', 'Pond 3', 'rec-1', 1000],
      [P2, 'mortality', 'Pond 3', 'rec-1', 90],
    ]);
    expect(items[1].fullDroppedAt).toEqual(ago(1));
  });

  it('money photos are left out without VIEW_FINANCIALS on their farm', async () => {
    const { svc } = make([row(P1, 'disease'), row(P2, 'expense')], { financial: false });
    expect((await svc.backup(OWNER, { pondId: POND, month: '2027-10' })).map((i) => i.path)).toEqual([P1]);
    const { svc: owner } = make([row(P1, 'disease'), row(P2, 'expense')]);
    expect((await owner.backup(OWNER, { pondId: POND, month: '2027-10' })).map((i) => i.path)).toEqual([P1, P2]);
  });

  it('refuses without READ, and rejects a malformed month', async () => {
    const { svc, access } = make([row(P1, 'disease')]);
    access.assertCanAccessPond.mockRejectedValueOnce(new ForbiddenException());
    await expect(svc.backup(OWNER, { pondId: POND, month: '2027-10' })).rejects.toThrow(ForbiddenException);
    await expect(svc.backup(OWNER, { pondId: POND, month: '2027-13' })).rejects.toThrow();
  });
});

describe('FeedbackStorageService.signAttachments (F7.8)', () => {
  it('signs a reported farm photo in place (health/ namespace), for staff only', async () => {
    const sign = jest.fn(async (ns: string, paths: string[]) => ({ full: paths.map((p) => `${ns}:${p}`), thumb: [] }));
    const svc = new FeedbackStorageService({ sign } as any);
    const own = `${OWNER}/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.webp`;
    expect((await svc.signAttachments([own, `health/${P1}`], true)).full).toEqual([`feedback:${own}`, `health:${P1}`]);
    expect((await svc.signAttachments([own, `health/${P1}`])).full).toEqual([`feedback:${own}`]);
  });
});
