import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { WaterQualityRecord } from './water-quality-record.entity';
import { CreateWaterQualityRecordDto } from './dto/create-water-quality-record.dto';
import { UpdateWaterQualityRecordDto } from './dto/update-water-quality-record.dto';

@Injectable()
export class WaterQualityService {
    constructor(
        @InjectRepository(WaterQualityRecord)
        private recordsRepository: Repository<WaterQualityRecord>,
    ) { }

    create(createDto: CreateWaterQualityRecordDto) {
        const record = this.recordsRepository.create(createDto);
        return this.recordsRepository.save(record);
    }

    findAll(pondId?: string) {
        if (pondId) {
            return this.recordsRepository.find({
                where: { pondId },
                order: { recordedAt: 'DESC' },
            });
        }
        return this.recordsRepository.find({ order: { recordedAt: 'DESC' } });
    }

    findByPond(pondId: string, startDate?: Date, endDate?: Date) {
        if (startDate && endDate) {
            return this.recordsRepository.find({
                where: {
                    pondId,
                    recordedAt: Between(startDate, endDate),
                },
                order: { recordedAt: 'DESC' },
            });
        }
        return this.recordsRepository.find({
            where: { pondId },
            order: { recordedAt: 'DESC' },
        });
    }

    findOne(id: string) {
        return this.recordsRepository.findOneBy({ id });
    }

    async update(id: string, updateDto: UpdateWaterQualityRecordDto) {
        await this.recordsRepository.update(id, updateDto);
        return this.findOne(id);
    }

    remove(id: string) {
        return this.recordsRepository.delete(id);
    }

    async getLatestByPond(pondId: string) {
        return this.recordsRepository.findOne({
            where: { pondId },
            order: { recordedAt: 'DESC' },
        });
    }
}
