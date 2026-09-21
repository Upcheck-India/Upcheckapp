import { PhotoDeletionService, MAX_AUTO_ATTEMPTS } from './photo-deletion.service';
import { HealthPhotoStorageService } from '../health-observations/health-photo-storage.service';
import { MortalityService } from '../mortality/mortality.service';
import { MortalityRecord } from '../mortality/mortality-record.entity';
import { DiseaseService } from '../disease/disease.service';
import { DiseaseRecord } from '../disease/disease-record.entity';

const FARM = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER = '11111111-1111-4111-8111-111111111111';
const P1 = `${FARM}/cccccccc-cccc-4ccc-8ccc-cccccccccccc.webp`;
const P2 = `${FARM}/dddddddd-dddd-4ddd-8ddd-dddddddddddd.jpg`;

/** A fake photo_deletions table behind DataSource.query / manager.query. */
function make({ migrated = true, configured = true } = {}) {
  const rows: any[] = [];
  const sql: string[] = [];
  const query = jest.fn(async (q: string, p: any[] = []) => {
    sql.push(q);
    if (/to_regclass/.test(q)) return [{ ok: migrated }];
    if (/^INSERT INTO photo_deletions/.test(q)) {
      const [nss, paths, reason, by] = p;
      nss.forEach((ns: string, i: number) => {
        if (!rows.some((r) => r.namespace === ns && r.path === paths[i] && r.reason === reason)) {
          rows.push({ id: `r${rows.length}`, namespace: ns, path: paths[i], reason, requested_by: by, attempts: 0, done_at: null, last_error: null, due: true });
        }
      });
      return [];
    }
    if (/^SELECT id, namespace, path FROM photo_deletions/.test(q)) {
      const all = /attempts </.test(q) ? false : true;
      return rows
        .filter((r) => !r.done_at && (all || (r.attempts < MAX_AUTO_ATTEMPTS && r.due)))
        .slice(0, p[0]);
    }
    if (/^UPDATE photo_deletions SET done_at/.test(q)) {
      const r = rows.find((x) => x.id === p[0]);
      r.done_at = new Date();
      r.attempts++;
      return [];
    }
    if (/^UPDATE photo_deletions/.test(q)) {
      const r = rows.find((x) => x.id === p[0]);
      r.attempts++;
      r.last_error = p[1];
      r.due = false; // backed off
      return [];
    }
    return [];
  });
  const db = { query, manager: { query } };
  const storage = {
    configured,
    deleteImages: jest.fn(async () => undefined),
    deletePrefix: jest.fn(async () => undefined),
  };
  const svc = new PhotoDeletionService(db as any, storage as any);
  jest.spyOn((svc as any).logger, 'warn').mockImplementation(() => undefined);
  jest.spyOn((svc as any).logger, 'error').mockImplementation(() => undefined);
  return { svc, db, storage, rows, sql };
}

describe('PhotoDeletionService.enqueue', () => {
  it('writes one row per object, deduped', async () => {
    const { svc, rows } = make();
    await svc.enqueue(
      [{ namespace: 'health', path: P1 }, { namespace: 'health', path: P1 }, { namespace: 'health', path: P2 }],
      'record_deleted',
      USER,
    );
    expect(rows.map((r) => [r.namespace, r.path, r.reason, r.requested_by])).toEqual([
      ['health', P1, 'record_deleted', USER],
      ['health', P2, 'record_deleted', USER],
    ]);
  });

  it("writes through the caller's transaction manager when given one", async () => {
    const { svc, db } = make();
    const tx = { query: jest.fn(async (q: string) => (/to_regclass/.test(q) ? [{ ok: true }] : [])) };
    await svc.enqueue([{ namespace: 'health', path: P1 }], 'photo_removed', USER, tx as any);
    expect(tx.query).toHaveBeenCalledWith(expect.stringMatching(/^INSERT INTO photo_deletions/), expect.anything());
    expect(db.query).not.toHaveBeenCalled();
  });

  it('refuses malformed paths and whole-namespace prefixes (never "" or "/")', async () => {
    const { svc, rows } = make();
    await svc.enqueue(
      [
        { namespace: 'health', path: '' },
        { namespace: 'health', path: '/' },
        { namespace: 'health', path: '../x.webp' },
        { namespace: 'feedback', path: 'not-a-uuid/' },
        { namespace: 'health', path: `${FARM}/` },
      ],
      'farm_deleted',
    );
    expect(rows.map((r) => r.path)).toEqual([`${FARM}/`]);
  });

  it('not migrated (outside a transaction): logs and falls back to one inline delete', async () => {
    const { svc, storage, sql } = make({ migrated: false });
    await expect(svc.enqueue([{ namespace: 'health', path: P1 }], 'photo_removed')).resolves.toBe(false);
    expect(storage.deleteImages).toHaveBeenCalledWith('health', [P1]);
    expect(sql.some((q) => /INSERT/.test(q))).toBe(false);
  });

  it('not migrated, inside a transaction: never deletes inline (the delete might roll back)', async () => {
    const { svc, storage, db } = make({ migrated: false });
    await expect(
      svc.enqueue([{ namespace: 'health', path: `${FARM}/` }], 'farm_deleted', USER, db.manager as any),
    ).resolves.toBe(false);
    expect(storage.deletePrefix).not.toHaveBeenCalled();
    expect(storage.deleteImages).not.toHaveBeenCalled();
  });

  it('not migrated: an inline-fallback R2 failure is logged, never thrown', async () => {
    const { svc, storage } = make({ migrated: false });
    storage.deleteImages.mockRejectedValue(new Error('R2 down'));
    await expect(svc.enqueue([{ namespace: 'avatars', path: P1 }], 'photo_removed')).resolves.toBe(false);
  });
});

