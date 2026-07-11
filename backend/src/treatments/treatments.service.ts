import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Treatment } from './treatment.entity';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { evaluateBannedSubstances } from '../banned-substances/banned-substance-matcher';
import { BANNED_LIST_VERSION } from '../banned-substances/banned-substances.data';

@Injectable()
export class TreatmentsService {
  constructor(
    @InjectRepository(Treatment)
    private treatmentsRepository: Repository<Treatment>,
    private readonly farmAccess: FarmAccessService,
  ) {}

  async create(createDto: CreateTreatmentDto, userId?: string) {
    // Idempotent replay guard for offline queue drains. OwnershipGuard has already
    // verified the caller may write to dto.cropId — only short-circuit within that
    // same authorized crop, otherwise a client-supplied id colliding with another
    // farm's record would leak it here before any access check.
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

    // Server-evaluated at write time (BANNED-1) — recomputed here regardless
    // of anything the client detected or sent, so the audit trail is
    // authoritative even against an offline-stale or bypassed client.
    const { flag, matches } = evaluateBannedSubstances(
      createDto.description,
      createDto.notes,
    );

    const record = this.treatmentsRepository.create({
      ...createDto,
      createdById: userId,
      updatedById: userId,
      bannedSubstanceFlag: flag,
      bannedSubstanceMatches: matches,
      bannedSubstanceListVersion: BANNED_LIST_VERSION,
    });
    return this.treatmentsRepository.save(record);
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
    // Re-evaluate whenever either free-text field changes — an edit that
    // removes the flagged text should also clear a stale flag, and one that
    // introduces a banned reference must not slip through un-flagged.
    const reEvaluate =
      updateDto.description !== undefined || updateDto.notes !== undefined;
    const { flag, matches } = reEvaluate
      ? evaluateBannedSubstances(
          updateDto.description ?? existing.description,
          updateDto.notes ?? existing.notes,
        )
      : { flag: existing.bannedSubstanceFlag, matches: existing.bannedSubstanceMatches };

    await this.treatmentsRepository.update(id, {
      ...updateDto,
      ...(userId ? { updatedById: userId } : {}),
      bannedSubstanceFlag: flag,
      bannedSubstanceMatches: matches,
      ...(reEvaluate ? { bannedSubstanceListVersion: BANNED_LIST_VERSION } : {}),
    });
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);
    await this.treatmentsRepository.delete(id);
    return { message: 'Treatment deleted successfully' };
  }
}
