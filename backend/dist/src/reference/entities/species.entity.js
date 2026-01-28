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
exports.Species = void 0;
const typeorm_1 = require("typeorm");
let Species = class Species {
    id;
    scientificName;
    commonName;
    optimalPhMin;
    optimalPhMax;
    optimalSalinityMin;
    optimalSalinityMax;
    optimalTempMin;
    optimalTempMax;
    createdAt;
};
exports.Species = Species;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Species.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'scientific_name' }),
    __metadata("design:type", String)
], Species.prototype, "scientificName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, name: 'common_name' }),
    __metadata("design:type", String)
], Species.prototype, "commonName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'optimal_ph_min' }),
    __metadata("design:type", Number)
], Species.prototype, "optimalPhMin", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'optimal_ph_max' }),
    __metadata("design:type", Number)
], Species.prototype, "optimalPhMax", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'optimal_salinity_min' }),
    __metadata("design:type", Number)
], Species.prototype, "optimalSalinityMin", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'optimal_salinity_max' }),
    __metadata("design:type", Number)
], Species.prototype, "optimalSalinityMax", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'optimal_temp_min' }),
    __metadata("design:type", Number)
], Species.prototype, "optimalTempMin", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'optimal_temp_max' }),
    __metadata("design:type", Number)
], Species.prototype, "optimalTempMax", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], Species.prototype, "createdAt", void 0);
exports.Species = Species = __decorate([
    (0, typeorm_1.Entity)('species')
], Species);
//# sourceMappingURL=species.entity.js.map