import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MortalityRecord } from './mortality-record.entity';
import { CreateMortalityRecordDto } from './dto/create-mortality-record.dto';

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
}
