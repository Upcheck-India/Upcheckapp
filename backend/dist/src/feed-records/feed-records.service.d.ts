import { Repository } from 'typeorm';
import { FeedRecord } from './feed-record.entity';
import { CreateFeedRecordDto } from './dto/create-feed-record.dto';
import { UpdateFeedRecordDto } from './dto/update-feed-record.dto';
export declare class FeedRecordsService {
    private recordsRepository;
    constructor(recordsRepository: Repository<FeedRecord>);
    create(createDto: CreateFeedRecordDto): Promise<FeedRecord>;
    findAll(pondId?: string): Promise<FeedRecord[]>;
    findOne(id: string): Promise<FeedRecord | null>;
    update(id: string, updateDto: UpdateFeedRecordDto): Promise<FeedRecord | null>;
    remove(id: string): Promise<import("typeorm").DeleteResult>;
    getTotalFeedByPond(pondId: string): Promise<any>;
}
