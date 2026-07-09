import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';

// Direct instantiation with stubs — the controller has no Nest-only wiring.
const makeController = (opts: { dbOk: boolean; redisMemory: boolean }) => {
  const dataSource = {
    query: opts.dbOk
      ? jest.fn().mockResolvedValue([{ '?column?': 1 }])
      : jest.fn().mockRejectedValue(new Error('connection refused')),
  };
  const redis = { isMemoryFallback: opts.redisMemory };
  return new HealthController(dataSource as any, redis as any);
};

describe('HealthController.check', () => {
  it('returns ok with redis up when everything is healthy', async () => {
    const res = await makeController({
      dbOk: true,
      redisMemory: false,
    }).check();
    expect(res.status).toBe('ok');
    expect(res.checks.database.status).toBe('up');
    expect(res.checks.redis.status).toBe('up');
  });

  it('reports redis degraded on the in-memory fallback (still ok overall)', async () => {
    const res = await makeController({ dbOk: true, redisMemory: true }).check();
    expect(res.status).toBe('ok');
    expect(res.checks.redis.status).toBe('degraded');
  });

  it('throws 503 when the database probe fails', async () => {
    await expect(
      makeController({ dbOk: false, redisMemory: false }).check(),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
