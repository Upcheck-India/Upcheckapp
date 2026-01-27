import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { InventoryItem } from './inventory-item.entity';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';

@Injectable()
export class InventoryService {
    constructor(
        @InjectRepository(InventoryItem)
        private itemsRepository: Repository<InventoryItem>,
    ) { }

    create(createDto: CreateInventoryItemDto) {
        const item = this.itemsRepository.create(createDto);
        return this.itemsRepository.save(item);
    }

    findAll(farmId?: string, category?: string) {
        const where: any = {};
        if (farmId) where.farmId = farmId;
        if (category) where.category = category;
        return this.itemsRepository.find({ where });
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

    async getLowStock(farmId: string) {
        return this.itemsRepository
            .createQueryBuilder('item')
            .where('item.farmId = :farmId', { farmId })
            .andWhere('item.quantity <= item.reorderLevel')
            .getMany();
    }
}
