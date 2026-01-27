import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedRecord } from './feed-record.entity';
import { CreateFeedRecordDto } from './dto/create-feed-record.dto';
import { UpdateFeedRecordDto } from './dto/update-feed-record.dto';

@Injectable()
export class FeedRecordsService {
    constructor(
        @InjectRepository(FeedRecord)
        private recordsRepository: Repository<FeedRecord>,
    ) { }

    create(createDto: CreateFeedRecordDto) {
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
}
