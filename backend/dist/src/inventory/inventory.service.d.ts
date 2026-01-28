import { Repository } from 'typeorm';
import { InventoryItem } from './inventory-item.entity';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
export declare class InventoryService {
    private itemsRepository;
    constructor(itemsRepository: Repository<InventoryItem>);
    create(createDto: CreateInventoryItemDto): Promise<InventoryItem>;
    findAll(farmId?: string, category?: string): Promise<InventoryItem[]>;
    findOne(id: string): Promise<InventoryItem | null>;
    update(id: string, updateDto: UpdateInventoryItemDto): Promise<InventoryItem | null>;
    remove(id: string): Promise<import("typeorm").DeleteResult>;
    getLowStock(farmId: string): Promise<InventoryItem[]>;
}
