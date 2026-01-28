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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryItem = void 0;
const typeorm_1 = require("typeorm");
const farm_entity_1 = require("../farms/farm.entity");
let InventoryItem = class InventoryItem {
    id;
    farmId;
    farm;
    createdAt;
    updatedAt;
    name;
    category;
    quantity;
    unit;
    unitPrice;
    reorderLevel;
    supplier;
    expiryDate;
};
exports.InventoryItem = InventoryItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], InventoryItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'farm_id', type: 'uuid' }),
    __metadata("design:type", String)
], InventoryItem.prototype, "farmId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => farm_entity_1.Farm, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'farm_id' }),
    __metadata("design:type", farm_entity_1.Farm)
], InventoryItem.prototype, "farm", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], InventoryItem.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], InventoryItem.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], InventoryItem.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], InventoryItem.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', default: 0 }),
    __metadata("design:type", Number)
], InventoryItem.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], InventoryItem.prototype, "unit", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'unit_price', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], InventoryItem.prototype, "unitPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reorder_level', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], InventoryItem.prototype, "reorderLevel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], InventoryItem.prototype, "supplier", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expiry_date', type: 'timestamp with time zone', nullable: true }),
    __metadata("design:type", Date)
], InventoryItem.prototype, "expiryDate", void 0);
exports.InventoryItem = InventoryItem = __decorate([
    (0, typeorm_1.Entity)('inventory')
], InventoryItem);
//# sourceMappingURL=inventory-item.entity.js.map