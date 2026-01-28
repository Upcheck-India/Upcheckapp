import { FeedRecord } from '../feed-records/feed-record.entity';
import { Crop } from '../crops/crop.entity';
export declare class FeedingTrayCheck {
    id: string;
    cropId: string;
    crop: Crop;
    feedRecordId: string;
    feedRecord: FeedRecord;
    checkDate: Date;
    checkTime: string;
    trayNumber: number;
    remainingFeedStatus: string;
    createdAt: Date;
}
