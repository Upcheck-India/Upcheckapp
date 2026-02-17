import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Harvest } from './harvest.entity';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { CropsService } from '../crops/crops.service';

@Injectable()
export class HarvestsService {
    constructor(
        @InjectRepository(Harvest)
        private harvestsRepository: Repository<Harvest>,
        private cropsService: CropsService,
    ) { }

    async create(createDto: CreateHarvestDto, userId: string) {
        // Create harvest record
        const harvest = this.harvestsRepository.create(createDto);
        const savedHarvest = await this.harvestsRepository.save(harvest);

        // If full harvest, close the cycle
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

    async findOne(id: string) {
        const harvest = await this.harvestsRepository.findOneBy({ id });
        if (!harvest) {
            throw new NotFoundException(`Harvest with ID ${id} not found`);
        }
        return harvest;
    }

    async remove(id: string) {
        const harvest = await this.findOne(id);
        return this.harvestsRepository.remove(harvest);
    }
}
