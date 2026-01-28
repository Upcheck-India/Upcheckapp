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
exports.Pond = void 0;
const typeorm_1 = require("typeorm");
const farm_entity_1 = require("../farms/farm.entity");
let Pond = class Pond {
    id;
    farmId;
    farm;
    createdAt;
    updatedAt;
    name;
    namePrefix;
    autoNumber;
    pondCode;
    type;
    lengthM;
    widthM;
    areaM2;
    depthM;
    rfidTag;
    speciesType;
    stockingDate;
    status;
};
exports.Pond = Pond;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Pond.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'farm_id', type: 'uuid' }),
    __metadata("design:type", String)
], Pond.prototype, "farmId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => farm_entity_1.Farm, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'farm_id' }),
    __metadata("design:type", farm_entity_1.Farm)
], Pond.prototype, "farm", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], Pond.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], Pond.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Pond.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'name_prefix', type: 'text', nullable: true }),
    __metadata("design:type", String)
], Pond.prototype, "namePrefix", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'auto_number', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], Pond.prototype, "autoNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pond_code', type: 'text', nullable: true }),
    __metadata("design:type", String)
], Pond.prototype, "pondCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Pond.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'length_m', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], Pond.prototype, "lengthM", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'width_m', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], Pond.prototype, "widthM", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'area_m2', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], Pond.prototype, "areaM2", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'depth_m', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], Pond.prototype, "depthM", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rfid_tag', type: 'text', nullable: true }),
    __metadata("design:type", String)
], Pond.prototype, "rfidTag", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'species_type', type: 'text', nullable: true }),
    __metadata("design:type", String)
], Pond.prototype, "speciesType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'stocking_date', type: 'timestamp with time zone', nullable: true }),
    __metadata("design:type", Date)
], Pond.prototype, "stockingDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', default: 'active' }),
    __metadata("design:type", String)
], Pond.prototype, "status", void 0);
exports.Pond = Pond = __decorate([
    (0, typeorm_1.Entity)('ponds')
], Pond);
//# sourceMappingURL=pond.entity.js.map