import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { ComplianceService } from '../compliance/compliance.service';
import { nextFlagHistory } from '../compliance/compliance-eval';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DiseaseLibrary } from './disease-library.entity';
import { DiseaseLibraryTranslation } from './disease-library-translation.entity';
import { DiseaseRecord } from './disease-record.entity';

/**
 * Postgres "undefined_table" (42P01) — the same code as farm-access.service.ts
 * checks for disease_library_translations not existing yet because its
 * migration hasn't been run. Every disease-library GET now always sends a
 * `lang`, so without this guard the very first non-English request after
 * this feature deployed (before the migration ran) 500s for everyone on
 * that language — this is deliberately fail-safe to plain English instead.
 */
function isMissingTable(err: any): boolean {
  return (err?.code ?? err?.driverError?.code) === '42P01';
}
import {
  CreateDiseaseDto,
  CreateDiseaseRecordDto,
} from './dto/create-disease.dto';
import { UpdateDiseaseLibraryDto } from './dto/update-disease-library.dto';
import { UpdateDiseaseRecordDto } from './dto/update-disease-record.dto';
import { evaluateBannedSubstances } from '../banned-substances/banned-substance-matcher';
import { BANNED_LIST_VERSION } from '../banned-substances/banned-substances.data';
import { normaliseSeverity } from '../health-observations/health.constants';
import {
  HealthPhotoStorageService,
  farmIdOfCrop,
} from '../health-observations/health-photo-storage.service';
import { removedPhotoTombstone } from '../health-observations/photo-removal.util';
import { toIstDateString } from '../common/ist-date';

// Library text must never recommend antibiotics (spec 2026-09-19 D0/S3) —
// `disease-library.safety.spec.ts` enforces it.
export const DISEASE_SEED_DATA: CreateDiseaseDto[] = [
  {
    name: 'AHPND/EMS',
    scientificName: 'Acute Hepatopancreatic Necrosis Disease',
    commonNames: ['EMS', 'Early Mortality Syndrome'],
    symptoms: [
      'Empty stomach',
      'Pale hepatopancreas',
      'Soft shells',
      'Sluggish swimming',
    ],
    preventionMeasures: ['Quarantine', 'Good water quality', 'Disinfection'],
    treatmentRecommendations: [
      'Probiotics',
      'Water exchange',
      'Lime application',
    ],
    imageUrls: [],
    severityLevel: 'high',
  },
  {
    name: 'WSSV',
    scientificName: 'White Spot Syndrome Virus',
    commonNames: ['White Spot'],
    symptoms: ['White inclusions on carapace', 'Reduced feeding', 'Mortality'],
    preventionMeasures: ['Biosecurity', 'Screening'],
    treatmentRecommendations: ['No cure', 'Cull infected ponds'],
    imageUrls: [],
    severityLevel: 'high',
  },
  {
    name: 'EHP',
    scientificName: 'Enterocytozoon hepatopenaei',
    commonNames: ['EHP'],
    symptoms: [
      'Growth retardation',
      'White feces syndrome',
      'Reduced feed conversion',
    ],
    preventionMeasures: ['Use SPF post-larvae', 'Biosecurity'],
    treatmentRecommendations: [
      'No effective treatment',
      'Remove and disinfect',
    ],
    imageUrls: [],
    severityLevel: 'medium',
  },
  {
    name: 'IMNV',
    scientificName: 'Infectious Myonecrosis Virus',
    commonNames: ['IMN'],
    symptoms: ['Muscle necrosis', 'White necrotic lesions', 'High mortality'],
    preventionMeasures: ['SPF stocks', 'Biosecurity'],
    treatmentRecommendations: ['No cure', 'Cull'],
    imageUrls: [],
    severityLevel: 'high',
  },
  {
    name: 'Vibriosis',
    scientificName: 'Vibrio spp.',
    commonNames: ['Luminescent Vibriosis', 'Shell disease'],
    symptoms: ['Luminescence', 'Necrotic lesions', 'Red discoloration'],
    preventionMeasures: ['Probiotics', 'Good water quality'],
    treatmentRecommendations: [
      'Consult a fisheries officer or aquatic animal health lab',
      'Probiotics',
      'Water exchange',
    ],
    imageUrls: [],
    severityLevel: 'medium',
  },
  {
    name: 'Black Gill Disease',
    scientificName: 'Various fungi/bacteria',
    commonNames: ['Black gill'],
    symptoms: ['Black gill filaments', 'Reduced respiration'],
    preventionMeasures: ['Good water quality'],
    treatmentRecommendations: ['Water exchange', 'Lime'],
    imageUrls: [],
    severityLevel: 'low',
  },
  {
    name: 'Running Mortality Syndrome',
    scientificName: 'Running Mortality Syndrome',
    commonNames: ['RMS'],
    symptoms: ['Progressive mortality', 'Soft shells', 'Pale hepatopancreas'],
    preventionMeasures: ['Biosecurity', 'Quarantine'],
    treatmentRecommendations: ['Probiotics', 'Vitamins'],
    imageUrls: [],
    severityLevel: 'high',
  },
  {
    name: 'Shell Disease',
    scientificName: 'Shell Disease',
    commonNames: ['Brown spot'],
    symptoms: ['Brown/black spots on shell', 'Shell erosion'],
    preventionMeasures: ['Good water quality', 'Avoid injury'],
    treatmentRecommendations: ['Lime application', 'Improve water quality'],
    imageUrls: [],
    severityLevel: 'low',
  },
  {
    name: 'Taura Syndrome Virus',
    scientificName: 'Taura Syndrome Virus',
    commonNames: ['TSV'],
    symptoms: ['Cuticular epithelium lesions', 'Red tail'],
    preventionMeasures: ['SPF stocks', 'Biosecurity'],
    treatmentRecommendations: ['No cure', 'Cull'],
    imageUrls: [],
    severityLevel: 'high',
  },
  {
    name: 'Yellow Head Virus',
    scientificName: 'Yellow Head Virus',
    commonNames: ['YHV'],
    symptoms: ['Yellow head', 'Reduced feeding', 'Mortality'],
    preventionMeasures: ['SPF stocks', 'Screening'],
    treatmentRecommendations: ['No cure', 'Cull'],
    imageUrls: [],
    severityLevel: 'high',
  },
];

