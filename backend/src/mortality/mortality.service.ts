import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MortalityRecord } from './mortality-record.entity';
import { CreateMortalityRecordDto } from './dto/create-mortality-record.dto';
import { UpdateMortalityRecordDto } from './dto/update-mortality-record.dto';

@Injectable()
export class MortalityService {
    constructor(
        @InjectRepository(MortalityRecord)
        private mortalityRepository: Repository<MortalityRecord>,
    ) { }

    async create(dto: CreateMortalityRecordDto): Promise<MortalityRecord> {
        const record = this.mortalityRepository.create(dto);
        return this.mortalityRepository.save(record);
    }

    async findByCrop(cropId: string): Promise<MortalityRecord[]> {
        return this.mortalityRepository.find({
            where: { cropId },
            order: { recordDate: 'DESC', createdAt: 'DESC' },
        });
    }

    async findOne(id: string): Promise<MortalityRecord> {
        const record = await this.mortalityRepository.findOne({ where: { id } });
        if (!record) throw new NotFoundException(`Mortality record with ID ${id} not found`);
        return record;
    }

    async update(id: string, dto: UpdateMortalityRecordDto): Promise<MortalityRecord> {
        await this.findOne(id);
        await this.mortalityRepository.update(id, dto);
        return this.findOne(id);
    }

    async remove(id: string): Promise<{ message: string }> {
        await this.findOne(id);
        await this.mortalityRepository.delete(id);
        return { message: 'Mortality record deleted successfully' };
    }
}
