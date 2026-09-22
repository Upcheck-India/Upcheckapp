import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Treatment } from './treatment.entity';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { BANNED_LIST_VERSION } from '../banned-substances/banned-substances.data';
import { evaluateRecord, nextFlagHistory } from '../compliance/compliance-eval';
import { ComplianceService } from '../compliance/compliance.service';
import { InventoryService } from '../inventory/inventory.service';
import { HealthPhotoStorageService } from '../health-observations/health-photo-storage.service';

/** Fields the banned-substance evaluation reads (D2: ingredients ∪ product ∪ text). */
const EVALUATED = ['ingredientKeys', 'productName', 'description', 'notes'] as const;

const isoDay = (v: unknown) =>
  v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);

@Injectable()
export class TreatmentsService {
  constructor(
    @InjectRepository(Treatment)
    private treatmentsRepository: Repository<Treatment>,
    private readonly farmAccess: FarmAccessService,
    private readonly compliance: ComplianceService,
    private readonly inventory: InventoryService,
    private readonly healthPhotoStorage: HealthPhotoStorageService,
  ) {}

  async create(createDto: CreateTreatmentDto, userId?: string) {
    // Idempotent replay guard for offline queue drains. OwnershipGuard has already
    // verified the caller may write to dto.cropId — only short-circuit within that
    // same authorized crop, otherwise a client-supplied id colliding with another
    // farm's record would leak it here before any access check. Returning here
    // also means a replay never re-notifies and never re-deducts stock.
    if (createDto.id) {
      const existing = await this.treatmentsRepository.findOne({
        where: { id: createDto.id },
      });
      if (existing) {
        if (existing.cropId !== createDto.cropId) {
          throw new ForbiddenException(
            'Treatment id already exists for a different crop',
          );
        }
        return existing;
      }
    }

    const { inventoryItemId, photoPaths, ...fields } = createDto;

    // Server-evaluated at write time (BANNED-1, D2) — recomputed here regardless
    // of anything the client detected or sent, so the audit trail is
    // authoritative even against an offline-stale or bypassed client.
    const ev = evaluateRecord(fields);
    const history =
      nextFlagHistory({ flag: 'none' }, ev, userId ?? 'unknown') ?? [];

    // Stock first, like the feed pipeline, so a failed deduction (not enough
    // stock, another farm's item) fails the save before anything is written.
    const qty = Number(createDto.doseValue);
    if (inventoryItemId && !(createDto.id && qty > 0)) {
      throw new BadRequestException(
        'Using stock needs a client id and a dose greater than zero',
      );
    }
    let farmId: string | undefined;
    if (inventoryItemId) {
      farmId = await this.farmIdOfCrop(createDto.cropId);
      await this.inventory.adjustStock(inventoryItemId, -qty, userId!, {
        capability: 'WRITE_OPERATIONAL',
        expectedFarmId: farmId,
        reason: 'Treatment log',
        treatmentId: createDto.id,
      });
    }

    const record = this.treatmentsRepository.create({
      ...fields,
      description: fields.description ?? '',
      // Old clients read dosageKg; fill it from a kg dose (D2).
      dosageKg:
        fields.dosageKg ??
        (fields.doseUnit === 'kg' ? fields.doseValue : undefined),
      createdById: userId,
      updatedById: userId,
      bannedSubstanceFlag: ev.flag,
      bannedSubstanceMatches: ev.matches,
      bannedSubstanceListVersion: BANNED_LIST_VERSION,
      flagHistory: history,
    });

    let saved: Treatment;
    try {
      saved = await this.treatmentsRepository.save(record);
    } catch (err) {
      // Compensate the deduction so stock is never taken for a record that
      // does not exist (same as feed-records).
      if (inventoryItemId) {
        await this.inventory.adjustStock(inventoryItemId, qty, userId!, {
          capability: 'WRITE_OPERATIONAL',
          expectedFarmId: farmId,
          reason: 'Treatment log failed',
          treatmentId: createDto.id,
        });
      }
      throw err;
    }

    // F5 input label + batch (cap 3 enforced by the DTO). 403s before anything
    // else if the photo belongs to another farm.
    if (photoPaths !== undefined) {
      await this.healthPhotoStorage.applyRecordPhotos(
        this.treatmentsRepository.manager,
        'treatments',
        'treatment',
        farmId ?? (await this.farmIdOfCrop(createDto.cropId)),
        saved.id,
        photoPaths,
        createDto.cropId,
      );
    }

    // Never blocks (DD1): escalate swallows its own errors.
    await this.compliance.escalate(
      {
        id: saved.id,
        cropId: saved.cropId,
        date: isoDay(createDto.treatmentDate),
        flag: ev.flag,
        matches: ev.matches,
      },
      'treatment',
      userId,
    );
    return saved;
  }

