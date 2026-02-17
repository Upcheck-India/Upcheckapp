import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarvestRecord } from './harvest-record.entity';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';

@Injectable()
export class HarvestsService {
    constructor(
        @InjectRepository(HarvestRecord)
        private harvestsRepository: Repository<HarvestRecord>,
    ) { }

    create(createDto: CreateHarvestDto) {
        const record = this.harvestsRepository.create(createDto);
        return this.harvestsRepository.save(record);
    }

    findAll(cropId?: string) {
        if (cropId) {
            return this.harvestsRepository.find({
                where: { cropId },
                order: { harvestDate: 'DESC' },
            });
        }
        return this.harvestsRepository.find({ order: { harvestDate: 'DESC' } });
    }

    findOne(id: string) {
        return this.harvestsRepository.findOneBy({ id });
    }

    async update(id: string, updateDto: UpdateHarvestDto) {
        await this.harvestsRepository.update(id, updateDto);
        return this.findOne(id);
    }

    remove(id: string) {
        return this.harvestsRepository.delete(id);
    }
}
