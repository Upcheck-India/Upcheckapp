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
  ) {}

  async create(createDto: CreateInventoryItemDto, userId: string) {
    await this.farmsService.verifyOwnership(createDto.farmId, userId);
    const item = this.itemsRepository.create(createDto);
    return this.itemsRepository.save(item);
  }

  async findAll(
    userId: string,
    farmId?: string,
    category?: string,
  ): Promise<InventoryItem[]> {
    const where: any = {};
    if (category) where.category = category;

    if (farmId) {
      // Workers may view inventory.
      await this.farmsService.verifyAccess(farmId, userId, 'READ');
      where.farmId = farmId;
    } else {
      const farms = await this.farmsService.findAll(userId);
      const farmIds = farms.map((f) => f.id);
      if (farmIds.length === 0) return [];
      where.farmId = In(farmIds);
    }

    return this.itemsRepository.find({ where, order: { name: 'ASC' } });
  }

  /**
   * Load an item and assert the caller's access at the given capability.
   * Defaults to OWNER_ONLY (catalog management); reads pass READ and the
   * feed-driven stock adjustment passes WRITE_OPERATIONAL.
   */
  private async findOwned(
    id: string,
    userId: string,
    capability: 'READ' | 'WRITE_OPERATIONAL' | 'OWNER_ONLY' = 'OWNER_ONLY',
  ): Promise<InventoryItem> {
    const item = await this.itemsRepository.findOneBy({ id });
    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }
    await this.farmsService.verifyAccess(item.farmId, userId, capability);
    return item;
  }

  findOne(id: string, userId: string) {
    return this.findOwned(id, userId, 'READ');
  }

  async update(id: string, updateDto: UpdateInventoryItemDto, userId: string) {
    await this.findOwned(id, userId, 'OWNER_ONLY');
    if (updateDto.farmId) {
      await this.farmsService.verifyOwnership(updateDto.farmId, userId);
    }
    await this.itemsRepository.update(id, updateDto);
    return this.itemsRepository.findOneBy({ id });
  }

  async remove(id: string, userId: string) {
    await this.findOwned(id, userId, 'OWNER_ONLY');
    return this.itemsRepository.delete(id);
  }

  async getLowStock(farmId: string, userId: string): Promise<InventoryItem[]> {
    await this.farmsService.verifyAccess(farmId, userId, 'READ');
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
    // Workers consume feed stock when logging feeding — operational write.
    const item = await this.findOwned(id, userId, 'WRITE_OPERATIONAL');

    // Atomic SQL-level delta (not read-modify-write in JS) so concurrent
    // feed logs can't clobber each other's stock updates. The guard clause
    // only blocks obviously-doomed decrements early with a friendlier
    // message; the WHERE clause below is the real concurrency-safe check.
    if (Number(item.quantity) + quantityChange < 0) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${item.quantity}, Required: ${Math.abs(quantityChange)}`,
      );
    }

    const result = await this.itemsRepository
      .createQueryBuilder()
      .update(InventoryItem)
      .set({ quantity: () => `quantity + (${quantityChange})` })
      .where('id = :id AND quantity + (:quantityChange) >= 0', {
        id,
        quantityChange,
      })
      .execute();

    if (result.affected === 0) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${item.quantity}, Required: ${Math.abs(quantityChange)}`,
      );
    }
    // Re-fetch through the repository (not raw driver output) so the
    // result is a properly camelCase-mapped entity.
    const savedItem = (await this.itemsRepository.findOneBy({
      id,
    })) as InventoryItem;

    // Auto-raise a low-stock alert for the farm owner when crossing the threshold.
    if (
      savedItem.reorderLevel != null &&
      savedItem.quantity <= savedItem.reorderLevel
    ) {
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
        this.logger.error(
          `Failed to create low stock alert: ${error?.message ?? error}`,
        );
      }
    }

    return savedItem;
  }
}
