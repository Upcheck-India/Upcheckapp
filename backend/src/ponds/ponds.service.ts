import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pond } from './pond.entity';
import { CreatePondDto } from './dto/create-pond.dto';
import { UpdatePondDto } from './dto/update-pond.dto';
import { FarmsService } from '../farms/farms.service';

@Injectable()
export class PondsService {
    constructor(
        @InjectRepository(Pond)
        private pondsRepository: Repository<Pond>,
        private farmsService: FarmsService,
    ) { }

    async create(createPondDto: CreatePondDto, userId: string) {
        // Verify user owns the farm
        await this.farmsService.findOne(createPondDto.farmId, userId);

        const pond = this.pondsRepository.create(createPondDto);
        return this.pondsRepository.save(pond);
    }

    async findAll(farmId: string, userId: string) {
        // Verify user owns the farm
        await this.farmsService.findOne(farmId, userId);
        return this.pondsRepository.find({ where: { farmId } });
    }

    async findOne(id: string, userId: string) {
        // Find pond with relation to farm to check userId of the farm
        const pond = await this.pondsRepository.findOne({
            where: { id },
            relations: ['farm'], // We need to load the farm to check its owner
        });

        if (!pond) {
            throw new NotFoundException(`Pond with ID ${id} not found`);
        }

        // This is a bit indirect, but we should rely on the farm owner. 
        // Note: Farm entity should have userId. Let's assume it does from the FarmsService logic.
        if (pond.farm.userId !== userId) {
            throw new ForbiddenException('You do not have permission to access this pond');
        }

        return pond;
    }

    async update(id: string, updatePondDto: UpdatePondDto, userId: string) {
        await this.findOne(id, userId); // Verifies ownership
        await this.pondsRepository.update(id, updatePondDto);
        return this.findOne(id, userId);
    }

    async remove(id: string, userId: string) {
        await this.findOne(id, userId); // Verifies ownership
        return this.pondsRepository.delete(id);
    }

    /**
     * Calculate pond volume based on area and depth
     * @param area Area in square meters
     * @param depth Depth in meters
     * @returns Volume in cubic meters
     */
    calculateVolume(area: number, depth: number): number {
        if (area <= 0 || depth <= 0) {
            return 0;
        }
        return area * depth;
    }
}
