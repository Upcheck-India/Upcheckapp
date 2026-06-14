import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChemicalData } from './chemical-data.entity';
import { CreateChemicalDataDto } from './dto/create-chemical-data.dto';
import { UpdateChemicalDataDto } from './dto/update-chemical-data.dto';

@Injectable()
export class ChemicalService {
    constructor(
        @InjectRepository(ChemicalData)
        private chemicalRepository: Repository<ChemicalData>,
    ) { }

    async create(dto: CreateChemicalDataDto, userId?: string): Promise<ChemicalData> {
        const record = this.chemicalRepository.create({ ...dto, createdById: userId, updatedById: userId });
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
        if (!record) throw new NotFoundException(`Chemical data with ID ${id} not found`);
        return record;
    }

    async update(id: string, dto: UpdateChemicalDataDto, userId?: string): Promise<ChemicalData> {
        await this.findOne(id);
        await this.chemicalRepository.update(id, { ...dto, ...(userId ? { updatedById: userId } : {}) });
        return this.findOne(id);
    }

    async remove(id: string): Promise<{ message: string }> {
        await this.findOne(id);
        await this.chemicalRepository.delete(id);
        return { message: 'Chemical data deleted successfully' };
    }
}