describe('PhotoDeletionService.drain', () => {
  it('deletes files (full + thumb via deleteImages) and prefixes, then stamps done_at', async () => {
    const { svc, storage, rows } = make();
    await svc.enqueue([{ namespace: 'health', path: P1 }, { namespace: 'feedback', path: `${USER}/` }], 'account_deleted');
    await expect(svc.drain()).resolves.toEqual({ deleted: 2, failed: 0 });
    expect(storage.deleteImages).toHaveBeenCalledWith('health', [P1]);
    expect(storage.deletePrefix).toHaveBeenCalledWith('feedback', `${USER}/`);
    expect(rows.every((r) => r.done_at)).toBe(true);
  });

  it('a failure keeps the row, counts the attempt, records the error and backs off — never drops it', async () => {
    const { svc, storage, rows, sql } = make();
    await svc.enqueue([{ namespace: 'health', path: P1 }], 'record_deleted');
    storage.deleteImages.mockRejectedValueOnce(new Error('R2 down'));
    await expect(svc.drain()).resolves.toEqual({ deleted: 0, failed: 1 });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ done_at: null, attempts: 1, last_error: 'R2 down' });
    expect(sql.some((q) => /DELETE FROM photo_deletions/.test(q))).toBe(false);
    expect(sql.find((q) => /next_attempt_at = now\(\) \+ LEAST\(interval '1 minute' \* power\(2, attempts\)/.test(q))).toBeDefined();

    // Backed off: the lazy drain leaves it alone; the staff sweep retries it and succeeds.
    await expect(svc.drain()).resolves.toEqual({ deleted: 0, failed: 0 });
    await expect(svc.drain(1000, { includeFailed: true })).resolves.toEqual({ deleted: 1, failed: 0 });
    expect(rows[0].done_at).toBeTruthy();
  });

  it(`stops auto-retrying after ${MAX_AUTO_ATTEMPTS} failures; the row stays and is listed for staff`, async () => {
    const { svc, rows, db } = make();
    await svc.enqueue([{ namespace: 'health', path: P1 }], 'record_deleted');
    Object.assign(rows[0], { attempts: MAX_AUTO_ATTEMPTS, last_error: 'x' });
    await expect(svc.drain()).resolves.toEqual({ deleted: 0, failed: 0 });
    await svc.failures();
    expect(db.query).toHaveBeenLastCalledWith(expect.stringMatching(new RegExp(`attempts >= ${MAX_AUTO_ATTEMPTS}`)), [100]);
  });

  it('does nothing when R2 is not configured (rows wait)', async () => {
    const { svc, storage, rows } = make({ configured: false });
    await svc.enqueue([{ namespace: 'health', path: P1 }], 'record_deleted');
    await expect(svc.drain()).resolves.toEqual({ deleted: 0, failed: 0 });
    expect(storage.deleteImages).not.toHaveBeenCalled();
    expect(rows[0].done_at).toBeNull();
  });

  it('an unmigrated table drains nothing instead of throwing', async () => {
    const { svc, db } = make();
    db.query.mockRejectedValueOnce(Object.assign(new Error('no table'), { code: '42P01' }));
    await expect(svc.drain()).resolves.toEqual({ deleted: 0, failed: 0 });
  });

  it('drainSoon runs at most once a minute and never throws', async () => {
    const { svc } = make();
    const drain = jest.spyOn(svc, 'drain').mockRejectedValue(new Error('boom'));
    svc.drainSoon();
    svc.drainSoon();
    await new Promise((r) => setImmediate(r));
    expect(drain).toHaveBeenCalledTimes(1);
  });
});

/** F1: deleting a record queues its photos in the delete's own transaction. */
describe('record deletion enqueues its photos (F1)', () => {
  const setup = () => {
    const order: string[] = [];
    const deletions = {
      enqueue: jest.fn(async (..._a: any[]) => {
        order.push('enqueue');
        return true;
      }),
    };
    const photos = new HealthPhotoStorageService({} as any, deletions as any);
    const tx = { delete: jest.fn(async () => order.push('delete')) };
    const manager = { transaction: jest.fn(async (cb: any) => cb(tx)) };
    return { order, deletions, photos, tx, manager };
  };

  it('mortality record', async () => {
    const { order, deletions, photos, tx, manager } = setup();
    const repo = { findOne: jest.fn(async () => ({ id: 'm1', photoUrls: [P1, P2] })), manager };
    await new MortalityService(repo as any, photos).remove('m1', USER);
    expect(deletions.enqueue).toHaveBeenCalledWith(
      [{ namespace: 'health', path: P1 }, { namespace: 'health', path: P2 }],
      'record_deleted',
      USER,
      tx,
    );
    expect(tx.delete).toHaveBeenCalledWith(MortalityRecord, 'm1');
    expect(order).toEqual(['enqueue', 'delete']);
  });

  it('disease record', async () => {
    const { order, deletions, photos, tx, manager } = setup();
    const repo = { findOneBy: jest.fn(async () => ({ id: 'd1', photoUrls: [P1] })), manager };
    await new DiseaseService({} as any, {} as any, repo as any, photos).removeRecord('d1', USER);
    expect(deletions.enqueue).toHaveBeenCalledWith([{ namespace: 'health', path: P1 }], 'record_deleted', USER, tx);
    expect(tx.delete).toHaveBeenCalledWith(DiseaseRecord, 'd1');
    expect(order).toEqual(['enqueue', 'delete']);
  });

  it('a record without photos queues nothing', async () => {
    const { deletions, photos, manager } = setup();
    const repo = { findOne: jest.fn(async () => ({ id: 'm1', photoUrls: [] })), manager };
    await new MortalityService(repo as any, photos).remove('m1', USER);
    expect(deletions.enqueue).not.toHaveBeenCalled();
  });
});
