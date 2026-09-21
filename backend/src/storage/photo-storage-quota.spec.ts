import sharp from 'sharp';
import { R2StorageService } from './r2-storage.service';
import { PhotoLedgerService, PHOTO_QUOTA } from './photo-ledger.service';
import { PhotoDeletionService } from './photo-deletion.service';
import { PhotosService, PROTECTED } from './photos.service';
import { HealthPhotoStorageService } from '../health-observations/health-photo-storage.service';
import { MortalityService } from '../mortality/mortality.service';

/** F2 test gate (photos spec §6) + F1 orphan collection. */

const FARM = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OWNER = '11111111-1111-4111-8111-111111111111';
const WORKER = '22222222-2222-4222-8222-222222222222';
const POND = '33333333-3333-4333-8333-333333333333';
const CROP = '44444444-4444-4444-8444-444444444444';
const P1 = `${FARM}/cccccccc-cccc-4ccc-8ccc-cccccccccccc.webp`;
const P2 = `${FARM}/dddddddd-dddd-4ddd-8ddd-dddddddddddd.webp`;

const jpeg = () =>
  sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 10, g: 90, b: 40 } } })
    .jpeg()
    .toBuffer();
const file = (buffer: Buffer) => ({ buffer, mimetype: 'image/jpeg', size: buffer.length });

/** A ledger backed by a fake DataSource whose usage row we control. */
function ledgerWith(used: { photos: number; bytes: number } | 'unmigrated') {
  const query = jest.fn(async (q: string, _p?: any[]) => {
    if (/^SELECT user_id FROM farms/.test(q)) return [{ user_id: OWNER }];
    if (/count\(\*\)::int AS photos/.test(q)) {
      if (used === 'unmigrated') throw Object.assign(new Error('no table'), { code: '42P01' });
      return [used];
    }
    return [];
  });
  const ledger = new PhotoLedgerService({ query, transaction: async (fn: any) => fn({ query }) } as any);
  jest.spyOn((ledger as any).logger, 'warn').mockImplementation(() => undefined);
  jest.spyOn((ledger as any).logger, 'error').mockImplementation(() => undefined);
  return { ledger, query };
}

function r2(ledger: PhotoLedgerService) {
  const env: Record<string, string> = { R2_ACCOUNT_ID: 'a', R2_ACCESS_KEY_ID: 'k', R2_SECRET_ACCESS_KEY: 's' };
  const svc = new R2StorageService({ get: (k: string) => env[k] } as any, ledger);
  const send = jest.fn(async (_c: any): Promise<any> => ({}));
  (svc as any).client.send = send;
  jest.spyOn((svc as any).logger, 'error').mockImplementation(() => undefined);
  const puts = () => send.mock.calls.map(([c]) => c).filter((c) => c.constructor.name === 'PutObjectCommand');
  return { svc, send, puts };
}

