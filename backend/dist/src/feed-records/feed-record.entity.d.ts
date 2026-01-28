import { Pond } from '../ponds/pond.entity';
export declare class FeedRecord {
    id: string;
    pondId: string;
    pond: Pond;
    recordedAt: Date;
    feedType: string;
    feedBrand: string;
    quantityKg: number;
    feedingTime: string;
    feedingMethod: string;
    waterTemperature: number;
    notes: string;
}
