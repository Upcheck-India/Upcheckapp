import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MortalityRecord } from './mortality-record.entity';
import { CreateMortalityRecordDto } from './dto/create-mortality-record.dto';

/**
 * Default mortality multiplier.
 * When dead shrimp are observed (e.g., 10 found), the actual mortality
 * is estimated to be higher because not all dead shrimp are visible.
 * A multiplier of 3 means: observed 10 → estimated total 30.
 */
const DEFAULT_MORTALITY_MULTIPLIER = 3;

@Injectable()
export class MortalityService {
    constructor(
        @InjectRepository(MortalityRecord)
        private mortalityRepository: Repository<MortalityRecord>,
    ) { }

    async create(dto: CreateMortalityRecordDto): Promise<MortalityRecord> {
        // If estimatedTotal is not provided, compute it using the mortality multiplier
        const estimatedTotal = dto.estimatedTotal ?? dto.quantity * DEFAULT_MORTALITY_MULTIPLIER;

        const record = this.mortalityRepository.create({
            ...dto,
            estimatedTotal,
        });
        return this.mortalityRepository.save(record);
    }

    async findByCrop(cropId: string): Promise<MortalityRecord[]> {
        return this.mortalityRepository.find({
            where: { cropId },
            order: { recordDate: 'DESC', createdAt: 'DESC' },
        });
    }
}