  private async farmIdOfCrop(cropId: string): Promise<string> {
    const [row] = await this.treatmentsRepository.manager.query(
      `SELECT p.farm_id AS "farmId" FROM crops c JOIN ponds p ON p.id = c.pond_id WHERE c.id = $1`,
      [cropId],
    );
    if (!row) throw new NotFoundException(`Crop ${cropId} not found`);
    return row.farmId;
  }

  async findAll(userId: string, cropId?: string) {
    // Scope to farms the caller can access — cropId alone is an optional
    // filter, never the ownership boundary.
    const farmIds = await this.farmAccess.getAccessibleFarmIds(userId);
    if (farmIds.length === 0) return [];

    const qb = this.treatmentsRepository
      .createQueryBuilder('treatment')
      .innerJoin('treatment.crop', 'crop')
      .innerJoin('crop.pond', 'pond')
      .where('pond.farmId IN (:...farmIds)', { farmIds })
      .orderBy('treatment.treatmentDate', 'DESC');
    if (cropId) qb.andWhere('treatment.cropId = :cropId', { cropId });
    return qb.getMany();
  }

  async findOne(id: string): Promise<Treatment> {
    const record = await this.treatmentsRepository.findOneBy({ id });
    if (!record)
      throw new NotFoundException(`Treatment with ID ${id} not found`);
    return record;
  }

  async update(
    id: string,
    updateDto: UpdateTreatmentDto,
    userId?: string,
  ): Promise<Treatment> {
    const existing = await this.findOne(id);
    const { flagChangeReason, photoPaths, ...fields } = updateDto;

    if (photoPaths !== undefined) {
      await this.healthPhotoStorage.applyRecordPhotos(
        this.treatmentsRepository.manager,
        'treatments',
        'treatment',
        await this.farmIdOfCrop(existing.cropId),
        id,
        photoPaths,
        existing.cropId,
      );
    }

    // Re-evaluate whenever an evaluated field changes — an edit that removes
    // the flagged text also clears the flag (only with a reason, and always
    // with a history entry, D3.3), and one that introduces a banned
    // reference must not slip through un-flagged.
    const reEvaluate = EVALUATED.some((k) => fields[k] !== undefined);
    const ev = reEvaluate
      ? evaluateRecord({ ...existing, ...fields })
      : {
          flag: existing.bannedSubstanceFlag,
          matches: existing.bannedSubstanceMatches,
        };
    const history = reEvaluate
      ? nextFlagHistory(
          {
            flag: existing.bannedSubstanceFlag,
            matches: existing.bannedSubstanceMatches,
            history: existing.flagHistory,
          },
          ev,
          userId ?? 'unknown',
          flagChangeReason,
        )
      : null;

    await this.treatmentsRepository.update(id, {
      ...fields,
      ...(fields.doseUnit === 'kg' &&
      fields.doseValue !== undefined &&
      fields.dosageKg === undefined
        ? { dosageKg: fields.doseValue }
        : {}),
      ...(userId ? { updatedById: userId } : {}),
      bannedSubstanceFlag: ev.flag,
      bannedSubstanceMatches: ev.matches,
      ...(reEvaluate ? { bannedSubstanceListVersion: BANNED_LIST_VERSION } : {}),
      ...(history ? { flagHistory: history as any } : {}),
    });

    if (history) {
      await this.compliance.escalate(
        {
          id,
          cropId: existing.cropId,
          date: isoDay(fields.treatmentDate ?? existing.treatmentDate),
          flag: ev.flag,
          matches: ev.matches,
        },
        'treatment',
        userId,
      );
    }
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);
    await this.treatmentsRepository.delete(id);
    return { message: 'Treatment deleted successfully' };
  }
}
