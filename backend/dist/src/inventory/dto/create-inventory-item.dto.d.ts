export declare class CreateInventoryItemDto {
    farmId: string;
    name: string;
    category: string;
    quantity?: number;
    unit?: string;
    unitPrice?: number;
    reorderLevel?: number;
    supplier?: string;
    expiryDate?: string;
}
