import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { SamplingService } from './sampling.service';
import { SamplingData } from './sampling-data.entity';
import { PondsService } from '../ponds/ponds.service';
import { FarmAccessService } from '../farm-access/farm-access.service';

const createMockRepository = () => ({
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest
    .fn()
    .mockImplementation((entity) =>
      Promise.resolve({ ...entity, id: 'test-id' }),
    ),
  findOne: jest.fn().mockResolvedValue(null),
});

describe('SamplingService.create', () => {
  let service: SamplingService;
  let mockRepository: any;
  let pondsService: any;

  const POND_ID = 'pond-1';

  beforeEach(async () => {
    mockRepository = createMockRepository();
    pondsService = {
      findOneAccessible: jest
        .fn()
        .mockResolvedValue({ id: POND_ID, activeCycleId: 'active-crop' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SamplingService,
        { provide: getRepositoryToken(SamplingData), useValue: mockRepository },
        { provide: PondsService, useValue: pondsService },
        { provide: FarmAccessService, useValue: { assertCanAccessPond: jest.fn() } },
      ],
    }).compile();

    service = module.get(SamplingService);
  });

  it('honors an explicit cropId instead of hardcoding the active cycle (AUDIT id 35)', async () => {
    const saved = await service.create(
      {
        pondId: POND_ID,
        cropId: 'other-crop',
        samplingDate: new Date().toISOString(),
      } as any,
      'user-1',
    );
    expect(saved.cropId).toBe('other-crop');
  });

  it('falls back to the pond active cycle when cropId is omitted', async () => {
    const saved = await service.create(
      { pondId: POND_ID, samplingDate: new Date().toISOString() } as any,
      'user-1',
    );
    expect(saved.cropId).toBe('active-crop');
  });

  it('rejects a samplingDate more than a day in the future', async () => {
    const future = new Date(Date.now() + 5 * 86_400_000).toISOString();
    await expect(
      service.create(
        { pondId: POND_ID, samplingDate: future } as any,
        'user-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
