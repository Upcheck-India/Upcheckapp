import { ForbiddenException } from '@nestjs/common';
import { MortalityService } from './mortality.service';
import { HealthPhotoStorageService } from '../health-observations/health-photo-storage.service';

const FARM_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const FARM_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PHOTO = (farm: string) => `${farm}/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg`;

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
    const photos = new HealthPhotoStorageService({ get: () => undefined } as any);
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