describe('F2 quota is enforced server-side, at upload', () => {
  it('refuses the photo with STORAGE_FULL at 1,000 photos — nothing is stored', async () => {
    const { ledger } = ledgerWith({ photos: PHOTO_QUOTA.photos, bytes: 0 });
    const { svc, puts } = r2(ledger);
    await expect(
      svc.putImage('health', `${FARM}/x`, file(await jpeg()), { ownerUserId: OWNER, uploadedBy: WORKER }),
    ).rejects.toMatchObject({ response: { code: 'STORAGE_FULL' } });
    expect(puts()).toHaveLength(0);
  });

  it('refuses at 1.5 GB even under the photo count', async () => {
    const { ledger } = ledgerWith({ photos: 3, bytes: PHOTO_QUOTA.bytes });
    await expect(ledger.assertRoom(OWNER)).rejects.toMatchObject({ response: { code: 'STORAGE_FULL' } });
  });

  it('allows the upload just under both limits', async () => {
    const { ledger } = ledgerWith({ photos: PHOTO_QUOTA.photos - 1, bytes: PHOTO_QUOTA.bytes - 1 });
    await expect(ledger.assertRoom(OWNER)).resolves.toBeUndefined();
  });

  it('degrades open (no quota) before the migration', async () => {
    const { ledger } = ledgerWith('unmigrated');
    await expect(ledger.assertRoom(OWNER)).resolves.toBeUndefined();
  });

  it("writes the ledger row with both objects' byte counts, counted against the farm OWNER", async () => {
    const { ledger, query } = ledgerWith({ photos: 0, bytes: 0 });
    const { svc, puts } = r2(ledger);
    const photos = new HealthPhotoStorageService(svc, {} as any, ledger);
    const path = await photos.upload(FARM, file(await jpeg()), WORKER, POND);

    const [thumb, full] = puts().map((c) => c.input.Body as Buffer);
    const insert = query.mock.calls.find(([q]) => /^INSERT INTO photo_objects/.test(q))!;
    expect(insert[1]).toEqual([path, 'health', OWNER, FARM, POND, null, null, full.length, thumb.length, WORKER]);
  });

  it('a failed ledger write removes the stored pair rather than leave it untracked', async () => {
    const { ledger } = ledgerWith({ photos: 0, bytes: 0 });
    jest.spyOn(ledger, 'record').mockRejectedValue(new Error('db down'));
    const { svc, send } = r2(ledger);
    await expect(
      svc.putImage('health', `${FARM}/x`, file(await jpeg()), { ownerUserId: OWNER, uploadedBy: OWNER }),
    ).rejects.toThrow('Could not store the image');
    const del = send.mock.calls.map(([c]) => c).find((c) => c.constructor.name === 'DeleteObjectsCommand');
    expect(del.input.Delete.Objects.map((o: any) => o.Key).sort()).toEqual(
      [`health/${FARM}/x.thumb.webp`, `health/${FARM}/x.webp`],
    );
  });
});

/**
 * A stateful photo_objects behind a fake DataSource whose transactions honour
 * pg_advisory_xact_lock (a real per-key mutex, released at commit/rollback).
 * A usage read INSIDE a transaction waits for a second reader (or 300 ms),
 * so two uploads' read-then-insert windows are forced to overlap unless the
 * lock serialises them. Removing the lock makes both read 999 and both insert.
 */
function racingLedger(existingPhotos: number) {
  const rows: { owner: string; bytes: number }[] = Array.from({ length: existingPhotos }, () => ({ owner: OWNER, bytes: 1 }));
  const locks = new Map<string, Promise<void>>();
  let waiting: (() => void)[] = [];
  const barrier = () =>
    new Promise<void>((resolve) => {
      waiting.push(resolve);
      if (waiting.length >= 2) {
        waiting.forEach((r) => r());
        waiting = [];
      } else {
        setTimeout(() => {
          waiting = waiting.filter((r) => r !== resolve);
          resolve();
        }, 300);
      }
    });
  const base = async (q: string, p: any[] = [], inTx = false): Promise<any[]> => {
    if (/count\(\*\)::int AS photos/.test(q)) {
      if (inTx) await barrier();
      const mine = rows.filter((r) => r.owner === p[0]);
      return [{ photos: mine.length, bytes: mine.reduce((s, r) => s + r.bytes, 0) }];
    }
    if (/^\s*INSERT INTO photo_objects/.test(q)) {
      rows.push({ owner: p[2], bytes: p[7] + p[8] });
      return [];
    }
    return [];
  };
  const transaction = async (fn: (m: any) => Promise<unknown>) => {
    const held: (() => void)[] = [];
    const m = {
      query: async (q: string, p: any[] = []) => {
        if (/pg_advisory_xact_lock/.test(q)) {
          const key = p[0];
          const prev = locks.get(key) ?? Promise.resolve();
          let release!: () => void;
          const mine = new Promise<void>((r) => (release = r));
          locks.set(key, prev.then(() => mine));
          held.push(release);
          await prev;
          return [{}];
        }
        return base(q, p, true);
      },
    };
    try {
      return await fn(m);
    } finally {
      held.forEach((r) => r());
    }
  };
  const ledger = new PhotoLedgerService({ query: (q: string, p?: any[]) => base(q, p), transaction } as any);
  return { ledger, rows };
}

