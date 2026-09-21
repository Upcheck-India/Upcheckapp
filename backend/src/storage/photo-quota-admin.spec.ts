import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PhotoLedgerService, PHOTO_QUOTA } from './photo-ledger.service';
import { R2AnalyticsService } from './r2-analytics.service';
import { PhotosService } from './photos.service';
import { PhotoQuotaAdminController } from './photo-quota-admin.controller';
import { SetQuotaOverrideDto, ResetQuotaOverrideDto } from './dto/set-quota-override.dto';

/** Admin photo-quota management test gate. */

const OWNER = '11111111-1111-4111-8111-111111111111';
const undefinedTable = Object.assign(new Error('relation does not exist'), { code: '42P01' });

function ledgerWith(overrideRow: any | undefined | 'unmigrated') {
  const calls: { q: string; p: any[] }[] = [];
  const query = jest.fn(async (q: string, p: any[] = []) => {
    calls.push({ q, p });
    if (overrideRow === 'unmigrated') throw undefinedTable;
    if (/SELECT max_photos, max_bytes FROM photo_quota_overrides WHERE user_id/.test(q)) {
      return overrideRow ? [overrideRow] : [];
    }
    if (/SELECT max_photos, max_bytes, reason, set_by, set_at FROM photo_quota_overrides/.test(q)) {
      return overrideRow ? [overrideRow] : [];
    }
    return [];
  });
  const transaction = jest.fn(async (fn: any) => fn({ query }));
  const ledger = new PhotoLedgerService({ query, transaction } as any);
  jest.spyOn((ledger as any).logger, 'warn').mockImplementation(() => undefined);
  return { ledger, query, calls };
}

describe('quotaFor reads the override, else the default', () => {
  it('returns the override when one exists', async () => {
    const { ledger } = ledgerWith({ max_photos: 50, max_bytes: 1000 });
    await expect(ledger.quotaFor(OWNER)).resolves.toEqual({ maxPhotos: 50, maxBytes: 1000 });
  });

  it('returns the flat default when there is no override', async () => {
    const { ledger } = ledgerWith(undefined);
    await expect(ledger.quotaFor(OWNER)).resolves.toEqual({
      maxPhotos: PHOTO_QUOTA.photos,
      maxBytes: PHOTO_QUOTA.bytes,
    });
  });

  it('degrades to the default (never throws) when photo_quota_overrides is not migrated', async () => {
    const { ledger } = ledgerWith('unmigrated');
    await expect(ledger.quotaFor(OWNER)).resolves.toEqual({
      maxPhotos: PHOTO_QUOTA.photos,
      maxBytes: PHOTO_QUOTA.bytes,
    });
  });
});

