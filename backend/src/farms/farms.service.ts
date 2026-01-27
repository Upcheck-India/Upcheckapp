import { Injectable } from '@nestjs/common';
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

    create(createFarmDto: CreateFarmDto) {
        const farm = this.farmsRepository.create(createFarmDto);
        return this.farmsRepository.save(farm);
    }

    findAll(userId?: string) {
        if (userId) {
            return this.farmsRepository.find({ where: { userId } });
        }
        return this.farmsRepository.find();
    }

    findOne(id: string) {
        return this.farmsRepository.findOneBy({ id });
    }

    async update(id: string, updateFarmDto: UpdateFarmDto) {
        await this.farmsRepository.update(id, updateFarmDto);
        return this.findOne(id);
    }

    remove(id: string) {
        return this.farmsRepository.delete(id);
    }
}