describe('F2 the last slot is admitted atomically per account', () => {
  it('two concurrent uploads with one slot left: exactly one lands, the other gets STORAGE_FULL and its pair is deleted', async () => {
    const { ledger, rows } = racingLedger(PHOTO_QUOTA.photos - 1);
    const { svc, send } = r2(ledger);
    const img = await jpeg();
    const owner = { ownerUserId: OWNER, uploadedBy: WORKER };

    const results = await Promise.allSettled([
      svc.putImage('health', `${FARM}/a`, file(img), owner),
      svc.putImage('health', `${FARM}/b`, file(img), owner),
    ]);

    const ok = results.filter((r) => r.status === 'fulfilled');
    const refused = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(refused).toHaveLength(1);
    expect(refused[0].reason).toMatchObject({ response: { code: 'STORAGE_FULL' } });
    expect(rows).toHaveLength(PHOTO_QUOTA.photos);

    const loser = (ok[0] as PromiseFulfilledResult<string>).value === `${FARM}/a.webp` ? 'b' : 'a';
    const deleted = send.mock.calls
      .map(([c]) => c)
      .filter((c) => c.constructor.name === 'DeleteObjectsCommand')
      .flatMap((c) => c.input.Delete.Objects.map((o: any) => o.Key))
      .sort();
    expect(deleted).toEqual([`health/${FARM}/${loser}.thumb.webp`, `health/${FARM}/${loser}.webp`]);
  });

  it('the limit is read through quotaFor (the one hook for per-user overrides)', async () => {
    const { ledger, rows } = racingLedger(5);
    jest.spyOn(ledger, 'quotaFor').mockResolvedValue({ maxPhotos: 5, maxBytes: PHOTO_QUOTA.bytes });
    await expect(ledger.record('health', `${FARM}/c.webp`, { ownerUserId: OWNER, uploadedBy: OWNER }, 10, 5)).rejects.toMatchObject({
      response: { code: 'STORAGE_FULL' },
    });
    expect(rows).toHaveLength(5);
  });
});

describe('F2: a full pool refuses the photo but ALWAYS saves the record', () => {
  it('mortality create saves (and attaches its photos) with the pool at 100%', async () => {
    const { ledger } = ledgerWith({ photos: PHOTO_QUOTA.photos, bytes: PHOTO_QUOTA.bytes });
    const assertRoom = jest.spyOn(ledger, 'assertRoom');
    const attach = jest.spyOn(ledger, 'attach').mockResolvedValue(undefined);
    const photos = new HealthPhotoStorageService(r2(ledger).svc, {} as any, ledger);
    const repo = {
      findOne: jest.fn(async () => null),
      create: jest.fn((x: any) => x),
      save: jest.fn(async (x: any) => ({ id: 'rec-1', ...x })),
      manager: { query: jest.fn(async () => [{ farm_id: FARM }]) },
    };
    const svc = new MortalityService(repo as any, photos);

    const saved = await svc.create({ cropId: CROP, recordDate: '2026-09-20', quantity: 4, photoUrls: [P1] } as any, WORKER);

    expect(saved.id).toBe('rec-1');
    expect(repo.save).toHaveBeenCalled();
    expect(assertRoom).not.toHaveBeenCalled();
    expect(attach).toHaveBeenCalledWith('health', [P1], { entity: 'mortality', recordId: 'rec-1', cropId: CROP });
  });
});

