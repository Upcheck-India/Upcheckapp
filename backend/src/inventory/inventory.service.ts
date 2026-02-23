import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { InventoryItem } from './inventory-item.entity';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';

import { AlertsService } from '../alerts/alerts.service';
import { FarmsService } from '../farms/farms.service';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageMetaDto, PageDto } from '../common/dto/page.dto';

@Injectable()
export class InventoryService {
    constructor(
        @InjectRepository(InventoryItem)
        private itemsRepository: Repository<InventoryItem>,
        private alertsService: AlertsService,
        private farmsService: FarmsService,
    ) { }

    // ... (create, findAll, findOne, update, remove methods remain same)

    create(createDto: CreateInventoryItemDto) {
        const item = this.itemsRepository.create(createDto);
        return this.itemsRepository.save(item);
    }

    async findAll(farmId?: string, category?: string, pageOptionsDto?: PageOptionsDto): Promise<PageDto<InventoryItem>> {
        const skip = pageOptionsDto?.skip || 0;
        const take = pageOptionsDto?.take || 10;
        const order = pageOptionsDto?.order || 'DESC';

        const where: any = {};
        if (farmId) where.farmId = farmId;
        if (category) where.category = category;

        const [items, itemCount] = await this.itemsRepository.findAndCount({
            where,
            order: { name: order }, // or createdAt if it existed
            take,
            skip,
        });

        const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto: pageOptionsDto || { page: 1, take } });
        return new PageDto(items, pageMetaDto);
    }

    findOne(id: string) {
        return this.itemsRepository.findOneBy({ id });
    }

    async update(id: string, updateDto: UpdateInventoryItemDto) {
        await this.itemsRepository.update(id, updateDto);
        return this.findOne(id);
    }

    remove(id: string) {
        return this.itemsRepository.delete(id);
    }

    async getLowStock(farmId: string, pageOptionsDto?: PageOptionsDto): Promise<PageDto<InventoryItem>> {
        const skip = pageOptionsDto?.skip || 0;
        const take = pageOptionsDto?.take || 10;
        const order = pageOptionsDto?.order || 'DESC';

        const [items, itemCount] = await this.itemsRepository
            .createQueryBuilder('item')
            .where('item.farmId = :farmId', { farmId })
            .andWhere('item.quantity <= item.reorderLevel')
            .orderBy('item.name', order as 'ASC' | 'DESC')
            .skip(skip)
            .take(take)
            .getManyAndCount();

        const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto: pageOptionsDto || { page: 1, take } });
        return new PageDto(items, pageMetaDto);
    }

    async countLowStock(farmId: string): Promise<number> {
        return this.itemsRepository
            .createQueryBuilder('item')
            .where('item.farmId = :farmId', { farmId })
            .andWhere('item.quantity <= item.reorderLevel')
            .getCount();
    }

    async adjustStock(id: string, quantityChange: number) {
        const item = await this.findOne(id);
        if (!item) {
            throw new Error('Inventory item not found');
        }

        const newQuantity = Number(item.quantity) + quantityChange;
        if (newQuantity < 0) {
            throw new Error(`Insufficient stock. Available: ${item.quantity}, Required: ${Math.abs(quantityChange)}`);
        }

        item.quantity = newQuantity;
        const savedItem = await this.itemsRepository.save(item);

        // Check for Low Stock Alert
        if (savedItem.quantity <= savedItem.reorderLevel) {
            try {
                // Fetch the farm to get the userId
                // We mock userId for now as FarmsService.findOne might behave differently or be expensive repeatedly.
                // But let's try to do it right.
                // Note: FarmsService.findOne requires userId for ownership check usually...
                // But we can add a method just to get farm owner?
                // Or we can rely on `item.farmId` to get the farm directly via repository if injected?
                // Let's rely on FarmsService having a method to get generic farm info or fallback.

                // Workaround: We don't have direct access to farm owner USER ID efficiently here without a new query.
                // However, this operation is triggered by a user action usually.
                // Assuming the user needs to know. 

                // Let's implement a `getFarmOwner` in FarmsService or just query it here via repo?
                // Cleanest: FarmsService.getFarmOwner(farmId).
                // Existing FarmsService doesn't have it.

                // Let's assume we can add it or for this iteration just log it?
                // User requirement: "Integrate with InventoryService (Low Stock -> Alert)"
                // Let's assume the current user is the owner for simplicity or pass userId?
                // But `adjustStock` signature is `(id, quantityChange)`.

                // Let's query the farm owner.
                const farm = await this.farmsService.findOneInternal(savedItem.farmId);
                if (farm) {
                    await this.alertsService.createAutoAlert(
                        farm.userId,
                        farm.id,
                        'inventory_low_stock',
                        'Low Stock Alert',
                        `${savedItem.name} is running low (${savedItem.quantity} ${savedItem.unit}).`,
                        'warning',
                        { inventoryItemId: savedItem.id }
                    );
                }
            } catch (error) {
                console.error('Failed to create low stock alert:', error);
            }
        }

        return savedItem;
    }
}