// Locales this table actually stores translations for — matches the
// frontend's non-English languages (frontend/src/i18n/languages.ts). 'en' is
// never looked up: the disease_library row itself IS the English content.
const TRANSLATABLE_LOCALES = ['hi', 'ta', 'te', 'bn', 'or'];

@Injectable()
export class DiseaseService {
  private readonly logger = new Logger(DiseaseService.name);

  constructor(
    @InjectRepository(DiseaseLibrary)
    private diseaseLibraryRepository: Repository<DiseaseLibrary>,
    @InjectRepository(DiseaseLibraryTranslation)
    private diseaseLibraryTranslationRepository: Repository<DiseaseLibraryTranslation>,
    @InjectRepository(DiseaseRecord)
    private diseaseRecordRepository: Repository<DiseaseRecord>,
    private readonly photos: HealthPhotoStorageService,
    // @Optional so the library-only specs need no stub; always present in the app.
    @Optional() private readonly compliance?: ComplianceService,
  ) {}

  // --- Library Methods ---

  async createDisease(dto: CreateDiseaseDto): Promise<DiseaseLibrary> {
    const disease = this.diseaseLibraryRepository.create(dto);
    return this.diseaseLibraryRepository.save(disease);
  }

  /**
   * Merge each disease with its locale's translation, if one exists — a
   * disease with no translation row yet (or an empty array field on one)
   * silently falls back to the English disease_library value for that
   * field, never a blank result.
   */
  private async applyLocale(
    diseases: DiseaseLibrary[],
    locale?: string,
  ): Promise<DiseaseLibrary[]> {
    if (!locale || !TRANSLATABLE_LOCALES.includes(locale) || diseases.length === 0) {
      return diseases;
    }
    let translations: DiseaseLibraryTranslation[];
    try {
      translations = await this.diseaseLibraryTranslationRepository.find({
        where: { diseaseId: In(diseases.map((d) => d.id)), locale },
      });
    } catch (err) {
      if (!isMissingTable(err)) throw err;
      this.logger.warn(
        'disease_library_translations table missing — run migrations; serving English disease content',
      );
      return diseases;
    }
    const byDiseaseId = new Map(translations.map((t) => [t.diseaseId, t]));
    return diseases.map((d) => {
      const t = byDiseaseId.get(d.id);
      if (!t) return d;
      return {
        ...d,
        symptoms: t.symptoms?.length ? t.symptoms : d.symptoms,
        preventionMeasures: t.preventionMeasures?.length
          ? t.preventionMeasures
          : d.preventionMeasures,
        treatmentRecommendations: t.treatmentRecommendations?.length
          ? t.treatmentRecommendations
          : d.treatmentRecommendations,
      };
    });
  }

