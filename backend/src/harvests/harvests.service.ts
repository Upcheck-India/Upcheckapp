import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Harvest } from './harvest.entity';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { CropsService } from '../crops/crops.service';
import { FarmAccessService } from '../farm-access/farm-access.service';

@Injectable()
export class HarvestsService {
    constructor(
        @InjectRepository(Harvest)
        private harvestsRepository: Repository<Harvest>,
        private cropsService: CropsService,
        private readonly farmAccess: FarmAccessService,
    ) { }

    async create(createDto: CreateHarvestDto, userId: string) {
        const harvest = this.harvestsRepository.create(createDto);
        const savedHarvest = await this.harvestsRepository.save(harvest);

        if (createDto.harvestType === 'full') {
            await this.cropsService.closeCycle(createDto.cropId, createDto.harvestDate, userId);
        }

        return savedHarvest;
    }

    async findAll(userId: string, cropId?: string) {
        // Scope to farms the caller can access — cropId alone is an optional
        // filter, never the ownership boundary (was leaking every farm's harvests,
        // including sale prices, when omitted).
        const farmIds = await this.farmAccess.getAccessibleFarmIds(userId);
        if (farmIds.length === 0) return [];

        const qb = this.harvestsRepository
            .createQueryBuilder('harvest')
            .innerJoin('harvest.crop', 'crop')
            .innerJoin('crop.pond', 'pond')
            .where('pond.farmId IN (:...farmIds)', { farmIds })
            .orderBy('harvest.harvestDate', 'DESC');
        if (cropId) qb.andWhere('harvest.cropId = :cropId', { cropId });
        return qb.getMany();
    }

    async findOne(id: string): Promise<Harvest> {
        const harvest = await this.harvestsRepository.findOneBy({ id });
        if (!harvest) {
            throw new NotFoundException(`Harvest with ID ${id} not found`);
        }
        return harvest;
    }

    async update(id: string, dto: UpdateHarvestDto): Promise<Harvest> {
        await this.findOne(id);
        await this.harvestsRepository.update(id, dto);
        return this.findOne(id);
    }

    async remove(id: string): Promise<{ message: string }> {
        await this.findOne(id);
        await this.harvestsRepository.delete(id);
        return { message: 'Harvest deleted successfully' };
    }
}
