"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const inventory_item_entity_1 = require("./inventory-item.entity");
let InventoryService = class InventoryService {
    itemsRepository;
    constructor(itemsRepository) {
        this.itemsRepository = itemsRepository;
    }
    create(createDto) {
        const item = this.itemsRepository.create(createDto);
        return this.itemsRepository.save(item);
    }
    findAll(farmId, category) {
        const where = {};
        if (farmId)
            where.farmId = farmId;
        if (category)
            where.category = category;
        return this.itemsRepository.find({ where });
    }
    findOne(id) {
        return this.itemsRepository.findOneBy({ id });
    }
    async update(id, updateDto) {
        await this.itemsRepository.update(id, updateDto);
        return this.findOne(id);
    }
    remove(id) {
        return this.itemsRepository.delete(id);
    }
    async getLowStock(farmId) {
        return this.itemsRepository
            .createQueryBuilder('item')
            .where('item.farmId = :farmId', { farmId })
            .andWhere('item.quantity <= item.reorderLevel')
            .getMany();
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(inventory_item_entity_1.InventoryItem)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map