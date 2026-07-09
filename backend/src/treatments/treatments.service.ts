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

    const record = this.treatmentsRepository.create({
      ...createDto,
      createdById: userId,
      updatedById: userId,
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
    await this.findOne(id);
    await this.treatmentsRepository.update(id, {
      ...updateDto,
      ...(userId ? { updatedById: userId } : {}),
    });
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);
    await this.treatmentsRepository.delete(id);
    return { message: 'Treatment deleted successfully' };
  }
}
