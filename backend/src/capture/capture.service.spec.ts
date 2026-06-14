import { CaptureService } from './capture.service';

function makeService() {
  const created: any[] = [];
  const measurements = {
    create: jest.fn(async (dto: any) => {
      created.push(dto);
      return { id: `m${created.length}`, ...dto };
    }),
  };
  return { svc: new CaptureService(measurements as any), created, measurements };
}

describe('CaptureService (data_collection_audit §2)', () => {
  it('computes CV from individual sample weights', () => {
    const svc = makeService().svc;
    // [10,12,14,16,18] → mean 14, SD √8 = 2.83, CV 20.2 %
    const cv = svc.computeCv([10, 12, 14, 16, 18]);
    expect(cv.mbw).toBe(14);
    expect(cv.sd).toBeCloseTo(2.83, 2);
    expect(cv.cvPct).toBeCloseTo(20.2, 1);
    expect(svc.computeCv([]).cvPct).toBe(0);
  });

  it('records sampling as ABW + CV measurements through the pipeline', async () => {
    const { svc, created } = makeService();
    const { cv } = await svc.recordSampling('pond-1', 'crop-1', [10, 12, 14, 16, 18], 'u');
    const abw = created.find((d) => d.param === 'abw');
    const cvM = created.find((d) => d.param === 'cv');
    expect(abw.valueNum).toBe(14);
    expect(cvM.valueNum).toBeCloseTo(20.2, 1);
    expect(cv.mbw).toBe(14);
    expect(created.every((d) => d.source === 'manual' && d.pondId === 'pond-1')).toBe(true);
  });

  it('records clinical signs as boolean (0/1) and categorical measurements', async () => {
    const { svc, created } = makeService();
    await svc.recordClinicalSigns(
      'pond-1',
      'crop-1',
      { white_feces: true, red_body: false, gut_fullness: 'partial' },
      'u',
    );
    expect(created.find((d) => d.param === 'white_feces').valueNum).toBe(1);
    expect(created.find((d) => d.param === 'red_body').valueNum).toBe(0);
    expect(created.find((d) => d.param === 'gut_fullness').valueText).toBe('partial');
  });

  it('records a water-exchange event as pct / volume / source', async () => {
    const { svc, created } = makeService();
    await svc.recordWaterExchange('pond-1', 'crop-1', { pct: 30, volumeM3: 600, source: 'creek' }, 'u');
    expect(created.find((d) => d.param === 'water_exchange_pct').valueNum).toBe(30);
    expect(created.find((d) => d.param === 'water_exchange_volume').valueNum).toBe(600);
    expect(created.find((d) => d.param === 'water_exchange_source').valueText).toBe('creek');
  });
});