/** PhotosService over a fake DataSource: `rows` answers the SELECTs, writes are recorded. */
function photosService(answer: (q: string, p: any[]) => any[]) {
  const calls: { q: string; p: any[] }[] = [];
  const query = jest.fn(async (q: string, p: any[] = []) => {
    calls.push({ q, p });
    return answer(q, p);
  });
  const manager = { query };
  const db = { query, transaction: jest.fn(async (fn: any) => fn(manager)) };
  const deletions = { enqueue: jest.fn(async () => true), drainSoon: jest.fn() };
  const storage = { sign: jest.fn(async (_ns: string, paths: string[]) => ({ full: paths, thumb: paths })) };
  const ledger = { quotaFor: async () => ({ maxPhotos: PHOTO_QUOTA.photos, maxBytes: PHOTO_QUOTA.bytes }) };
  const svc = new PhotosService(db as any, storage as any, ledger as any, deletions as any, {} as any);
  jest.spyOn((svc as any).logger, 'warn').mockImplementation(() => undefined);
  return { svc, calls, deletions };
}

describe('F2 usage', () => {
  it('equals the sum of the ledger, broken down per farm and pond, and kicks the lazy drain', async () => {
    const { svc, deletions } = photosService((q) => {
      if (/GROUP BY o.farm_id/.test(q)) {
        return [
          { farm_id: FARM, farm_name: 'Green Acres', pond_id: POND, pond_name: 'Pond 3', photos: 120, bytes: '240000000' },
          { farm_id: FARM, farm_name: 'Green Acres', pond_id: null, pond_name: null, photos: 2, bytes: '1000' },
          { farm_id: null, farm_name: null, pond_id: null, pond_name: null, photos: 1, bytes: '500' },
        ];
      }
      if (/AS incomplete/.test(q)) return [{ incomplete: false }];
      return [];
    });
    const u = await svc.usage(OWNER);
    expect(u.photos).toBe(123);
    expect(u.bytes).toBe(240001500);
    expect(u.farms).toEqual([
      {
        farmId: FARM,
        name: 'Green Acres',
        photos: 122,
        bytes: 240001000,
        ponds: [
          { pondId: POND, name: 'Pond 3', photos: 120, bytes: 240000000 },
          { pondId: null, name: null, photos: 2, bytes: 1000 },
        ],
      },
    ]);
    expect(u.account).toEqual({ photos: 1, bytes: 500 });
    expect(u.limits).toEqual(PHOTO_QUOTA);
    expect(deletions.drainSoon).toHaveBeenCalled();
  });

  it('says usage is incomplete until the backfill has run', async () => {
    const { svc } = photosService((q) => (/AS incomplete/.test(q) ? [{ incomplete: true }] : []));
    expect((await svc.usage(OWNER)).incomplete).toBe(true);
  });
});

describe('F2 Free up space never offers a protected photo', () => {
  it('the options count protected photos apart, never in what would be freed', async () => {
    const { svc, calls } = photosService(() => []);
    await svc.freeUpOptions(OWNER);
    for (const { q } of calls) {
      expect(q).toContain(`count(*) FILTER (WHERE NOT ${PROTECTED})::int AS photos`);
      expect(q).toContain(`FILTER (WHERE NOT ${PROTECTED}), 0)::bigint AS bytes`);
    }
  });

  it('clearing a pond only selects unprotected photos, and queues them as user_cleared', async () => {
    const { svc, calls, deletions } = photosService((q) =>
      /^SELECT o.path, /.test(q) ? [{ path: P1, bytes: '1000' }] : [],
    );
    const out = await svc.freeUp(OWNER, 'pond', POND);
    expect(calls[0].q).toContain(`AND NOT ${PROTECTED}`);
    expect(out).toEqual({ photos: 1, bytes: 1000 });
    expect(deletions.enqueue).toHaveBeenCalledWith([{ namespace: 'health', path: P1 }], 'user_cleared', OWNER, expect.anything());
  });

  it('protection covers a disease record flagged banned or restricted (D3)', () => {
    expect(PROTECTED).toMatch(/o\.entity = 'disease'/);
    expect(PROTECTED).toMatch(/banned_substance_flag IN \('banned', 'restricted'\)/);
  });
});

