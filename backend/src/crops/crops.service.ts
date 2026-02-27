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
        const pond = await this.pondsService.findOne(createCropDto.pondId, userId);

        if (pond.activeCycleId && createCropDto.status === 'active') {
            throw new ForbiddenException('Pond already has an active cycle. close it first.');
        }


        // Calculate Stocking Density
        let stockingDensity = createCropDto.stockingDensity;
        if (pond.calculatedAreaM2 || pond.overrideAreaM2) {
            const area = pond.overrideAreaM2 || pond.calculatedAreaM2;
            if (area > 0 && createCropDto.stockingCount) {
                stockingDensity = Math.round(createCropDto.stockingCount / area);
            }
        }

        const crop = this.cropsRepository.create({
            pondId: createCropDto.pondId,
            name: createCropDto.name,
            cropCode: createCropDto.cropCode,
            speciesType: createCropDto.speciesType,
            seedType: createCropDto.seedType,
            stockingCount: createCropDto.stockingCount,
            stockingDate: createCropDto.stockingDate,
            expectedHarvestDate: createCropDto.expectedHarvestDate,
            status: createCropDto.status || 'active',
            stockingDensity,
        });
        const savedCrop = await this.cropsRepository.save(crop);

        // If status is active, update the pond's active cycle
        if (createCropDto.status === 'active') {
            await this.pondsService.update(pond.id, { activeCycleId: savedCrop.id } as any, userId);
        }

        return savedCrop;
    }

    async findAll(pondId: string, userId: string) {
        if (!pondId) {
            // Similar to WaterQuality, return empty or implement user-based filtering if needed
            return [];
        }

        // Verify user owns the pond
        await this.pondsService.verifyOwner(pondId, userId);

        return this.cropsRepository.find({
            where: { pondId },
            order: { createdAt: 'DESC' }
        });
    }

    async findByPond(pondId: string, userId: string) {
        // Verify user owns the pond
        await this.pondsService.verifyOwner(pondId, userId);
        return this.cropsRepository.find({
            where: { pondId },
            order: { createdAt: 'DESC' }
        });
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
        const crop = await this.findOne(id, userId); // Verify ownership

        // If deleting the active cycle, clear it from pond
        const pond = await this.pondsService.findOne(crop.pondId, userId);
        if (pond.activeCycleId === id) {
            await this.pondsService.update(pond.id, { activeCycleId: null } as any, userId);
        }

        return this.cropsRepository.delete(id);
    }

    async harvest(id: string, harvestData: { actualHarvestDate: Date; harvestWeightKg: number }, userId: string) {
        const crop = await this.findOne(id, userId); // Verify ownership

        await this.cropsRepository.update(id, {
            ...harvestData,
            status: 'harvested',
        });

        // Unlink from ponds activeCycleId
        const pond = await this.pondsService.findOne(crop.pondId, userId);
        if (pond.activeCycleId === id) {
            await this.pondsService.update(pond.id, { activeCycleId: null } as any, userId);
        }

        return this.findOne(id, userId);
    }

    async closeCycle(id: string, actualHarvestDate: string, userId: string) {
        const crop = await this.findOne(id, userId); // Verify ownership

        await this.cropsRepository.update(id, {
            actualHarvestDate,
            status: 'completed',
        });

        // Unlink from ponds activeCycleId
        // We can't just set to null blindly, we should check if THIS crop is the active one.
        // But findOne verified ownership via pond.
        // Let's get the pond first to be safe? 
        // findOne already calls pondService.findOne(crop.pondId), but doesn't return pond.

        const pond = await this.pondsService.findOne(crop.pondId, userId);
        if (pond.activeCycleId === id) {
            await this.pondsService.update(pond.id, { activeCycleId: null } as any, userId);
        }

        return this.findOne(id, userId);
    }
}