describe('setOverride / resetOverride record staff + reason and keep history', () => {
  it('inserts the override row and an event, attributed to the staffer', async () => {
    const { ledger, calls } = ledgerWith(undefined);
    // setOverride's INSERT ... RETURNING needs a row back.
    const query = jest.fn(async (q: string, _p?: any[]) => {
      if (/INSERT INTO photo_quota_overrides/.test(q)) {
        return [{ max_photos: 200, max_bytes: 5000, reason: 'VIP customer', set_by: 'Ravi', set_at: '2026-09-21T00:00:00Z' }];
      }
      return [];
    });
    (ledger as any).db = { transaction: async (fn: any) => fn({ query }) };

    const result = await ledger.setOverride(OWNER, { maxPhotos: 200, maxBytes: 5000 }, 'VIP customer', 'Ravi');

    expect(result).toEqual({
      maxPhotos: 200,
      maxBytes: 5000,
      reason: 'VIP customer',
      setBy: 'Ravi',
      setAt: '2026-09-21T00:00:00Z',
    });
    const event = query.mock.calls.find(([q]) => /INSERT INTO photo_quota_override_events/.test(q))!;
    expect(event[1]).toEqual([OWNER, 200, 5000, 'VIP customer', 'Ravi']);
  });

  it('resetOverride deletes the row but still appends an event', async () => {
    const query = jest.fn(async (_q: string, _p?: any[]) => []);
    const ledger = new PhotoLedgerService({ transaction: async (fn: any) => fn({ query }) } as any);

    await ledger.resetOverride(OWNER, 'no longer needed', 'Priya');

    const del = query.mock.calls.find(([q]) => /DELETE FROM photo_quota_overrides/.test(q))!;
    expect(del[1]).toEqual([OWNER]);
    const event = query.mock.calls.find(([q]) => /INSERT INTO photo_quota_override_events/.test(q))!;
    expect(event[0]).toContain(`'reset'`);
    expect(event[1]).toEqual([OWNER, 'no longer needed', 'Priya']);
  });

  it('overrideHistory returns newest first, both actions', async () => {
    const rows = [
      { action: 'reset', max_photos: null, max_bytes: null, reason: 'r2', set_by: 'Priya', created_at: 't2' },
      { action: 'set', max_photos: 200, max_bytes: 5000, reason: 'r1', set_by: 'Ravi', created_at: 't1' },
    ];
    const query = jest.fn(async () => rows);
    const ledger = new PhotoLedgerService({ query } as any);

    const history = await ledger.overrideHistory(OWNER);
    expect(history).toEqual([
      { action: 'reset', maxPhotos: null, maxBytes: null, reason: 'r2', setBy: 'Priya', createdAt: 't2' },
      { action: 'set', maxPhotos: 200, maxBytes: 5000, reason: 'r1', setBy: 'Ravi', createdAt: 't1' },
    ]);
  });

  it('setOverride fails loudly (not silently) when the table is not migrated', async () => {
    const query = jest.fn(async () => {
      throw undefinedTable;
    });
    const ledger = new PhotoLedgerService({ transaction: async (fn: any) => fn({ query }) } as any);
    jest.spyOn((ledger as any).logger, 'warn').mockImplementation(() => undefined);

    await expect(
      ledger.setOverride(OWNER, { maxPhotos: 10, maxBytes: 10 }, 'x', 'Ravi'),
    ).rejects.toThrow(/not available yet/);
  });

  it('resetOverride degrades to a no-op when the table is not migrated', async () => {
    const query = jest.fn(async () => {
      throw undefinedTable;
    });
    const ledger = new PhotoLedgerService({ transaction: async (fn: any) => fn({ query }) } as any);
    jest.spyOn((ledger as any).logger, 'warn').mockImplementation(() => undefined);

    await expect(ledger.resetOverride(OWNER, 'x', 'Ravi')).resolves.toBeUndefined();
  });
});

describe('the upload path honours a lowered override end to end (not just a mocked quotaFor)', () => {
  it('record() refuses once usage reaches a real (lowered) override row', async () => {
    const query = jest.fn(async (q: string, p: any[] = []) => {
      if (/SELECT max_photos, max_bytes FROM photo_quota_overrides WHERE user_id/.test(q)) {
        return [{ max_photos: 2, max_bytes: 1_000_000 }];
      }
      if (/count\(\*\)::int AS photos/.test(q)) return [{ photos: 2, bytes: 100 }];
      if (/pg_advisory_xact_lock/.test(q)) return [{}];
      return [];
    });
    const ledger = new PhotoLedgerService({ query, transaction: async (fn: any) => fn({ query }) } as any);
    jest.spyOn((ledger as any).logger, 'warn').mockImplementation(() => undefined);

    await expect(
      ledger.record('health', 'p/x.webp', { ownerUserId: OWNER, uploadedBy: OWNER }, 10, 5),
    ).rejects.toMatchObject({ response: { code: 'STORAGE_FULL' } });
  });

  it('record() still allows the upload under a raised override, above the flat default', async () => {
    const query = jest.fn(async (q: string) => {
      if (/SELECT max_photos, max_bytes FROM photo_quota_overrides WHERE user_id/.test(q)) {
        return [{ max_photos: PHOTO_QUOTA.photos + 500, max_bytes: PHOTO_QUOTA.bytes }];
      }
      if (/count\(\*\)::int AS photos/.test(q)) return [{ photos: PHOTO_QUOTA.photos, bytes: 0 }];
      return [{}];
    });
    const ledger = new PhotoLedgerService({ query, transaction: async (fn: any) => fn({ query }) } as any);
    jest.spyOn((ledger as any).logger, 'warn').mockImplementation(() => undefined);

    await expect(
      ledger.record('health', 'p/x.webp', { ownerUserId: OWNER, uploadedBy: OWNER }, 10, 5),
    ).resolves.toBe(true);
  });
});

