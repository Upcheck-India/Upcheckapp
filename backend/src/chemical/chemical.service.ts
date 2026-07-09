import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChemicalData } from './chemical-data.entity';
import { CreateChemicalDataDto } from './dto/create-chemical-data.dto';
import { UpdateChemicalDataDto } from './dto/update-chemical-data.dto';

@Injectable()
export class ChemicalService {
  constructor(
    @InjectRepository(ChemicalData)
    private chemicalRepository: Repository<ChemicalData>,
  ) {}

  async create(
    dto: CreateChemicalDataDto,
    userId?: string,
  ): Promise<ChemicalData> {
    // Idempotent replay guard for offline queue drains. OwnershipGuard has already
    // verified the caller may write to dto.cropId — only short-circuit within that
    // same authorized crop, otherwise a client-supplied id colliding with another
    // farm's record would leak it here before any access check.
    if (dto.id) {
      const existing = await this.chemicalRepository.findOne({
        where: { id: dto.id },
      });
      if (existing) {
        if (existing.cropId !== dto.cropId) {
          throw new ForbiddenException(
            'Chemical data id already exists for a different crop',
          );
        }
        return existing;
      }
    }

    const record = this.chemicalRepository.create({
      ...dto,
      createdById: userId,
      updatedById: userId,
    });
    return this.chemicalRepository.save(record);
  }

  async findByCrop(cropId: string): Promise<ChemicalData[]> {
    return this.chemicalRepository.find({
      where: { cropId },
      order: { measurementDate: 'DESC', measurementTime: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ChemicalData> {
    const record = await this.chemicalRepository.findOne({ where: { id } });
    if (!record)
      throw new NotFoundException(`Chemical data with ID ${id} not found`);
    return record;
  }

  async update(
    id: string,
    dto: UpdateChemicalDataDto,
    userId?: string,
  ): Promise<ChemicalData> {
    await this.findOne(id);
    await this.chemicalRepository.update(id, {
      ...dto,
      ...(userId ? { updatedById: userId } : {}),
    });
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);
    await this.chemicalRepository.delete(id);
    return { message: 'Chemical data deleted successfully' };
  }
}
