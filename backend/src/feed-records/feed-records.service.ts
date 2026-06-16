import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedRecord } from './feed-record.entity';
import { CreateFeedRecordDto } from './dto/create-feed-record.dto';
import { UpdateFeedRecordDto } from './dto/update-feed-record.dto';

import { PondsService } from '../ponds/ponds.service';

import { InventoryService } from '../inventory/inventory.service';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageMetaDto, PageDto } from '../common/dto/page.dto';

@Injectable()
export class FeedRecordsService {
    constructor(
        @InjectRepository(FeedRecord)
        private recordsRepository: Repository<FeedRecord>,
        private pondsService: PondsService,
        private inventoryService: InventoryService,
    ) { }

    async create(createDto: CreateFeedRecordDto, userId: string) {
        // Idempotent replay guard — must run BEFORE the inventory deduction so a
        // queued-then-retried feed record never double-deducts stock.
        if (createDto.id) {
            const existing = await this.recordsRepository.findOne({ where: { id: createDto.id } });
            if (existing) return existing;
        }

        // Fasting day enforcement: if isFasting, quantityKg must be 0
        if (createDto.isFasting) {
            if (createDto.quantityKg > 0) {
                throw new BadRequestException('Fasting day: quantityKg must be 0 when isFasting is true');
            }
            createDto.quantityKg = 0;
        }

        // Fetch pond to get activeCycleId and verify access (owner or worker)
        const pond = await this.pondsService.findOneAccessible(createDto.pondId, userId, 'WRITE_OPERATIONAL');

        // If inventory item selected, deduct stock (skip for fasting days)
        if (createDto.inventoryItemId && !createDto.isFasting) {
            await this.inventoryService.adjustStock(createDto.inventoryItemId, -createDto.quantityKg, userId);
        }

        const record = this.recordsRepository.create({
            id: createDto.id,
            pondId: createDto.pondId,
            cropId: pond.activeCycleId,
            feedType: createDto.feedType,
            feedBrand: createDto.feedBrand,
            quantityKg: createDto.quantityKg,
            feedingTime: createDto.feedingTime,
            feedingMethod: createDto.feedingMethod,
            waterTemperature: createDto.waterTemperature,
            notes: createDto.isFasting ? (createDto.notes || 'Fasting day') : createDto.notes,
            inventoryItemId: createDto.isFasting ? null : createDto.inventoryItemId,
            createdById: userId,
            updatedById: userId,
        });
        return this.recordsRepository.save(record);
    }

    async findAll(pondId?: string, cropId?: string, pageOptionsDto?: PageOptionsDto): Promise<PageDto<FeedRecord>> {
        const skip = pageOptionsDto?.skip || 0;
        const take = pageOptionsDto?.take || 10;
        const order = pageOptionsDto?.order || 'DESC';

        const where: any = {};
        if (pondId) where.pondId = pondId;
        if (cropId) where.cropId = cropId;

        const [items, itemCount] = await this.recordsRepository.findAndCount({
            where,
            order: { recordedAt: order },
            take,
            skip,
        });

        const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto: pageOptionsDto || { page: 1, take } });
        return new PageDto(items, pageMetaDto);
    }

    async findOne(id: string): Promise<FeedRecord> {
        const record = await this.recordsRepository.findOneBy({ id });
        if (!record) throw new NotFoundException(`Feed record with ID ${id} not found`);
        return record;
    }

    async update(id: string, updateDto: UpdateFeedRecordDto, userId?: string): Promise<FeedRecord> {
        await this.findOne(id);
        await this.recordsRepository.update(id, { ...updateDto, ...(userId ? { updatedById: userId } : {}) });
        return this.findOne(id);
    }

    async remove(id: string): Promise<{ message: string }> {
        await this.findOne(id);
        await this.recordsRepository.delete(id);
        return { message: 'Feed record deleted successfully' };
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
