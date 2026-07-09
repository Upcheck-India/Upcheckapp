import { EngineAlertService } from './engine-alert.service';
import { LunarService } from '../lunar/lunar.service';

function makeService() {
  return new EngineAlertService(
    null as any, // pondRepo (unused by evaluate)
    null as any, // pondContext
    new LunarService(),
    null as any, // alertCenter
    null as any, // farmAccess (unused by evaluate)
  );
}

const baseCtx: any = {
  pondId: 'p1',
  waterQuality: { dissolvedOxygen: 6, ph: 8, temperature: 30 },
  freeAmmoniaMgL: null,
  abwG: null,
  runningFcr: null,
};

describe('EngineAlertService.evaluate', () => {
  const svc = makeService();

  it('emits a critical ammonia alert when free NH3 is toxic', () => {
    const drafts = svc.evaluate({ ...baseCtx, freeAmmoniaMgL: 0.45 });
    const a = drafts.find((d) => d.source === 'water');
    expect(a?.severity).toBe('critical');
    expect(a?.title).toMatch(/ammonia/i);
    expect(a?.steps.length).toBeGreaterThan(0);
  });

  it('emits a low-DO alert (critical under 3, watch under 4)', () => {
    expect(
      svc
        .evaluate({ ...baseCtx, waterQuality: { dissolvedOxygen: 2.5 } })
        .find((d) => d.source === 'aeration')?.severity,
    ).toBe('critical');
    expect(
      svc
        .evaluate({ ...baseCtx, waterQuality: { dissolvedOxygen: 3.6 } })
        .find((d) => d.source === 'aeration')?.severity,
    ).toBe('watch');
    // Healthy DO → no aeration alert.
    expect(
      svc
        .evaluate({ ...baseCtx, waterQuality: { dissolvedOxygen: 6 } })
        .find((d) => d.source === 'aeration'),
    ).toBeUndefined();
  });

  it('flags poor feed efficiency when running FCR is high', () => {
    expect(
      svc
        .evaluate({ ...baseCtx, runningFcr: 2.1 })
        .find((d) => d.source === 'feed')?.severity,
    ).toBe('watch');
    expect(
      svc
        .evaluate({ ...baseCtx, runningFcr: 1.3 })
        .find((d) => d.source === 'feed'),
    ).toBeUndefined();
  });

  it('emits nothing when everything is healthy', () => {
    expect(svc.evaluate(baseCtx)).toEqual([]);
  });
});
