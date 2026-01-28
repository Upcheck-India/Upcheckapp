import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Crop } from './crop.entity';
import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';
import { PondsService } from '../ponds/ponds.service';

@Injectable()
export class CropsService {
    constructor(
        @InjectRepository(Crop)
        private cropsRepository: Repository<Crop>,
        private pondsService: PondsService,
    ) { }

    async create(createCropDto: CreateCropDto, userId: string) {
        // Verify user owns the pond
        await this.pondsService.findOne(createCropDto.pondId, userId);

        const crop = this.cropsRepository.create(createCropDto);
        return this.cropsRepository.save(crop);
    }

    async findAll(pondId: string, userId: string) {
        if (!pondId) {
            // Similar to WaterQuality, return empty or implement user-based filtering if needed
            return [];
        }

        // Verify user owns the pond
        await this.pondsService.findOne(pondId, userId);

        return this.cropsRepository.find({ where: { pondId } });
    }

    async findByPond(pondId: string, userId: string) {
        // Verify user owns the pond
        await this.pondsService.findOne(pondId, userId);
        return this.cropsRepository.find({ where: { pondId } });
    }

    async findOne(id: string, userId: string) {
        const crop = await this.cropsRepository.findOneBy({ id });
        if (!crop) {
            throw new NotFoundException(`Crop with ID ${id} not found`);
        }
        // Verify ownership via pond
        await this.pondsService.findOne(crop.pondId, userId);
        return crop;
    }

    async update(id: string, updateCropDto: UpdateCropDto, userId: string) {
        await this.findOne(id, userId); // Verify ownership
        await this.cropsRepository.update(id, updateCropDto);
        return this.findOne(id, userId);
    }

    async remove(id: string, userId: string) {
        await this.findOne(id, userId); // Verify ownership
        return this.cropsRepository.delete(id);
    }

    async harvest(id: string, harvestData: { actualHarvestDate: Date; harvestWeightKg: number }, userId: string) {
        await this.findOne(id, userId); // Verify ownership

        await this.cropsRepository.update(id, {
            ...harvestData,
            status: 'harvested',
        });
        return this.findOne(id, userId);
    }
}