  async findAllDiseases(locale?: string): Promise<DiseaseLibrary[]> {
    const diseases = await this.diseaseLibraryRepository.find({
      order: { name: 'ASC' },
    });
    return this.applyLocale(diseases, locale);
  }

  async findDiseaseById(id: string, locale?: string): Promise<DiseaseLibrary> {
    const disease = await this.diseaseLibraryRepository.findOne({
      where: { id },
    });
    if (!disease) throw new NotFoundException('Disease not found');
    const [localized] = await this.applyLocale([disease], locale);
    return localized;
  }

  async updateLibrary(
    id: string,
    dto: UpdateDiseaseLibraryDto,
  ): Promise<DiseaseLibrary> {
    const disease = await this.findDiseaseById(id);
    Object.assign(disease, dto);
    return this.diseaseLibraryRepository.save(disease);
  }

  async removeLibrary(id: string): Promise<void> {
    const disease = await this.findDiseaseById(id);
    // disease_records.disease_id is NOT NULL + ON DELETE RESTRICT (H5): a
    // library row that farms have logged can't go. Say so instead of a 500.
    const inUse = await this.diseaseRecordRepository.count({
      where: { diseaseId: id },
    });
    if (inUse > 0) {
      throw new ConflictException(
        `Disease is in use by ${inUse} record(s) and cannot be deleted`,
      );
    }
    try {
      await this.diseaseLibraryRepository.remove(disease);
    } catch (err: any) {
      // A record logged between the count and the delete (FK violation).
      if ((err?.code ?? err?.driverError?.code) === '23503') {
        throw new ConflictException('Disease is in use and cannot be deleted');
      }
      throw err;
    }
  }

  async searchLibrary(query: string, locale?: string): Promise<DiseaseLibrary[]> {
    // Matching stays against the English name/scientificName/commonNames —
    // those are never translated (see disease-library-translation.entity.ts)
    // — only the RETURNED symptoms/prevention/treatment text is localized.
    const q = `%${query}%`;
    const diseases = await this.diseaseLibraryRepository
      .createQueryBuilder('d')
      .where('d.name ILIKE :q', { q })
      .orWhere('d.scientific_name ILIKE :q', { q })
      .orWhere(
        'EXISTS (SELECT 1 FROM unnest(d.common_names) AS cn WHERE cn ILIKE :q)',
        { q },
      )
      .orderBy('d.name', 'ASC')
      .getMany();
    return this.applyLocale(diseases, locale);
  }

  async seedDiseases(): Promise<{ seeded: boolean; count: number }> {
    const count = await this.diseaseLibraryRepository.count();
    if (count > 0) {
      return { seeded: false, count };
    }
    const entities = DISEASE_SEED_DATA.map((dto) =>
      this.diseaseLibraryRepository.create(dto),
    );
    await this.diseaseLibraryRepository.save(entities);
    return { seeded: true, count: DISEASE_SEED_DATA.length };
  }

  // --- Record Methods ---

  async recordOccurrence(
    dto: CreateDiseaseRecordDto,
    userId?: string,
  ): Promise<DiseaseRecord> {
    // Idempotent replay guard for offline queue drains. OwnershipGuard has already
    // verified the caller may write to dto.cropId — only short-circuit within that
    // same authorized crop, otherwise a client-supplied id colliding with another
    // farm's record would leak it here before any access check.
    if (dto.id) {
      const existing = await this.diseaseRecordRepository.findOne({
        where: { id: dto.id },
      });
      if (existing) {
        if (existing.cropId !== dto.cropId) {
          throw new ForbiddenException(
            'Disease record id already exists for a different crop',
          );
        }
        return existing;
      }
    }

    // Server-evaluated at write time (BANNED-1) — recomputed here regardless
    // of anything the client detected or sent, so the audit trail is
    // authoritative even against an offline-stale or bypassed client.
    const { flag, matches } = evaluateBannedSubstances(dto.notes);
    const flagHistory =
      nextFlagHistory({ flag: 'none' }, { flag, matches }, userId ?? 'unknown') ?? [];
    await this.assertPhotos(dto.cropId, dto.photoUrls);

    const record = this.diseaseRecordRepository.create({
      ...dto,
      // Old clients send free-text severityAtDetection only (D6).
      severity: dto.severity ?? normaliseSeverity(dto.severityAtDetection),
      createdById: userId,
      updatedById: userId,
      bannedSubstanceFlag: flag,
      bannedSubstanceMatches: matches,
      bannedSubstanceListVersion: BANNED_LIST_VERSION,
      flagHistory,
    });
    const saved = await this.diseaseRecordRepository.save(record);
    // Never blocks (D3): escalate swallows its own errors.
    await this.compliance?.escalate(
      { id: saved.id, cropId: saved.cropId, date: String(dto.recordedDate).slice(0, 10), flag, matches },
      'disease',
      userId,
    );
    return saved;
  }