describe('F2 deleting a protected photo from its record leaves the tombstone', () => {
  it('drops the path, appends the line to the record, and queues the object — in one transaction', async () => {
    const { svc, calls, deletions } = photosService((q) => {
      if (/AS protected FROM photo_objects/.test(q)) return [{ path: P1, protected: true }];
      if (/^SELECT id, photo_urls, notes AS note FROM disease_records/.test(q)) {
        return [{ id: 'dis-1', photo_urls: [P1, P2], note: 'oxytetracycline' }];
      }
      if (/FROM users/.test(q)) return [{ first_name: 'Ravi', last_name: null }];
      return [];
    });

    const res = await svc.removeOne(OWNER, P1);

    expect(res).toEqual({ removed: true, protected: true });
    const upd = calls.find(({ q }) => /^UPDATE disease_records/.test(q))!;
    expect(upd.p[0]).toBe('dis-1');
    expect(upd.p[1]).toEqual([P2]);
    expect(upd.p[2]).toMatch(/^oxytetracycline\n1 photo removed by Ravi on /);
    expect(deletions.enqueue).toHaveBeenCalledWith([{ namespace: 'health', path: P1 }], 'photo_removed', OWNER, expect.anything());
  });

  it("404s a path outside the caller's pool", async () => {
    const { svc, deletions } = photosService(() => []);
    await expect(svc.removeOne(OWNER, P1)).rejects.toThrow('Photo not found');
    expect(deletions.enqueue).not.toHaveBeenCalled();
  });
});

describe('F1 orphan sweep', () => {
  function deletionService(orphans: any[]) {
    const query = jest.fn(async (q: string, _p?: any[]) => {
      if (/FROM photo_objects o\s+WHERE o.record_id IS NULL/.test(q)) return orphans;
      if (/to_regclass/.test(q)) return [{ ok: true }];
      return [];
    });
    const svc = new PhotoDeletionService({ query, manager: { query } } as any, { configured: true } as any);
    return { svc, query };
  }

  it('queues unattached uploads older than 24 h as orphans, never referenced ones', async () => {
    const { svc, query } = deletionService([{ namespace: 'health', path: P1 }]);
    expect(await svc.sweepOrphans()).toBe(1);

    const select = query.mock.calls.find(([q]) => /WHERE o.record_id IS NULL/.test(q))![0];
    expect(select).toContain(`interval '24 hours'`);
    expect(select).toMatch(/mortality_records r WHERE r.photo_urls @> ARRAY\[o.path\]/);
    expect(select).toMatch(/u.avatar_path = o.path/);
    const insert = query.mock.calls.find(([q]) => /^INSERT INTO photo_deletions/.test(q))!;
    expect(insert[1]).toEqual([['health'], [P1], 'orphan', null]);
  });

  it('piggybacks on the lazy drain', async () => {
    const { svc } = deletionService([]);
    const sweep = jest.spyOn(svc, 'sweepOrphans');
    svc.drainSoon();
    await new Promise((r) => setImmediate(r));
    expect(sweep).toHaveBeenCalledTimes(1);
  });

  it('a drained object leaves the ledger, so it stops counting', async () => {
    const query = jest.fn(async (q: string, _p?: any[]) =>
      /^SELECT id, namespace, path, reason FROM photo_deletions/.test(q) ? [{ id: 'd1', namespace: 'health', path: P1 }] : [],
    );
    const storage = { configured: true, deleteImages: jest.fn(async () => undefined) };
    const svc = new PhotoDeletionService({ query } as any, storage as any);
    await svc.drain();
    expect(query).toHaveBeenCalledWith(expect.stringMatching(/^DELETE FROM photo_objects/), ['health', P1]);
  });
});
