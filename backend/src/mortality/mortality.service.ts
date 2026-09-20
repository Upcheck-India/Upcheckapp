import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MortalityRecord } from './mortality-record.entity';
import { CreateMortalityRecordDto } from './dto/create-mortality-record.dto';
import { UpdateMortalityRecordDto } from './dto/update-mortality-record.dto';
import {
  HealthPhotoStorageService,
  farmIdOfCrop,
} from '../health-observations/health-photo-storage.service';
import { removedPhotoTombstone } from '../health-observations/photo-removal.util';

/**
 * Default mortality multiplier.
 * When dead shrimp are observed (e.g., 10 found), the actual mortality
 * is estimated to be higher because not all dead shrimp are visible.
 * A multiplier of 3 means: observed 10 → estimated total 30.
 */
const DEFAULT_MORTALITY_MULTIPLIER = 3;

@Injectable()
export class MortalityService {
  private readonly logger = new Logger(MortalityService.name);

  constructor(
    @InjectRepository(MortalityRecord)
    private mortalityRepository: Repository<MortalityRecord>,
    private readonly photos: HealthPhotoStorageService,
  ) {}

  /** A photo path must be one of this crop's farm's uploads (D6). */
  private async assertPhotos(cropId: string, paths?: string[]) {
    if (!paths?.length) return;
    const farmId = await farmIdOfCrop(this.mortalityRepository.manager, cropId);
    this.photos.assertFarmPaths(farmId ?? '', paths);
  }

  async create(
    dto: CreateMortalityRecordDto,
    userId?: string,
  ): Promise<MortalityRecord> {
    // Idempotent replay guard for offline queue drains. OwnershipGuard has already
    // verified the caller may write to dto.cropId — only short-circuit within that
    // same authorized crop, otherwise a client-supplied id colliding with another
    // farm's record would leak it here before any access check.
    if (dto.id) {
      const existing = await this.mortalityRepository.findOne({
        where: { id: dto.id },
      });
      if (existing) {
        if (existing.cropId !== dto.cropId) {
          throw new ForbiddenException(
            'Mortality record id already exists for a different crop',
          );
        }
        return existing;
      }
    }

    await this.assertPhotos(dto.cropId, dto.photoUrls);

    // If estimatedTotal is not provided, compute it using the mortality multiplier
    const estimatedTotal =
      dto.estimatedTotal ?? dto.quantity * DEFAULT_MORTALITY_MULTIPLIER;

    const record = this.mortalityRepository.create({
      ...dto,
      estimatedTotal,
      createdById: userId,
      updatedById: userId,
    });
    return this.mortalityRepository.save(record);
  }

  async findByCrop(cropId: string) {
    const rows = await this.mortalityRepository.find({
      where: { cropId },
      order: { recordDate: 'DESC', createdAt: 'DESC' },
    });
    if (!rows.some((r) => r.photoUrls?.length)) return rows;
    const farmId = await farmIdOfCrop(this.mortalityRepository.manager, cropId);
    return farmId ? this.photos.withSigned(farmId, rows) : rows;
  }

  async findOne(id: string): Promise<MortalityRecord> {
    const record = await this.mortalityRepository.findOne({ where: { id } });
    if (!record)
      throw new NotFoundException(`Mortality record with ID ${id} not found`);
    return record;
  }

  async update(
    id: string,
    dto: UpdateMortalityRecordDto,
    userId?: string,
  ): Promise<MortalityRecord> {
    const current = await this.findOne(id);
    await this.assertPhotos(current.cropId, dto.photoUrls);
    // estimatedTotal feeds live population (pond-context SUMs it), so a count
    // edit must move it too — otherwise it stays at the old count × 3 (H6).
    const estimatedTotal =
      dto.estimatedTotal ??
      (dto.quantity !== undefined
        ? dto.quantity * DEFAULT_MORTALITY_MULTIPLIER
        : undefined);
    // P2: a dropped photo path is deleted, not just untracked, and leaves a
    // tombstone line rather than vanishing silently.
    const tombstone = await removedPhotoTombstone(
      this.mortalityRepository.manager,
      this.photos,
      this.logger,
      current.photoUrls,
      dto.photoUrls,
      userId,
    );
    const note = tombstone ? [dto.note ?? current.note, tombstone].filter(Boolean).join('\n') : undefined;
    await this.mortalityRepository.update(id, {
      ...dto,
      ...(estimatedTotal !== undefined ? { estimatedTotal } : {}),
      ...(userId ? { updatedById: userId } : {}),
      ...(note !== undefined ? { note } : {}),
    });
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);
    await this.mortalityRepository.delete(id);
    return { message: 'Mortality record deleted successfully' };
  }
}
