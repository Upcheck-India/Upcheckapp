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
exports.ChemicalData = void 0;
const typeorm_1 = require("typeorm");
const crop_entity_1 = require("../crops/crop.entity");
let ChemicalData = class ChemicalData {
    id;
    cropId;
    crop;
    measurementDate;
    measurementTime;
    ammoniaNh3Ppm;
    nitriteNo2Ppm;
    alkalinityPpm;
    nitrateNo3Ppm;
    hardnessPpm;
    calciumCaPpm;
    magnesiumMgPpm;
    carbonateCo3Ppm;
    bicarbonateHco3Ppm;
    tomPpm;
    ammoniumNh4Ppm;
    phosphatePo4Ppm;
    totalAmmoniaPpm;
    potassiumPpm;
    createdAt;
};
exports.ChemicalData = ChemicalData;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ChemicalData.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'crop_id', type: 'uuid' }),
    __metadata("design:type", String)
], ChemicalData.prototype, "cropId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => crop_entity_1.Crop, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'crop_id' }),
    __metadata("design:type", crop_entity_1.Crop)
], ChemicalData.prototype, "crop", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', name: 'measurement_date' }),
    __metadata("design:type", Date)
], ChemicalData.prototype, "measurementDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'time', name: 'measurement_time' }),
    __metadata("design:type", String)
], ChemicalData.prototype, "measurementTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'ammonia_nh3_ppm' }),
    __metadata("design:type", Number)
], ChemicalData.prototype, "ammoniaNh3Ppm", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'nitrite_no2_ppm' }),
    __metadata("design:type", Number)
], ChemicalData.prototype, "nitriteNo2Ppm", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'alkalinity_ppm' }),
    __metadata("design:type", Number)
], ChemicalData.prototype, "alkalinityPpm", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'nitrate_no3_ppm' }),
    __metadata("design:type", Number)
], ChemicalData.prototype, "nitrateNo3Ppm", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'hardness_ppm' }),
    __metadata("design:type", Number)
], ChemicalData.prototype, "hardnessPpm", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'calcium_ca_ppm' }),
    __metadata("design:type", Number)
], ChemicalData.prototype, "calciumCaPpm", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'magnesium_mg_ppm' }),
    __metadata("design:type", Number)
], ChemicalData.prototype, "magnesiumMgPpm", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'carbonate_co3_ppm' }),
    __metadata("design:type", Number)
], ChemicalData.prototype, "carbonateCo3Ppm", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'bicarbonate_hco3_ppm' }),
    __metadata("design:type", Number)
], ChemicalData.prototype, "bicarbonateHco3Ppm", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'tom_ppm' }),
    __metadata("design:type", Number)
], ChemicalData.prototype, "tomPpm", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'ammonium_nh4_ppm' }),
    __metadata("design:type", Number)
], ChemicalData.prototype, "ammoniumNh4Ppm", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'phosphate_po4_ppm' }),
    __metadata("design:type", Number)
], ChemicalData.prototype, "phosphatePo4Ppm", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'total_ammonia_ppm' }),
    __metadata("design:type", Number)
], ChemicalData.prototype, "totalAmmoniaPpm", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true, name: 'potassium_ppm' }),
    __metadata("design:type", Number)
], ChemicalData.prototype, "potassiumPpm", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], ChemicalData.prototype, "createdAt", void 0);
exports.ChemicalData = ChemicalData = __decorate([
    (0, typeorm_1.Entity)('chemical_data')
], ChemicalData);
//# sourceMappingURL=chemical-data.entity.js.map