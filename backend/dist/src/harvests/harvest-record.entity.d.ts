import { Crop } from '../crops/crop.entity';
export declare class HarvestRecord {
    id: string;
    cropId: string;
    crop: Crop;
    harvestDate: Date;
    harvestType: string;
    totalWeightKg: number;
    countPerKg: number;
    pricePerKgRp: number;
    buyerName: string;
    notes: string;
    createdAt: Date;
}
