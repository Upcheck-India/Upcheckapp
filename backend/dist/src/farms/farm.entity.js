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
exports.Farm = void 0;
const typeorm_1 = require("typeorm");
let Farm = class Farm {
    id;
    userId;
    createdAt;
    updatedAt;
    name;
    farmCode;
    areaHectares;
    address;
    longitude;
    latitude;
    qrCodeUrl;
    privacySetting;
};
exports.Farm = Farm;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Farm.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid' }),
    __metadata("design:type", String)
], Farm.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], Farm.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], Farm.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Farm.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'farm_code', type: 'text', nullable: true }),
    __metadata("design:type", String)
], Farm.prototype, "farmCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'area_hectares', type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], Farm.prototype, "areaHectares", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Farm.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], Farm.prototype, "longitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], Farm.prototype, "latitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'qr_code_url', type: 'text', nullable: true }),
    __metadata("design:type", String)
], Farm.prototype, "qrCodeUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'privacy_setting', type: 'text', default: 'private' }),
    __metadata("design:type", String)
], Farm.prototype, "privacySetting", void 0);
exports.Farm = Farm = __decorate([
    (0, typeorm_1.Entity)('farms')
], Farm);
//# sourceMappingURL=farm.entity.js.map