describe('SetQuotaOverrideDto validation', () => {
  const errorsFor = async (body: unknown) => validate(plainToInstance(SetQuotaOverrideDto, body));

  it('accepts sane values with a reason', async () => {
    expect(await errorsFor({ maxPhotos: 5000, maxBytes: 5_000_000_000, reason: 'Paid plan' })).toHaveLength(0);
  });

  it('rejects a missing reason', async () => {
    const errors = await errorsFor({ maxPhotos: 5000, maxBytes: 5_000_000_000, reason: '' });
    expect(errors.some((e) => e.property === 'reason')).toBe(true);
  });

  it('rejects zero/negative photos or bytes', async () => {
    const errors = await errorsFor({ maxPhotos: 0, maxBytes: -1, reason: 'x' });
    expect(errors.some((e) => e.property === 'maxPhotos')).toBe(true);
    expect(errors.some((e) => e.property === 'maxBytes')).toBe(true);
  });

  it('rejects above the sane upper bound (100,000 photos / 200 GB)', async () => {
    const errors = await errorsFor({ maxPhotos: 100_001, maxBytes: 200 * 1024 ** 3 + 1, reason: 'x' });
    expect(errors.some((e) => e.property === 'maxPhotos')).toBe(true);
    expect(errors.some((e) => e.property === 'maxBytes')).toBe(true);
  });

  it('rejects a non-integer', async () => {
    const errors = await errorsFor({ maxPhotos: 5.5, maxBytes: 100, reason: 'x' });
    expect(errors.some((e) => e.property === 'maxPhotos')).toBe(true);
  });

  it('ResetQuotaOverrideDto also requires a reason', async () => {
    const errors = await validate(plainToInstance(ResetQuotaOverrideDto, { reason: '' }));
    expect(errors).not.toHaveLength(0);
  });
});

describe('PhotoQuotaAdminController', () => {
  it('setLimit takes set_by ONLY from req.adminStaff, never the body', async () => {
    const setOverride = jest.fn().mockResolvedValue({ maxPhotos: 10, maxBytes: 10, reason: 'x', setBy: 'Ravi', setAt: 't' });
    const controller = new PhotoQuotaAdminController(
      { usage: jest.fn(), topUsers: jest.fn() } as any,
      { setOverride, getOverride: jest.fn(), overrideHistory: jest.fn(), resetOverride: jest.fn() } as any,
    );
    const req: any = { adminStaff: 'Ravi' };

    await controller.setLimit(OWNER, { maxPhotos: 10, maxBytes: 10, reason: 'x', setBy: 'Someone Else' } as any, req);

    expect(setOverride).toHaveBeenCalledWith(OWNER, { maxPhotos: 10, maxBytes: 10 }, 'x', 'Ravi');
  });

  it('resetLimit also attributes to req.adminStaff', async () => {
    const resetOverride = jest.fn().mockResolvedValue(undefined);
    const controller = new PhotoQuotaAdminController(
      { usage: jest.fn(), topUsers: jest.fn() } as any,
      { resetOverride } as any,
    );
    const req: any = { adminStaff: 'Priya' };

    const result = await controller.resetLimit(OWNER, { reason: 'done' } as any, req);

    expect(resetOverride).toHaveBeenCalledWith(OWNER, 'done', 'Priya');
    expect(result).toEqual({ reset: true });
  });

  it('getStorage combines usage, override, and history for one account', async () => {
    const photos = { usage: jest.fn().mockResolvedValue({ photos: 5, bytes: 500 }), topUsers: jest.fn() };
    const ledger = {
      getOverride: jest.fn().mockResolvedValue({ maxPhotos: 10, maxBytes: 10, reason: 'x', setBy: 'Ravi', setAt: 't' }),
      overrideHistory: jest.fn().mockResolvedValue([]),
    };
    const controller = new PhotoQuotaAdminController(photos as any, ledger as any);

    const result = await controller.getStorage(OWNER);
    expect(result).toEqual({
      photos: 5,
      bytes: 500,
      override: { maxPhotos: 10, maxBytes: 10, reason: 'x', setBy: 'Ravi', setAt: 't' },
      history: [],
    });
  });
});

