import { ForbiddenException } from '@nestjs/common';
import { MortalityService } from './mortality.service';
import { HealthPhotoStorageService } from '../health-observations/health-photo-storage.service';
import { R2StorageService } from '../storage/r2-storage.service';

const FARM_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const FARM_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PHOTO = (farm: string) => `${farm}/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg`;
const PHOTO2 = (farm: string) => `${farm}/dddddddd-dddd-4ddd-8ddd-dddddddddddd.jpg`;

/**
 * H6: live population = stocked − SUM(estimated_total) (pond-context). A count
 * edit that left estimated_total alone kept population at the OLD count.
 */
describe('MortalityService.update — estimatedTotal follows quantity (H6)', () => {
  const row = { id: 'm1', cropId: 'c1', quantity: 10, estimatedTotal: 30 };
  let repo: { findOne: jest.Mock; update: jest.Mock; manager: { query: jest.Mock } };
  let service: MortalityService;

  beforeEach(() => {
    repo = {
      findOne: jest.fn().mockResolvedValue(row),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      // crop c1 lives on farm A
      manager: { query: jest.fn().mockResolvedValue([{ farm_id: FARM_A }]) },
    };
    const photos = new HealthPhotoStorageService(
      new R2StorageService({ get: () => undefined } as any),
      { enqueue: jest.fn().mockResolvedValue(true) } as any,
    );
    service = new MortalityService(repo as any, photos);
  });

  it('D6: a photo path from another farm is refused (403), nothing written', async () => {
    await expect(
      service.update('m1', { photoUrls: [PHOTO(FARM_B)] }, 'u1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("D6: the crop's own farm's photo path is accepted", async () => {
    await service.update('m1', { photoUrls: [PHOTO(FARM_A)], suspectedCause: 'disease' }, 'u1');
    expect(repo.update.mock.calls[0][1]).toMatchObject({ photoUrls: [PHOTO(FARM_A)], suspectedCause: 'disease' });
  });

  it('edit 10 → 20 recomputes 30 → 60, so population drops 30 more', async () => {
    const stocked = 100_000;
    const before = stocked - row.estimatedTotal;
    await service.update('m1', { quantity: 20 }, 'u1');
    const written = repo.update.mock.calls[0][1];
    expect(written).toMatchObject({ quantity: 20, estimatedTotal: 60 });
    expect(before - (stocked - written.estimatedTotal)).toBe(30);
  });

  it('keeps an explicit estimatedTotal', async () => {
    await service.update('m1', { quantity: 20, estimatedTotal: 45 }, 'u1');
    expect(repo.update.mock.calls[0][1]).toMatchObject({ estimatedTotal: 45 });
  });

  it('leaves estimatedTotal alone when quantity is not edited', async () => {
    await service.update('m1', { note: 'x' }, 'u1');
    expect(repo.update.mock.calls[0][1]).not.toHaveProperty('estimatedTotal');
  });
});

/** P2 + F1: dropping a photo path on update queues it and leaves a tombstone. */
describe('MortalityService.update — removing a photo (P2)', () => {
  const row = {
    id: 'm1',
    cropId: 'c1',
    quantity: 10,
    estimatedTotal: 30,
    note: 'original note',
    photoUrls: [PHOTO(FARM_A), PHOTO2(FARM_A)],
  };
  let repo: { findOne: jest.Mock; update: jest.Mock; manager: { query: jest.Mock } };
  let deletions: { enqueue: jest.Mock };
  let service: MortalityService;

  beforeEach(() => {
    repo = {
      findOne: jest.fn().mockResolvedValue(row),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      manager: { query: jest.fn().mockResolvedValue([{ farm_id: FARM_A }]) },
    };
    deletions = { enqueue: jest.fn().mockResolvedValue(true) };
    const photos = new HealthPhotoStorageService(
      new R2StorageService({ get: () => undefined } as any),
      deletions as any,
    );
    service = new MortalityService(repo as any, photos);
  });

  it('queues the dropped photo for deletion, AFTER the record saved', async () => {
    deletions.enqueue.mockImplementation(async () => {
      expect(repo.update).toHaveBeenCalled();
      return true;
    });
    await service.update('m1', { photoUrls: [PHOTO(FARM_A)] }, 'u1');
    expect(deletions.enqueue).toHaveBeenCalledWith(
      [{ namespace: 'health', path: PHOTO2(FARM_A) }],
      'photo_removed',
      'u1',
      undefined,
    );
  });

  it('appends a tombstone line to the note rather than silently dropping the photo', async () => {
    await service.update('m1', { photoUrls: [PHOTO(FARM_A)] }, 'u1');
    const written = repo.update.mock.calls[0][1];
    expect(written.note).toContain('original note');
    expect(written.note).toMatch(/1 photo removed by .+ on /);
  });

  it('leaves the note untouched when no photo is dropped (array unchanged)', async () => {
    await service.update('m1', { photoUrls: [PHOTO(FARM_A), PHOTO2(FARM_A)] }, 'u1');
    expect(repo.update.mock.calls[0][1]).not.toHaveProperty('note');
    expect(deletions.enqueue).not.toHaveBeenCalled();
  });

  it('leaves the note untouched when photoUrls is not part of the edit at all', async () => {
    await service.update('m1', { quantity: 12 }, 'u1');
    expect(repo.update.mock.calls[0][1]).not.toHaveProperty('note');
    expect(deletions.enqueue).not.toHaveBeenCalled();
  });

  it('a failed enqueue never blocks saving the record', async () => {
    deletions.enqueue.mockRejectedValue(new Error('db hiccup'));
    await expect(service.update('m1', { photoUrls: [] }, 'u1')).resolves.toBeDefined();
    expect(repo.update).toHaveBeenCalled();
  });
});
