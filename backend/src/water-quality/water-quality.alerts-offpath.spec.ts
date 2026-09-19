import { Logger } from '@nestjs/common';
import { WaterQualityService } from './water-quality.service';

/**
 * Alerts run after the response (the multi-pond "long spinner" fix).
 *
 * POST /water-quality used to await a species lookup, a supersede, an alert
 * insert and an Expo push before answering. The client only needs the saved
 * row. These pin the three things that must still hold once that work moves
 * off the response path: the reading is never lost, alerts are never
 * double-created, and a pond's alerts keep their supersede → create order.
 */
function makeService() {
  const order: string[] = [];
  let releasePush: () => void = () => undefined;
  const pushGate = new Promise<void>((r) => (releasePush = r));

  const repo = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ ...x, id: x.id ?? 'rec-1' })),
    query: jest.fn().mockResolvedValue([{ species: null }]),
  };
  const ponds = {
    findOneAccessible: jest.fn(async (pondId: string) => ({
      id: pondId,
      farmId: 'f1',
      activeCycleId: null,
    })),
  };
  const alerts = {
    supersedeOpenAlerts: jest.fn(async (_u: string, pondId: string) => {
      order.push(`supersede:${pondId}`);
    }),
    createAutoAlert: jest.fn(async (...args: any[]) => {
      await pushGate; // the slow Expo push
      order.push(`create:${args[6].recordId}`);
    }),
  };
  const farmAccess = { assertCanAccessPond: jest.fn() };
  const service = new WaterQualityService(
    repo as any,
    ponds as any,
    alerts as any,
    farmAccess as any,
  );
  return { service, repo, alerts, order, releasePush };
}

const flush = () => new Promise((r) => setImmediate(r));

describe('WaterQualityService.create — alerts off the response path', () => {
  it('answers with the saved reading before the alert push finishes', async () => {
    const { service, repo, alerts, releasePush } = makeService();

    const saved = await service.create(
      { id: 'r1', pondId: 'p1', dissolvedOxygen: 2 } as any,
      'u1',
    );

    // Resolved while the push is still blocked — the old code would hang here.
    expect(saved.id).toBe('r1');
    expect(repo.save).toHaveBeenCalledTimes(1);
    await flush();
    expect(alerts.createAutoAlert).toHaveBeenCalledTimes(1);

    releasePush();
    await flush();
    expect(alerts.createAutoAlert).toHaveBeenCalledTimes(1);
  });

  it('never fails the reading when alert work throws', async () => {
    const { service, alerts } = makeService();
    const logged = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    alerts.supersedeOpenAlerts.mockRejectedValue(new Error('db down'));
    alerts.createAutoAlert.mockRejectedValue(new Error('push down'));

    await expect(
      service.create({ id: 'r1', pondId: 'p1', dissolvedOxygen: 2 } as any, 'u1'),
    ).resolves.toMatchObject({ id: 'r1' });
    await flush();
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });

  it('a replayed record raises no alerts a second time', async () => {
    const { service, repo, alerts } = makeService();
    repo.findOne.mockResolvedValue({ id: 'r1', pondId: 'p1' });

    await service.create({ id: 'r1', pondId: 'p1', dissolvedOxygen: 2 } as any, 'u1');
    await flush();

    expect(repo.save).not.toHaveBeenCalled();
    expect(alerts.supersedeOpenAlerts).not.toHaveBeenCalled();
    expect(alerts.createAutoAlert).not.toHaveBeenCalled();
  });

  it("keeps a pond's supersede → create order across back-to-back readings", async () => {
    const { service, order, releasePush } = makeService();

    await service.create({ id: 'a', pondId: 'p1', dissolvedOxygen: 2 } as any, 'u1');
    await service.create({ id: 'b', pondId: 'p1', dissolvedOxygen: 2 } as any, 'u1');
    await flush();
    // B's supersede must wait for A's (blocked) create, or A's alert would
    // outlive the newer reading.
    expect(order).toEqual(['supersede:p1']);

    releasePush();
    await (service as any).alertChains.get('p1');
    expect(order).toEqual(['supersede:p1', 'create:a', 'supersede:p1', 'create:b']);
  });

  it('does not make one pond wait on another', async () => {
    const { service, order } = makeService();

    await service.create({ id: 'a', pondId: 'p1', dissolvedOxygen: 2 } as any, 'u1');
    await service.create({ id: 'b', pondId: 'p2', dissolvedOxygen: 2 } as any, 'u1');
    await flush();

    expect(order).toEqual(['supersede:p1', 'supersede:p2']);
  });
});