  async findRecordsByCrop(cropId: string) {
    const rows = await this.diseaseRecordRepository.find({
      where: { cropId },
      relations: ['disease'],
      order: { recordedDate: 'DESC' },
    });
    if (!rows.some((r) => r.photoUrls?.length)) return rows;
    const farmId = await farmIdOfCrop(this.diseaseRecordRepository.manager, cropId);
    return farmId ? this.photos.withSigned(farmId, rows) : rows;
  }

  /** A photo path must be one of this crop's farm's uploads (D6). */
  private async assertPhotos(cropId: string, paths?: string[]) {
    if (!paths?.length) return;
    const farmId = await farmIdOfCrop(this.diseaseRecordRepository.manager, cropId);
    this.photos.assertFarmPaths(farmId ?? '', paths);
  }

  async updateRecord(
    id: string,
    dto: UpdateDiseaseRecordDto,
    userId?: string,
  ): Promise<DiseaseRecord> {
    const record = await this.diseaseRecordRepository.findOneBy({ id });
    if (!record) throw new NotFoundException(`Disease record ${id} not found`);

    // Re-evaluate only when notes actually change — an edit that removes the
    // flagged text should also clear a stale flag, and one that introduces a
    // banned reference must not slip through un-flagged.
    const reEvaluate = dto.notes !== undefined;
    const { flag, matches } = reEvaluate
      ? evaluateBannedSubstances(dto.notes)
      : { flag: record.bannedSubstanceFlag, matches: record.bannedSubstanceMatches };
    const { flagChangeReason, ...fields } = dto;
    // Lowering the flag needs a reason; every change is kept (D3.3).
    const flagHistory = reEvaluate
      ? nextFlagHistory(
          {
            flag: record.bannedSubstanceFlag,
            matches: record.bannedSubstanceMatches,
            history: record.flagHistory,
          },
          { flag, matches },
          userId ?? 'unknown',
          flagChangeReason,
        )
      : null;

    await this.assertPhotos(record.cropId, dto.photoUrls);

    const severity =
      dto.severity ??
      (dto.severityAtDetection !== undefined
        ? normaliseSeverity(dto.severityAtDetection)
        : undefined);
    // Closing an episode stamps the day unless given; reopening clears it.
    const resolvedOn =
      dto.outcome === undefined
        ? dto.resolvedOn
        : dto.outcome === 'ongoing'
          ? null
          : (dto.resolvedOn ?? toIstDateString(new Date()));

    // P2: a dropped photo path is deleted, not just untracked, and leaves a
    // tombstone line on `notes` rather than vanishing silently.
    const tombstone = await removedPhotoTombstone(
      this.diseaseRecordRepository.manager,
      this.photos,
      this.logger,
      record.photoUrls,
      dto.photoUrls,
      userId,
    );
    const notes = tombstone ? [dto.notes ?? record.notes, tombstone].filter(Boolean).join('\n') : undefined;

    await this.diseaseRecordRepository.update(id, {
      ...fields,
      ...(severity !== undefined ? { severity } : {}),
      ...(resolvedOn !== undefined ? { resolvedOn } : {}),
      ...(userId ? { updatedById: userId } : {}),
      bannedSubstanceFlag: flag,
      bannedSubstanceMatches: matches,
      ...(reEvaluate ? { bannedSubstanceListVersion: BANNED_LIST_VERSION } : {}),
      ...(flagHistory ? { flagHistory: flagHistory as any } : {}),
      ...(notes !== undefined ? { notes } : {}),
    });
    if (flagHistory) {
      await this.compliance?.escalate(
        {
          id,
          cropId: record.cropId,
          date: String(fields.recordedDate ?? record.recordedDate).slice(0, 10),
          flag,
          matches,
        },
        'disease',
        userId,
      );
    }
    return this.diseaseRecordRepository.findOneBy({
      id,
    }) as Promise<DiseaseRecord>;
  }

  async removeRecord(id: string): Promise<{ message: string }> {
    const record = await this.diseaseRecordRepository.findOneBy({ id });
    if (!record) throw new NotFoundException(`Disease record ${id} not found`);
    await this.diseaseRecordRepository.delete(id);
    return { message: 'Disease record deleted' };
  }
}
