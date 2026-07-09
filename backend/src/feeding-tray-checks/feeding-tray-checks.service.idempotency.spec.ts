import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FeedingTrayChecksService } from './feeding-tray-checks.service';
import { FeedingTrayCheck } from './feeding-tray-check.entity';
import { FarmAccessService } from '../farm-access/farm-access.service';

const CLIENT_ID = '11111111-1111-1111-1111-111111111111';

describe('FeedingTrayChecksService — idempotent create (SYNC-2 offline replay)', () => {
  let service: FeedingTrayChecksService;
  let repo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((e) => e),
      save: jest.fn().mockImplementation((e) => Promise.resolve({ ...e })),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedingTrayChecksService,
        { provide: getRepositoryToken(FeedingTrayCheck), useValue: repo },
        { provide: FarmAccessService, useValue: {} },
      ],
    }).compile();
    service = module.get(FeedingTrayChecksService);
  });

  const payload = (id?: string) => ({
    cropId: 'crop-1',
    checkDate: '2026-06-17',
    checkTime: '08:00',
    trayNumber: 1,
    remainingFeedStatus: 'empty',
    ...(id ? { id } : {}),
  });

  it('returns the existing row and does NOT insert on a same-id, same-crop replay', async () => {
    const existing = { id: CLIENT_ID, cropId: 'crop-1' };
    repo.findOne.mockResolvedValue(existing);
    const result = await service.create(payload(CLIENT_ID) as any, 'user-1');
    expect(result).toBe(existing);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rejects a client id colliding with a record on a different crop (IDOR)', async () => {
    repo.findOne.mockResolvedValue({ id: CLIENT_ID, cropId: 'other-crop' });
    await expect(
      service.create(payload(CLIENT_ID) as any, 'user-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('inserts when the client id is new', async () => {
    repo.findOne.mockResolvedValue(null);
    await service.create(payload(CLIENT_ID) as any, 'user-1');
    expect(repo.save).toHaveBeenCalledTimes(1);
  });
});
