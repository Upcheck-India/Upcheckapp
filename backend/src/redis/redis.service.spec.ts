import { RedisService } from './redis.service';

/** INFRA-1: warn loudly when Redis is absent in production. */
describe('RedisService — in-memory fallback warning (INFRA-1)', () => {
  const OLD_ENV = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = OLD_ENV;
  });

  function makeService() {
    const service = new RedisService({ get: jest.fn() } as any);
    const warnSpy = jest
      .spyOn((service as any).logger, 'warn')
      .mockImplementation(() => {});
    return { service, warnSpy };
  }

  it('warns about per-instance scope when falling back in production', () => {
    process.env.NODE_ENV = 'production';
    const { service, warnSpy } = makeService();
    (service as any).enableMemoryFallback('Redis down');
    const all = warnSpy.mock.calls.flat().join(' ');
    expect(all).toMatch(/per-instance/i);
    expect(all).toMatch(/2FA|Truecaller/);
  });

  it('does not emit the production warning in dev', () => {
    process.env.NODE_ENV = 'development';
    const { service, warnSpy } = makeService();
    (service as any).enableMemoryFallback('Redis down');
    const all = warnSpy.mock.calls.flat().join(' ');
    expect(all).not.toMatch(/per-instance/i);
  });

  it('falls back to the memory store for get/set once enabled', async () => {
    const { service } = makeService();
    (service as any).enableMemoryFallback('Redis down');
    await service.set('k', 'v');
    expect(await service.get('k')).toBe('v');
  });

  it('clears the fallback flag once Redis recovers (AUDIT id 109)', () => {
    const { service } = makeService();
    (service as any).enableMemoryFallback('Redis down');
    expect(service.isMemoryFallback).toBe(true);
    // 'ready' event handler registered in onModuleInit calls this.
    (service as any).handleReconnect();
    expect(service.isMemoryFallback).toBe(false);
  });
});
