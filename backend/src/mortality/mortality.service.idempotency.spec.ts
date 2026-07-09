import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MortalityService } from './mortality.service';
import { MortalityRecord } from './mortality-record.entity';

const CLIENT_ID = '11111111-1111-1111-1111-111111111111';

describe('MortalityService — idempotent create (offline replay safety)', () => {
  let service: MortalityService;
  let repo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((e) => e),
      save: jest.fn().mockImplementation((e) => Promise.resolve({ ...e })),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MortalityService,
        { provide: getRepositoryToken(MortalityRecord), useValue: repo },
      ],
    }).compile();
    service = module.get(MortalityService);
  });

  it('returns the existing record and does NOT insert when the client id already exists for the same crop', async () => {
    const existing = { id: CLIENT_ID, cropId: 'crop-1', quantity: 10 };
    repo.findOne.mockResolvedValue(existing);

    const result = await service.create(
      {
        cropId: 'crop-1',
        recordDate: '2026-06-17',
        quantity: 10,
        id: CLIENT_ID,
      } as any,
      'user-1',
    );

    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: CLIENT_ID } });
    expect(repo.save).not.toHaveBeenCalled();
    expect(result).toBe(existing);
  });

  it('rejects (does not return the record) when the client id collides with a record on a different crop', async () => {
    // Cross-tenant IDOR guard: the OwnershipGuard only verified access to
    // dto.cropId — an id collision with a record on another crop must not
    // leak that record back to the caller.
    const existing = {
      id: CLIENT_ID,
      cropId: 'crop-owned-by-another-farm',
      quantity: 10,
    };
    repo.findOne.mockResolvedValue(existing);

    await expect(
      service.create(
        {
          cropId: 'crop-1',
          recordDate: '2026-06-17',
          quantity: 10,
          id: CLIENT_ID,
        } as any,
        'user-1',
      ),
    ).rejects.toThrow(
      'Mortality record id already exists for a different crop',
    );

    expect(repo.save).not.toHaveBeenCalled();
  });

  it('inserts when the client id is new', async () => {
    repo.findOne.mockResolvedValue(null);

    await service.create(
      {
        cropId: 'crop-1',
        recordDate: '2026-06-17',
        quantity: 10,
        id: CLIENT_ID,
      } as any,
      'user-1',
    );

    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('inserts normally when no client id is supplied', async () => {
    await service.create(
      { cropId: 'crop-1', recordDate: '2026-06-17', quantity: 10 } as any,
      'user-1',
    );

    expect(repo.findOne).not.toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledTimes(1);
  });
});
