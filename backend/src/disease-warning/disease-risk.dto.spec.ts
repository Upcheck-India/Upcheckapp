import { BadRequestException, ValidationPipe } from '@nestjs/common';
import {
  DiseaseIndicatorsDto,
  DiseaseRiskSnapshotDto,
} from './dto/disease-risk.dto';
import { DiseaseWarningService } from './disease-warning.service';

/** S4: both /disease-risk bodies are validated; cropId must be the pond's active crop. */
const pipe = new ValidationPipe({ whitelist: true, transform: true });
const run = (metatype: any, value: any) =>
  pipe.transform(value, { type: 'body', metatype });

const svc = new DiseaseWarningService(null as any, null as any);

// Every indicator the engine reads, all set.
const ALL_KEYS = [
  'tempDrop3in48h', 'doBelow4', 'seasonWinter', 'regionalWssv', 'redBody',
  'docBelow35', 'yellowVibrioUp', 'emptyGut', 'paleHp', 'sizeCvUp',
  'adgBelowExpected', 'whiteFecesTray', 'regionWfd', 'vibrioUp', 'ehpRiskUp',
  'luminousVibrioUp', 'nightGlow', 'chronicDailyMortality', 'multiStress',
  'looseShellObs', 'mineralDeficit', 'hpStress',
];

describe('POST /disease-risk/compute body (DiseaseIndicatorsDto)', () => {
  it('keeps every indicator, so scores are unchanged by validation', async () => {
    const raw = Object.fromEntries(ALL_KEYS.map((k) => [k, true]));
    const out = await run(DiseaseIndicatorsDto, { ...raw });
    expect(svc.computeRisks(out)).toEqual(svc.computeRisks(raw));
    expect(svc.computeRisks(out)[0].score).toBeGreaterThan(0);
  });

  it('rejects a non-boolean indicator', async () => {
    await expect(run(DiseaseIndicatorsDto, { doBelow4: 'yes' })).rejects.toThrow(
      BadRequestException,
    );
  });
});

describe('POST /disease-risk body (DiseaseRiskSnapshotDto)', () => {
  const POND = '11111111-1111-4111-8111-111111111111';
  const CROP = '22222222-2222-4222-8222-222222222222';

  it('rejects a non-uuid cropId', async () => {
    await expect(
      run(DiseaseRiskSnapshotDto, {
        pondId: POND,
        cropId: 'x',
        date: '2026-09-19',
        indicators: {},
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("refuses a cropId that is not the pond's active crop", async () => {
    const repo = { create: jest.fn((x) => x), save: jest.fn(async (x) => x) };
    const ponds = {
      findOneAccessible: jest.fn().mockResolvedValue({ id: POND, activeCycleId: CROP }),
    };
    const service = new DiseaseWarningService(repo as any, ponds as any);
    await expect(
      service.snapshot(POND, '2026-09-19', {}, 'u1', 'foreign-crop'),
    ).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();

    await service.snapshot(POND, '2026-09-19', {}, 'u1', CROP);
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ pondId: POND, cropId: CROP }),
    );
  });
});
