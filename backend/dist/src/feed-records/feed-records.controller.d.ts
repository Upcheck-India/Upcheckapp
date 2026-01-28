import { FeedRecordsService } from './feed-records.service';
import { CreateFeedRecordDto } from './dto/create-feed-record.dto';
import { UpdateFeedRecordDto } from './dto/update-feed-record.dto';
export declare class FeedRecordsController {
    private readonly feedRecordsService;
    constructor(feedRecordsService: FeedRecordsService);
    create(createDto: CreateFeedRecordDto): Promise<import("./feed-record.entity").FeedRecord>;
    findAll(pondId?: string): Promise<import("./feed-record.entity").FeedRecord[]>;
    getTotalFeed(pondId: string): Promise<any>;
    findOne(id: string): Promise<import("./feed-record.entity").FeedRecord | null>;
    update(id: string, updateDto: UpdateFeedRecordDto): Promise<import("./feed-record.entity").FeedRecord | null>;
    remove(id: string): Promise<import("typeorm").DeleteResult>;
}
