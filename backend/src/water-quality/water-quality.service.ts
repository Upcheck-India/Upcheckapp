import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { WaterQualityRecord } from './water-quality-record.entity';
import { CreateWaterQualityRecordDto } from './dto/create-water-quality-record.dto';
import { UpdateWaterQualityRecordDto } from './dto/update-water-quality-record.dto';
import { PondsService } from '../ponds/ponds.service';

@Injectable()
export class WaterQualityService {
    constructor(
        @InjectRepository(WaterQualityRecord)
        private recordsRepository: Repository<WaterQualityRecord>,
        private pondsService: PondsService,
    ) { }

    async create(createDto: CreateWaterQualityRecordDto, userId: string) {
        // Verify user owns the pond
        await this.pondsService.verifyOwner(createDto.pondId, userId);

        const record = this.recordsRepository.create(createDto);
        return this.recordsRepository.save(record);
    }

    async findAll(pondId: string, userId: string) {
        if (!pondId) {
            // If no pondId is provided, we can't easily filter by user unless we join all the way to farms.
            // For now, let's enforce pondId requirement or implement a more complex query.
            // Given the context, it seems reasonable to require pondId or return [] if not provided/handle globally.
            // However, to be safe and consistent, let's require pondId for now as per the controller usage pattern, or return empty list.
            // But wait, the controller had optional pondId. If strict user isolation is needed, we should query:
            // records where pond.farm.userId = userId.
            // For simplicity and performance, let's assume the client always filters by pondId because fetching ALL records for a user across all ponds is a heavy dashboard query we might not have yet.
            return [];
        }

        // Verify user owns the pond
        await this.pondsService.verifyOwner(pondId, userId);

        return this.recordsRepository.find({
            where: { pondId },
            order: { recordedAt: 'DESC' },
        });
    }

    async findByPond(pondId: string, userId: string, startDate?: Date, endDate?: Date) {
        // Verify user owns the pond
        await this.pondsService.verifyOwner(pondId, userId);

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

    async findOne(id: string, userId: string) {
        const record = await this.recordsRepository.findOneBy({ id });
        if (!record) {
            throw new NotFoundException(`WaterQualityRecord with ID ${id} not found`);
        }
        // Verify ownership via pond
        await this.pondsService.verifyOwner(record.pondId, userId);
        return record;
    }

    async update(id: string, updateDto: UpdateWaterQualityRecordDto, userId: string) {
        await this.findOne(id, userId); // Verify ownership
        await this.recordsRepository.update(id, updateDto);
        return this.findOne(id, userId);
    }

    async remove(id: string, userId: string) {
        await this.findOne(id, userId); // Verify ownership
        return this.recordsRepository.delete(id);
    }

    async getLatestByPond(pondId: string, userId: string) {
        // Verify user owns the pond
        await this.pondsService.verifyOwner(pondId, userId);

        return this.recordsRepository.findOne({
            where: { pondId },
            order: { recordedAt: 'DESC' },
        });
    }
}
