import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Crop } from './crop.entity';
import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';

@Injectable()
export class CropsService {
    constructor(
        @InjectRepository(Crop)
        private cropsRepository: Repository<Crop>,
    ) { }

    create(createCropDto: CreateCropDto) {
        const crop = this.cropsRepository.create(createCropDto);
        return this.cropsRepository.save(crop);
    }

    findAll(pondId?: string) {
        if (pondId) {
            return this.cropsRepository.find({ where: { pondId } });
        }
        return this.cropsRepository.find();
    }

    findByPond(pondId: string) {
        return this.cropsRepository.find({ where: { pondId } });
    }

    findOne(id: string) {
        return this.cropsRepository.findOneBy({ id });
    }

    async update(id: string, updateCropDto: UpdateCropDto) {
        await this.cropsRepository.update(id, updateCropDto);
        return this.findOne(id);
    }

    remove(id: string) {
        return this.cropsRepository.delete(id);
    }

    async harvest(id: string, harvestData: { actualHarvestDate: Date; harvestWeightKg: number }) {
        await this.cropsRepository.update(id, {
            ...harvestData,
            status: 'harvested',
        });
        return this.findOne(id);
    }
}
