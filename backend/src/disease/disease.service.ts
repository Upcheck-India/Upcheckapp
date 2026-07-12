import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DiseaseLibrary } from './disease-library.entity';
import { DiseaseLibraryTranslation } from './disease-library-translation.entity';
import { DiseaseRecord } from './disease-record.entity';
import {
  CreateDiseaseDto,
  CreateDiseaseRecordDto,
} from './dto/create-disease.dto';
import { UpdateDiseaseLibraryDto } from './dto/update-disease-library.dto';
import { evaluateBannedSubstances } from '../banned-substances/banned-substance-matcher';
import { BANNED_LIST_VERSION } from '../banned-substances/banned-substances.data';

const DISEASE_SEED_DATA: CreateDiseaseDto[] = [
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
    treatmentRecommendations: ['Antibiotics', 'Probiotics', 'Water exchange'],
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
  constructor(
    @InjectRepository(DiseaseLibrary)
    private diseaseLibraryRepository: Repository<DiseaseLibrary>,
    @InjectRepository(DiseaseLibraryTranslation)
    private diseaseLibraryTranslationRepository: Repository<DiseaseLibraryTranslation>,
    @InjectRepository(DiseaseRecord)
    private diseaseRecordRepository: Repository<DiseaseRecord>,
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
    const translations = await this.diseaseLibraryTranslationRepository.find({
      where: { diseaseId: In(diseases.map((d) => d.id)), locale },
    });
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
    await this.diseaseLibraryRepository.remove(disease);
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

    const record = this.diseaseRecordRepository.create({
      ...dto,
      createdById: userId,
      updatedById: userId,
      bannedSubstanceFlag: flag,
      bannedSubstanceMatches: matches,
      bannedSubstanceListVersion: BANNED_LIST_VERSION,
    });
    return this.diseaseRecordRepository.save(record);
  }

  async findRecordsByCrop(cropId: string): Promise<DiseaseRecord[]> {
    return this.diseaseRecordRepository.find({
      where: { cropId },
      relations: ['disease'],
      order: { recordedDate: 'DESC' },
    });
  }

  async updateRecord(
    id: string,
    dto: Partial<CreateDiseaseRecordDto>,
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

    await this.diseaseRecordRepository.update(id, {
      ...dto,
      ...(userId ? { updatedById: userId } : {}),
      bannedSubstanceFlag: flag,
      bannedSubstanceMatches: matches,
      ...(reEvaluate ? { bannedSubstanceListVersion: BANNED_LIST_VERSION } : {}),
    });
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
