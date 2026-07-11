import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TreatmentsService } from './treatments.service';
import { Treatment } from './treatment.entity';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { BANNED_LIST_VERSION } from '../banned-substances/banned-substances.data';

/**
 * BANNED-1 write-time flag — server-evaluated, independent of anything the
 * client sends. The global ValidationPipe (whitelist: true) already strips
 * any unknown property a client might try to forge (e.g. a fake
 * `bannedSubstanceFlag: 'none'` in the POST body never reaches the DTO), but
 * this test proves the SERVICE itself computes the real flag from the actual
 * description/notes text — the authoritative half of that guarantee.
 */
describe('TreatmentsService — banned-substance write-time flag (BANNED-1)', () => {
  let service: TreatmentsService;
  let repo: { findOne: jest.Mock; findOneBy: jest.Mock; create: jest.Mock; save: jest.Mock; update: jest.Mock };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn().mockResolvedValue(null),
      findOneBy: jest.fn(),
      create: jest.fn().mockImplementation((e) => e),
      save: jest.fn().mockImplementation((e) => Promise.resolve({ ...e })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TreatmentsService,
        { provide: getRepositoryToken(Treatment), useValue: repo },
        { provide: FarmAccessService, useValue: {} },
      ],
    }).compile();
    service = module.get(TreatmentsService);
  });

  it('flags "banned" and records the matched substance when the description references one', async () => {
    const result = await service.create(
      {
        cropId: 'crop-1',
        treatmentDate: '2026-06-17',
        description: 'Applied colistin to pond 3',
      } as any,
      'user-1',
    );
    expect(result.bannedSubstanceFlag).toBe('banned');
    expect(result.bannedSubstanceMatches).toEqual(['Colistin']);
    expect(result.bannedSubstanceListVersion).toBe(BANNED_LIST_VERSION);
  });

  it('flags "none" for clean text — never silently omits the field', async () => {
    const result = await service.create(
      { cropId: 'crop-1', treatmentDate: '2026-06-17', description: 'Applied probiotics' } as any,
      'user-1',
    );
    expect(result.bannedSubstanceFlag).toBe('none');
    expect(result.bannedSubstanceMatches).toEqual([]);
  });

  it('scans notes as well as description', async () => {
    const result = await service.create(
      {
        cropId: 'crop-1',
        treatmentDate: '2026-06-17',
        description: 'Routine dose',
        notes: 'Product: Neomycin-based mix',
      } as any,
      'user-1',
    );
    expect(result.bannedSubstanceFlag).toBe('banned');
    expect(result.bannedSubstanceMatches).toEqual(['Neomycin']);
  });

  it('ignores a client-forged bannedSubstanceFlag and recomputes from the real text', async () => {
    // Simulates what would reach the service if the whitelist strip ever had
    // a gap — the service itself must not trust a pre-set flag on the DTO.
    const result = await service.create(
      {
        cropId: 'crop-1',
        treatmentDate: '2026-06-17',
        description: 'Applied colistin',
        bannedSubstanceFlag: 'none',
        bannedSubstanceMatches: [],
      } as any,
      'user-1',
    );
    expect(result.bannedSubstanceFlag).toBe('banned');
    expect(result.bannedSubstanceMatches).toEqual(['Colistin']);
  });

  it('re-evaluates on update when the description changes', async () => {
    repo.findOneBy.mockResolvedValue({
      id: 't-1',
      description: 'Applied probiotics',
      notes: null,
      bannedSubstanceFlag: 'none',
      bannedSubstanceMatches: [],
    });
    await service.update('t-1', { description: 'Applied colistin instead' } as any, 'user-1');

    expect(repo.update).toHaveBeenCalledWith(
      't-1',
      expect.objectContaining({
        bannedSubstanceFlag: 'banned',
        bannedSubstanceMatches: ['Colistin'],
        bannedSubstanceListVersion: BANNED_LIST_VERSION,
      }),
    );
  });

  it('clears a stale flag on update when the flagged text is edited out', async () => {
    repo.findOneBy.mockResolvedValue({
      id: 't-1',
      description: 'Applied colistin',
      notes: null,
      bannedSubstanceFlag: 'banned',
      bannedSubstanceMatches: ['Colistin'],
    });
    await service.update('t-1', { description: 'Applied probiotics instead' } as any, 'user-1');

    expect(repo.update).toHaveBeenCalledWith(
      't-1',
      expect.objectContaining({ bannedSubstanceFlag: 'none', bannedSubstanceMatches: [] }),
    );
  });

  it('does not re-evaluate on an update that touches neither description nor notes', async () => {
    repo.findOneBy.mockResolvedValue({
      id: 't-1',
      description: 'Applied colistin',
      notes: null,
      bannedSubstanceFlag: 'banned',
      bannedSubstanceMatches: ['Colistin'],
    });
    await service.update('t-1', { dosageKg: 2.5 } as any, 'user-1');

    expect(repo.update).toHaveBeenCalledWith(
      't-1',
      expect.objectContaining({ bannedSubstanceFlag: 'banned', bannedSubstanceMatches: ['Colistin'] }),
    );
    // Version stamp untouched since nothing was re-evaluated.
    const call = repo.update.mock.calls[0][1];
    expect(call.bannedSubstanceListVersion).toBeUndefined();
  });
});
