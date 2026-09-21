import { lastValueFrom, of, throwError } from 'rxjs';
import { RedisService } from '../redis/redis.service';
import {
  ResponseCacheInterceptor,
  ResponseCacheInvalidationInterceptor,
  ResponseCacheService,
  userCacheKey,
} from './response-cache';

/** A RedisService that never connected runs on its in-memory store. */
const memoryRedis = () => new RedisService({ get: () => undefined } as any);

const ctx = (req: any) =>
  ({
    getType: () => 'http',
    getHandler: () => () => undefined,
    switchToHttp: () => ({ getRequest: () => req }),
  }) as any;

const get = (userId: string, url = '/api/alert-center/today') => ({
  method: 'GET',
  originalUrl: url,
  user: { id: userId },
});

function build(redis: any = memoryRedis(), coMembers: Record<string, string[]> = {}) {
  const dataSource = {
    query: jest.fn(async (_sql: string, [u]: string[]) => (coMembers[u] ?? []).map((id) => ({ id }))),
  };
  const cache = new ResponseCacheService(redis, dataSource as any);
  const reader = new ResponseCacheInterceptor(cache, { get: () => 60 } as any);
  const writer = new ResponseCacheInvalidationInterceptor(cache);
  let calls = 0;
  /** Each call returns a body naming whose view it is and how many times it ran. */
  const read = (userId: string, url?: string) =>
    lastValueFrom(
      reader.intercept(ctx(get(userId, url)), {
        handle: () => of({ user: userId, n: ++calls }),
      }),
    );
  const write = (userId: string, fail = false) =>
    lastValueFrom(
      writer.intercept(ctx({ method: 'POST', originalUrl: '/api/water-quality', user: { id: userId } }), {
        handle: () => (fail ? throwError(() => new Error('boom')) : of({ saved: true })),
      }),
    );
  return { cache, read, write, redis, dataSource, calls: () => calls };
}

describe('response cache — reads', () => {
  it('misses once, then serves the cached body without running the handler', async () => {
    const t = build();
    expect(await t.read('A')).toEqual({ user: 'A', n: 1 });
    expect(await t.read('A')).toEqual({ user: 'A', n: 1 });
    expect(t.calls()).toBe(1);
  });

  it('keys by full URL — another query string is another entry', async () => {
    const t = build();
    await t.read('A', '/api/daily-brief?date=2026-09-20');
    expect(await t.read('A', '/api/daily-brief?date=2026-09-21')).toEqual({ user: 'A', n: 2 });
  });

  it('never serves one user’s view to another (roles/scopes differ per user)', async () => {
    const t = build();
    await t.read('owner');
    expect(await t.read('worker')).toEqual({ user: 'worker', n: 2 });
    expect(await t.read('owner')).toEqual({ user: 'owner', n: 1 });
  });

  it('expires after its TTL', async () => {
    const t = build();
    const now = jest.spyOn(Date, 'now');
    now.mockReturnValue(1_000_000);
    await t.read('A');
    now.mockReturnValue(1_000_000 + 61_000);
    expect(await t.read('A')).toEqual({ user: 'A', n: 2 });
    now.mockRestore();
  });

  it('fails open when Redis errors', async () => {
    const broken = {
      hget: jest.fn().mockRejectedValue(new Error('down')),
      hsetWithExpiry: jest.fn().mockRejectedValue(new Error('down')),
      delMany: jest.fn().mockRejectedValue(new Error('down')),
    };
    const t = build(broken);
    expect(await t.read('A')).toEqual({ user: 'A', n: 1 });
    expect(await t.read('A')).toEqual({ user: 'A', n: 2 });
    await expect(t.write('A')).resolves.toEqual({ saved: true });
  });

  it('fails open when Redis hangs (bounded wait)', async () => {
    const never = () => new Promise<never>(() => undefined);
    const t = build({ hget: never, hsetWithExpiry: never, delMany: never });
    expect(await t.read('A')).toEqual({ user: 'A', n: 1 });
  });

  it('does not cache non-GETs or anonymous calls', async () => {
    const t = build();
    const reader = new ResponseCacheInterceptor(t.cache, { get: () => 60 } as any);
    let n = 0;
    const run = (req: any) => lastValueFrom(reader.intercept(ctx(req), { handle: () => of(++n) }));
    await run({ method: 'GET', originalUrl: '/x' });
    await run({ method: 'GET', originalUrl: '/x' });
    expect(n).toBe(2);
  });
});

describe('response cache — invalidation on write', () => {
  it('drops the writer’s and every co-member’s cache, not strangers’', async () => {
    const t = build(memoryRedis(), { A: ['B'] });
    await t.read('A');
    await t.read('B');
    await t.read('C');
    await t.write('A');
    expect(await t.read('A')).toEqual({ user: 'A', n: 4 });
    expect(await t.read('B')).toEqual({ user: 'B', n: 5 });
    expect(await t.read('C')).toEqual({ user: 'C', n: 3 });
  });

  it('has invalidated before the write’s response is emitted', async () => {
    const t = build();
    await t.read('A');
    await t.write('A');
    expect(await t.redis.hget(userCacheKey('A'), '/api/alert-center/today')).toBeNull();
  });

  it('looks co-members up BEFORE the write runs (a removed member is still invalidated)', async () => {
    const t = build(memoryRedis(), { A: ['B'] });
    const order: string[] = [];
    t.dataSource.query.mockImplementation(async () => {
      order.push('lookup');
      return [{ id: 'B' }];
    });
    const writer = new ResponseCacheInvalidationInterceptor(t.cache);
    await lastValueFrom(
      writer.intercept(ctx({ method: 'DELETE', user: { id: 'A' } }), {
        handle: () => {
          order.push('handler');
          return of(null);
        },
      }),
    );
    expect(order).toEqual(['lookup', 'handler']);
  });

  it('a failed write invalidates nothing and still fails', async () => {
    const t = build();
    await t.read('A');
    await expect(t.write('A', true)).rejects.toThrow('boom');
    expect(await t.read('A')).toEqual({ user: 'A', n: 1 });
  });

  it('falls back to the writer alone if the co-member lookup fails', async () => {
    const t = build();
    t.dataSource.query.mockRejectedValue(new Error('db'));
    await expect(t.cache.usersSharingFarmsWith('A')).resolves.toEqual(['A']);
  });

  it('ignores GETs', async () => {
    const t = build();
    const writer = new ResponseCacheInvalidationInterceptor(t.cache);
    await lastValueFrom(writer.intercept(ctx(get('A')), { handle: () => of(1) }));
    expect(t.dataSource.query).not.toHaveBeenCalled();
  });
});
