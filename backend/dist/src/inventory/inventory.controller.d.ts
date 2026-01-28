import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    create(createDto: CreateInventoryItemDto): Promise<import("./inventory-item.entity").InventoryItem>;
    findAll(farmId?: string, category?: string): Promise<import("./inventory-item.entity").InventoryItem[]>;
    getLowStock(farmId: string): Promise<import("./inventory-item.entity").InventoryItem[]>;
    findOne(id: string): Promise<import("./inventory-item.entity").InventoryItem | null>;
    update(id: string, updateDto: UpdateInventoryItemDto): Promise<import("./inventory-item.entity").InventoryItem | null>;
    remove(id: string): Promise<import("typeorm").DeleteResult>;
}
