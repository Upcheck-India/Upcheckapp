import { Crop } from '../crops/crop.entity';
export declare class MortalityRecord {
    id: string;
    cropId: string;
    crop: Crop;
    recordDate: Date;
    quantity: number;
    estimatedWeightKg: number;
    note: string;
    images: string[];
    createdAt: Date;
}