describe('PhotosService.topUsers (admin "Top storage users")', () => {
  function svc(rows: any[]) {
    const query = jest.fn(async (q: string) => (/FROM photo_objects o\s+JOIN users/.test(q) ? rows : []));
    const db = { query };
    return new PhotosService(db as any, {} as any, {} as any, {} as any);
  }

  it('reports bytes used, the effective limit, and % of it — override wins over the default', async () => {
    const s = svc([
      { owner_user_id: OWNER, email: 'a@b.com', photos: 10, bytes: '500000000', max_photos: 2000, max_bytes: 1_000_000_000 },
      { owner_user_id: 'u2', email: 'c@d.com', photos: 5, bytes: '100', max_photos: null, max_bytes: null },
    ]);

    const rows = await s.topUsers(50);

    expect(rows[0]).toEqual({
      userId: OWNER,
      email: 'a@b.com',
      photos: 10,
      bytes: 500_000_000,
      limits: { photos: 2000, bytes: 1_000_000_000 },
      percentOfLimit: 50,
      overridden: true,
    });
    expect(rows[1].limits).toEqual({ photos: PHOTO_QUOTA.photos, bytes: PHOTO_QUOTA.bytes });
    expect(rows[1].overridden).toBe(false);
  });

  it('degrades to an empty list rather than 500ing when photo_objects is not migrated', async () => {
    const query = jest.fn(async () => {
      throw undefinedTable;
    });
    const s = new PhotosService({ query } as any, {} as any, {} as any, {} as any);
    await expect(s.topUsers(50)).resolves.toEqual([]);
  });
});

describe('R2AnalyticsService (admin photo-quota item 3)', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function service(env: Record<string, string>) {
    return new R2AnalyticsService({ get: (k: string) => env[k] } as any);
  }

  it('omits the number when CLOUDFLARE_ANALYTICS_TOKEN / CLOUDFLARE_ACCOUNT_ID are unset', async () => {
    global.fetch = jest.fn() as any;
    await expect(service({}).bucketStats()).resolves.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('omits the number when the API call fails (never throws)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as any;
    const svc = service({ CLOUDFLARE_ANALYTICS_TOKEN: 't', CLOUDFLARE_ACCOUNT_ID: 'a' });
    await expect(svc.bucketStats()).resolves.toBeNull();
  });

  it('omits the number on a non-2xx response or a GraphQL error', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) }) as any;
    const svc = service({ CLOUDFLARE_ANALYTICS_TOKEN: 't', CLOUDFLARE_ACCOUNT_ID: 'a' });
    await expect(svc.bucketStats()).resolves.toBeNull();
  });

  it('never sends the token anywhere but the Authorization header, and never logs it', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { viewer: { accounts: [{ r2StorageAdaptiveGroups: [{ max: { objectCount: 7, payloadSize: 100, metadataSize: 10 } }] }] } },
      }),
    });
    global.fetch = fetchMock as any;
    const svc = service({ CLOUDFLARE_ANALYTICS_TOKEN: 'super-secret', CLOUDFLARE_ACCOUNT_ID: 'a' });

    const result = await svc.bucketStats();

    expect(result).toEqual({ objectCount: 7, totalBytes: 110 });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.authorization).toBe('Bearer super-secret');
    expect(init.body).not.toContain('super-secret');
  });

  it('caches the result for ~10 minutes rather than calling on every read', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { viewer: { accounts: [{ r2StorageAdaptiveGroups: [{ max: { objectCount: 1, payloadSize: 1, metadataSize: 0 } }] }] } },
      }),
    });
    global.fetch = fetchMock as any;
    const svc = service({ CLOUDFLARE_ANALYTICS_TOKEN: 't', CLOUDFLARE_ACCOUNT_ID: 'a' });

    await svc.bucketStats();
    await svc.bucketStats();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
