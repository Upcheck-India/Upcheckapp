import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MicrobiologyData } from './microbiology-data.entity';
import { CreateMicrobiologyDataDto } from './dto/create-microbiology-data.dto';
import { UpdateMicrobiologyDataDto } from './dto/update-microbiology-data.dto';

@Injectable()
export class MicrobiologyService {
  constructor(
    @InjectRepository(MicrobiologyData)
    private microbiologyRepository: Repository<MicrobiologyData>,
  ) {}

  async create(
    dto: CreateMicrobiologyDataDto,
    userId?: string,
  ): Promise<MicrobiologyData> {
    // Idempotent replay guard for offline queue drains. OwnershipGuard has already
    // verified the caller may write to dto.cropId — only short-circuit within that
    // same authorized crop, otherwise a client-supplied id colliding with another
    // farm's record would leak it here before any access check.
    if (dto.id) {
      const existing = await this.microbiologyRepository.findOne({
        where: { id: dto.id },
      });
      if (existing) {
        if (existing.cropId !== dto.cropId) {
          throw new ForbiddenException(
            'Microbiology data id already exists for a different crop',
          );
        }
        return existing;
      }
    }

    const record = this.microbiologyRepository.create({
      ...dto,
      createdById: userId,
      updatedById: userId,
    });
    return this.microbiologyRepository.save(record);
  }

  async findByCrop(cropId: string): Promise<MicrobiologyData[]> {
    return this.microbiologyRepository.find({
      where: { cropId },
      order: { measurementDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<MicrobiologyData> {
    const record = await this.microbiologyRepository.findOne({ where: { id } });
    if (!record)
      throw new NotFoundException(`Microbiology data with ID ${id} not found`);
    return record;
  }

  async update(
    id: string,
    dto: UpdateMicrobiologyDataDto,
    userId?: string,
  ): Promise<MicrobiologyData> {
    await this.findOne(id);
    await this.microbiologyRepository.update(id, {
      ...dto,
      ...(userId ? { updatedById: userId } : {}),
    });
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);
    await this.microbiologyRepository.delete(id);
    return { message: 'Microbiology data deleted successfully' };
  }
}
