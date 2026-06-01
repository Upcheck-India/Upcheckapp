import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { InventoryItem } from './inventory-item.entity';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';

import { AlertsService } from '../alerts/alerts.service';
import { FarmsService } from '../farms/farms.service';

@Injectable()
export class InventoryService {
    private readonly logger = new Logger(InventoryService.name);

    constructor(
        @InjectRepository(InventoryItem)
        private itemsRepository: Repository<InventoryItem>,
        private alertsService: AlertsService,
        private farmsService: FarmsService,
    ) { }

    async create(createDto: CreateInventoryItemDto, userId: string) {
        await this.farmsService.verifyOwnership(createDto.farmId, userId);
        const item = this.itemsRepository.create(createDto);
        return this.itemsRepository.save(item);
    }

    async findAll(userId: string, farmId?: string, category?: string): Promise<InventoryItem[]> {
        const where: any = {};
        if (category) where.category = category;

        if (farmId) {
            await this.farmsService.verifyOwnership(farmId, userId);
            where.farmId = farmId;
        } else {
            const farms = await this.farmsService.findAll(userId);
            const farmIds = farms.map((f) => f.id);
            if (farmIds.length === 0) return [];
            where.farmId = In(farmIds);
        }

        return this.itemsRepository.find({ where, order: { name: 'ASC' } });
    }

    private async findOwned(id: string, userId: string): Promise<InventoryItem> {
        const item = await this.itemsRepository.findOneBy({ id });
        if (!item) {
            throw new NotFoundException(`Inventory item with ID ${id} not found`);
        }
        await this.farmsService.verifyOwnership(item.farmId, userId);
        return item;
    }

    findOne(id: string, userId: string) {
        return this.findOwned(id, userId);
    }

    async update(id: string, updateDto: UpdateInventoryItemDto, userId: string) {
        await this.findOwned(id, userId);
        if (updateDto.farmId) {
            await this.farmsService.verifyOwnership(updateDto.farmId, userId);
        }
        await this.itemsRepository.update(id, updateDto);
        return this.itemsRepository.findOneBy({ id });
    }

    async remove(id: string, userId: string) {
        await this.findOwned(id, userId);
        return this.itemsRepository.delete(id);
    }

    async getLowStock(farmId: string, userId: string): Promise<InventoryItem[]> {
        await this.farmsService.verifyOwnership(farmId, userId);
        return this.itemsRepository
            .createQueryBuilder('item')
            .where('item.farmId = :farmId', { farmId })
            .andWhere('item.quantity <= item.reorderLevel')
            .orderBy('item.name', 'ASC')
            .getMany();
    }

    async countLowStock(farmId: string): Promise<number> {
        return this.itemsRepository
            .createQueryBuilder('item')
            .where('item.farmId = :farmId', { farmId })
            .andWhere('item.quantity <= item.reorderLevel')
            .getCount();
    }

    async adjustStock(id: string, quantityChange: number, userId: string) {
        const item = await this.findOwned(id, userId);

        const newQuantity = Number(item.quantity) + quantityChange;
        if (newQuantity < 0) {
            throw new BadRequestException(
                `Insufficient stock. Available: ${item.quantity}, Required: ${Math.abs(quantityChange)}`,
            );
        }

        item.quantity = newQuantity;
        const savedItem = await this.itemsRepository.save(item);

        // Auto-raise a low-stock alert for the farm owner when crossing the threshold.
        if (savedItem.reorderLevel != null && savedItem.quantity <= savedItem.reorderLevel) {
            try {
                const farm = await this.farmsService.findOneInternal(savedItem.farmId);
                if (farm) {
                    await this.alertsService.createAutoAlert(
                        farm.userId,
                        farm.id,
                        'inventory_low_stock',
                        'Low Stock Alert',
                        `${savedItem.name} is running low (${savedItem.quantity} ${savedItem.unit ?? ''}).`,
                        'warning',
                        { inventoryItemId: savedItem.id },
                    );
                }
            } catch (error: any) {
                this.logger.error(`Failed to create low stock alert: ${error?.message ?? error}`);
            }
        }

        return savedItem;
    }
}
