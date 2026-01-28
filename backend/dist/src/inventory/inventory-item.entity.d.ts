import { Farm } from '../farms/farm.entity';
export declare class InventoryItem {
    id: string;
    farmId: string;
    farm: Farm;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    reorderLevel: number;
    supplier: string;
    expiryDate: Date;
}
