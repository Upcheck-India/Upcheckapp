import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Farm } from './farm.entity';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';

@Injectable()
export class FarmsService {
    constructor(
        @InjectRepository(Farm)
        private farmsRepository: Repository<Farm>,
    ) { }

    create(createFarmDto: CreateFarmDto, userId: string) {
        // Ensure the farm is created for the authenticated user
        const farm = this.farmsRepository.create({
            ...createFarmDto,
            userId,
        });
        return this.farmsRepository.save(farm);
    }

    findAll(userId: string) {
        // Only return farms belonging to the user
        return this.farmsRepository.find({ where: { userId } });
    }

    async findOne(id: string, userId: string) {
        const farm = await this.farmsRepository.findOneBy({ id });
        if (!farm) {
            throw new NotFoundException(`Farm with ID ${id} not found`);
        }
        if (farm.userId !== userId) {
            throw new ForbiddenException('You do not have permission to access this farm');
        }
        return farm;
    }

    async update(id: string, updateFarmDto: UpdateFarmDto, userId: string) {
        const farm = await this.findOne(id, userId); // Verifies ownership
        await this.farmsRepository.update(id, updateFarmDto);
        return this.findOne(id, userId);
    }

    async remove(id: string, userId: string) {
        await this.findOne(id, userId); // Verifies ownership
        return this.farmsRepository.delete(id);
    }
}
