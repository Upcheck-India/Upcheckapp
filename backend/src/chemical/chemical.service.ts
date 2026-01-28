import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChemicalData } from './chemical-data.entity';
import { CreateChemicalDataDto } from './dto/create-chemical-data.dto';

@Injectable()
export class ChemicalService {
    constructor(
        @InjectRepository(ChemicalData)
        private chemicalRepository: Repository<ChemicalData>,
    ) { }

    async create(dto: CreateChemicalDataDto): Promise<ChemicalData> {
        const record = this.chemicalRepository.create(dto);
        return this.chemicalRepository.save(record);
    }

    async findByCrop(cropId: string): Promise<ChemicalData[]> {
        return this.chemicalRepository.find({
            where: { cropId },
            order: { measurementDate: 'DESC', measurementTime: 'DESC' },
        });
    }

    async findOne(id: string): Promise<ChemicalData> {
        const record = await this.chemicalRepository.findOne({ where: { id } });
        if (!record) throw new NotFoundException('Chemical data not found');
        return record;
    }
}
