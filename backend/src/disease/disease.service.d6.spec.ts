import { ForbiddenException } from '@nestjs/common';
import { DiseaseService } from './disease.service';
import { HealthPhotoStorageService } from '../health-observations/health-photo-storage.service';
import { R2StorageService } from '../storage/r2-storage.service';

const FARM_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const FARM_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const photo = (farm: string) => `${farm}/66666666-6666-4666-8666-666666666666.jpg`;

describe('DiseaseService — D6 record fields', () => {
  let repo: any;
  let service: DiseaseService;

  beforeEach(() => {
    repo = {
      findOne: jest.fn().mockResolvedValue(null),
      findOneBy: jest.fn().mockResolvedValue({ id: 'r1', cropId: 'c1', bannedSubstanceFlag: 'none', bannedSubstanceMatches: [] }),
      create: jest.fn((e) => e),
      save: jest.fn(async (e) => e),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      manager: { query: jest.fn().mockResolvedValue([{ farm_id: FARM_A }]) },
    };
    const photos = new HealthPhotoStorageService(new R2StorageService({ get: () => undefined } as any));
    service = new DiseaseService({} as any, {} as any, repo, photos);
  });

  const base = { cropId: 'c1', diseaseId: 'd1', recordedDate: '2026-09-19' };

  it("an old client's free-text severity is normalised on create", async () => {
    const r: any = await service.recordOccurrence({ ...base, severityAtDetection: 'Mild' }, 'u1');
    expect(r).toMatchObject({ severity: 'mild', severityAtDetection: 'Mild' });
    const h: any = await service.recordOccurrence({ ...base, severityAtDetection: 'high' }, 'u1');
    expect(h.severity).toBe('severe');
  });

  it('closing an episode stamps resolvedOn; reopening clears it', async () => {
    await service.updateRecord('r1', { outcome: 'recovered' }, 'u1');
    expect(repo.update.mock.calls[0][1].resolvedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await service.updateRecord('r1', { outcome: 'ongoing' }, 'u1');
    expect(repo.update.mock.calls[1][1].resolvedOn).toBeNull();
  });

  it("another farm's photo path → 403 on create and edit", async () => {
    await expect(
      service.recordOccurrence({ ...base, photoUrls: [photo(FARM_B)] }, 'u1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.updateRecord('r1', { photoUrls: [photo(FARM_B)] }, 'u1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.save).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });
});
