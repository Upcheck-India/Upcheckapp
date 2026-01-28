import { Crop } from '../crops/crop.entity';
export declare class Treatment {
    id: string;
    cropId: string;
    crop: Crop;
    treatmentDate: Date;
    basedOn: string;
    description: string;
    productId: string;
    dosageKg: number;
    notes: string;
    createdAt: Date;
}
