import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedRecord } from './feed-record.entity';
import { CreateFeedRecordDto } from './dto/create-feed-record.dto';
import { UpdateFeedRecordDto } from './dto/update-feed-record.dto';

import { PondsService } from '../ponds/ponds.service';

import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class FeedRecordsService {
    constructor(
        @InjectRepository(FeedRecord)
        private recordsRepository: Repository<FeedRecord>,
        private pondsService: PondsService,
        private inventoryService: InventoryService,
    ) { }

    async create(createDto: CreateFeedRecordDto, userId: string) {
        // Fetch pond to get activeCycleId and verify ownership
        const pond = await this.pondsService.findOne(createDto.pondId, userId);

        // If inventory item selected, deduct stock
        if (createDto.inventoryItemId) {
            await this.inventoryService.adjustStock(createDto.inventoryItemId, -createDto.quantityKg);
        }

        const record = this.recordsRepository.create({
            ...createDto,
            cropId: pond.activeCycleId,
        });
        return this.recordsRepository.save(record);
    }

    async findAll(pondId?: string, options?: { skip?: number; take?: number }) {
        const take = options?.take || 50;
        const skip = options?.skip || 0;

        if (pondId) {
            return this.recordsRepository.findAndCount({
                where: { pondId },
                order: { recordedAt: 'DESC' },
                take,
                skip,
            });
        }
        return this.recordsRepository.findAndCount({
            order: { recordedAt: 'DESC' },
            take,
            skip,
        });
    }

    findOne(id: string) {
        return this.recordsRepository.findOneBy({ id });
    }

    async update(id: string, updateDto: UpdateFeedRecordDto) {
        await this.recordsRepository.update(id, updateDto);
        return this.findOne(id);
    }

    remove(id: string) {
        return this.recordsRepository.delete(id);
    }

    async getTotalFeedByPond(pondId: string) {
        const result = await this.recordsRepository
            .createQueryBuilder('feed')
            .select('SUM(feed.quantityKg)', 'totalFeed')
            .where('feed.pondId = :pondId', { pondId })
            .getRawOne();
        return result?.totalFeed || 0;
    }
    async getDailyFeedUsage(farmId: string, date: Date) {
        // Get start and end of day
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const result = await this.recordsRepository
            .createQueryBuilder('feed')
            .leftJoin('feed.pond', 'pond')
            .select('SUM(feed.quantityKg)', 'totalFeed')
            .where('pond.farmId = :farmId', { farmId })
            .andWhere('feed.recordedAt BETWEEN :start AND :end', { start: startOfDay, end: endOfDay })
            .getRawOne();

        return parseFloat(result?.totalFeed || '0');
    }
}
