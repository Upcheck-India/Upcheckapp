import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DiseaseService } from './disease.service';
import { DiseaseLibrary } from './disease-library.entity';
import { DiseaseRecord } from './disease-record.entity';
import { BANNED_LIST_VERSION } from '../banned-substances/banned-substances.data';

/**
 * BANNED-1 write-time flag on disease occurrence records. Same guarantee as
 * TreatmentsService (see treatments.service.banned-substance.spec.ts): the
 * flag is computed server-side from the record's own `notes` text at write
 * time, independent of anything the client sends.
 */
describe('DiseaseService.recordOccurrence/updateRecord — banned-substance flag (BANNED-1)', () => {
  let service: DiseaseService;
  let recordRepo: {
    findOne: jest.Mock;
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    recordRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      findOneBy: jest.fn(),
      create: jest.fn().mockImplementation((e) => e),
      save: jest.fn().mockImplementation((e) => Promise.resolve({ ...e })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiseaseService,
        { provide: getRepositoryToken(DiseaseLibrary), useValue: {} },
        { provide: getRepositoryToken(DiseaseRecord), useValue: recordRepo },
      ],
    }).compile();
    service = module.get(DiseaseService);
  });

  it('flags "banned" when notes reference a banned substance', async () => {
    const result = await service.recordOccurrence(
      {
        cropId: 'crop-1',
        diseaseId: 'disease-1',
        recordedDate: '2026-06-17',
        notes: 'Treated with colistin as a precaution',
      } as any,
      'user-1',
    );
    expect(result.bannedSubstanceFlag).toBe('banned');
    expect(result.bannedSubstanceMatches).toEqual(['Colistin']);
    expect(result.bannedSubstanceListVersion).toBe(BANNED_LIST_VERSION);
  });

  it('flags "none" for clean notes', async () => {
    const result = await service.recordOccurrence(
      {
        cropId: 'crop-1',
        diseaseId: 'disease-1',
        recordedDate: '2026-06-17',
        notes: 'Improved water quality, salt bath applied',
      } as any,
      'user-1',
    );
    expect(result.bannedSubstanceFlag).toBe('none');
    expect(result.bannedSubstanceMatches).toEqual([]);
  });

  it('flags "none" (not an error) when notes are absent entirely', async () => {
    const result = await service.recordOccurrence(
      { cropId: 'crop-1', diseaseId: 'disease-1', recordedDate: '2026-06-17' } as any,
      'user-1',
    );
    expect(result.bannedSubstanceFlag).toBe('none');
  });

  it('re-evaluates on update when notes change', async () => {
    recordRepo.findOneBy.mockResolvedValue({
      id: 'r-1',
      notes: 'Clean notes',
      bannedSubstanceFlag: 'none',
      bannedSubstanceMatches: [],
    });
    await service.updateRecord('r-1', { notes: 'Applied neomycin' } as any, 'user-1');

    expect(recordRepo.update).toHaveBeenCalledWith(
      'r-1',
      expect.objectContaining({
        bannedSubstanceFlag: 'banned',
        bannedSubstanceMatches: ['Neomycin'],
        bannedSubstanceListVersion: BANNED_LIST_VERSION,
      }),
    );
  });

  it('does not re-evaluate when the update does not touch notes', async () => {
    recordRepo.findOneBy.mockResolvedValue({
      id: 'r-1',
      notes: 'Applied neomycin',
      bannedSubstanceFlag: 'banned',
      bannedSubstanceMatches: ['Neomycin'],
    });
    await service.updateRecord('r-1', { severityAtDetection: 'high' } as any, 'user-1');

    const call = recordRepo.update.mock.calls[0][1];
    expect(call.bannedSubstanceFlag).toBe('banned');
    expect(call.bannedSubstanceListVersion).toBeUndefined();
  });
});
