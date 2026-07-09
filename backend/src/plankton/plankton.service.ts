import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanktonData } from './plankton-data.entity';
import { CreatePlanktonDataDto } from './dto/create-plankton-data.dto';
import { UpdatePlanktonDataDto } from './dto/update-plankton-data.dto';

@Injectable()
export class PlanktonService {
  constructor(
    @InjectRepository(PlanktonData)
    private planktonRepository: Repository<PlanktonData>,
  ) {}

  async create(
    dto: CreatePlanktonDataDto,
    userId?: string,
  ): Promise<PlanktonData> {
    // Idempotent replay guard for offline queue drains. OwnershipGuard has already
    // verified the caller may write to dto.cropId — only short-circuit within that
    // same authorized crop, otherwise a client-supplied id colliding with another
    // farm's record would leak it here before any access check.
    if (dto.id) {
      const existing = await this.planktonRepository.findOne({
        where: { id: dto.id },
      });
      if (existing) {
        if (existing.cropId !== dto.cropId) {
          throw new ForbiddenException(
            'Plankton data id already exists for a different crop',
          );
        }
        return existing;
      }
    }

    const total =
      (dto.greenAlgaeGaCellMl || 0) +
      (dto.blueGreenAlgaeBgaCellMl || 0) +
      (dto.dinoflagellataCellMl || 0) +
      (dto.diatomCellMl || 0) +
      (dto.protozoaCellMl || 0) +
      (dto.flocCellMl || 0) +
      (dto.goldenBrownAlgaeCellMl || 0) +
      (dto.euglenophytaCellMl || 0) +
      (dto.zooCellMl || 0) +
      (dto.haptoyphytaCellMl || 0) +
      (dto.goldenGreenAlgaeCellMl || 0) +
      (dto.yellowGreenAlgaeCellMl || 0) +
      (dto.otherPlanktonCellMl || 0);

    const record = this.planktonRepository.create({
      ...dto,
      totalPlanktonCellMl: total,
      createdById: userId,
      updatedById: userId,
    });

    return this.planktonRepository.save(record);
  }

  async findByCrop(cropId: string): Promise<PlanktonData[]> {
    return this.planktonRepository.find({
      where: { cropId },
      order: { measurementDate: 'DESC', measurementTime: 'DESC' },
    });
  }

  async findOne(id: string): Promise<PlanktonData> {
    const record = await this.planktonRepository.findOne({ where: { id } });
    if (!record)
      throw new NotFoundException(`Plankton data with ID ${id} not found`);
    return record;
  }

  async update(
    id: string,
    dto: UpdatePlanktonDataDto,
    userId?: string,
  ): Promise<PlanktonData> {
    const existing = await this.findOne(id);

    const greenAlgae =
      dto.greenAlgaeGaCellMl ?? existing.greenAlgaeGaCellMl ?? 0;
    const blueGreenAlgae =
      dto.blueGreenAlgaeBgaCellMl ?? existing.blueGreenAlgaeBgaCellMl ?? 0;
    const dinoflagellata =
      dto.dinoflagellataCellMl ?? existing.dinoflagellataCellMl ?? 0;
    const diatom = dto.diatomCellMl ?? existing.diatomCellMl ?? 0;
    const protozoa = dto.protozoaCellMl ?? existing.protozoaCellMl ?? 0;
    const floc = dto.flocCellMl ?? existing.flocCellMl ?? 0;
    const goldenBrown =
      dto.goldenBrownAlgaeCellMl ?? existing.goldenBrownAlgaeCellMl ?? 0;
    const euglenophyta =
      dto.euglenophytaCellMl ?? existing.euglenophytaCellMl ?? 0;
    const zoo = dto.zooCellMl ?? existing.zooCellMl ?? 0;
    const haptoyphyta =
      dto.haptoyphytaCellMl ?? existing.haptoyphytaCellMl ?? 0;
    const goldenGreen =
      dto.goldenGreenAlgaeCellMl ?? existing.goldenGreenAlgaeCellMl ?? 0;
    const yellowGreen =
      dto.yellowGreenAlgaeCellMl ?? existing.yellowGreenAlgaeCellMl ?? 0;
    const other = dto.otherPlanktonCellMl ?? existing.otherPlanktonCellMl ?? 0;

    const total =
      greenAlgae +
      blueGreenAlgae +
      dinoflagellata +
      diatom +
      protozoa +
      floc +
      goldenBrown +
      euglenophyta +
      zoo +
      haptoyphyta +
      goldenGreen +
      yellowGreen +
      other;

    await this.planktonRepository.update(id, {
      ...dto,
      totalPlanktonCellMl: total,
      ...(userId ? { updatedById: userId } : {}),
    });
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);
    await this.planktonRepository.delete(id);
    return { message: 'Plankton data deleted successfully' };
  }
}
