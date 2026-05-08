import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Harvest } from './harvest.entity';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { CropsService } from '../crops/crops.service';

@Injectable()
export class HarvestsService {
    constructor(
        @InjectRepository(Harvest)
        private harvestsRepository: Repository<Harvest>,
        private cropsService: CropsService,
    ) { }

    async create(createDto: CreateHarvestDto, userId: string) {
        const harvest = this.harvestsRepository.create(createDto);
        const savedHarvest = await this.harvestsRepository.save(harvest);

        if (createDto.harvestType === 'full') {
            await this.cropsService.closeCycle(createDto.cropId, createDto.harvestDate, userId);
        }

        return savedHarvest;
    }

    async findAll(cropId: string) {
        return this.harvestsRepository.find({
            where: { cropId },
            order: { harvestDate: 'DESC' },
        });
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
