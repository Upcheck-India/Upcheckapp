import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MortalityRecord } from './mortality-record.entity';
import { CreateMortalityRecordDto } from './dto/create-mortality-record.dto';
import { UpdateMortalityRecordDto } from './dto/update-mortality-record.dto';

/**
 * Default mortality multiplier.
 * When dead shrimp are observed (e.g., 10 found), the actual mortality
 * is estimated to be higher because not all dead shrimp are visible.
 * A multiplier of 3 means: observed 10 → estimated total 30.
 */
const DEFAULT_MORTALITY_MULTIPLIER = 3;

@Injectable()
export class MortalityService {
  constructor(
    @InjectRepository(MortalityRecord)
    private mortalityRepository: Repository<MortalityRecord>,
  ) {}

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

  async findByCrop(cropId: string): Promise<MortalityRecord[]> {
    return this.mortalityRepository.find({
      where: { cropId },
      order: { recordDate: 'DESC', createdAt: 'DESC' },
    });
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
    await this.findOne(id);
    await this.mortalityRepository.update(id, {
      ...dto,
      ...(userId ? { updatedById: userId } : {}),
    });
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);
    await this.mortalityRepository.delete(id);
    return { message: 'Mortality record deleted successfully' };
  }
}
