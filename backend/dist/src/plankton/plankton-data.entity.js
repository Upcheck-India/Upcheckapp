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
exports.PlanktonData = void 0;
const typeorm_1 = require("typeorm");
const crop_entity_1 = require("../crops/crop.entity");
let PlanktonData = class PlanktonData {
    id;
    cropId;
    crop;
    measurementDate;
    measurementTime;
    greenAlgaeGaCellMl;
    blueGreenAlgaeBgaCellMl;
    dinoflagellataCellMl;
    diatomCellMl;
    protozoaCellMl;
    flocCellMl;
    goldenBrownAlgaeCellMl;
    euglenophytaCellMl;
    zooCellMl;
    haptoyphytaCellMl;
    goldenGreenAlgaeCellMl;
    yellowGreenAlgaeCellMl;
    otherPlanktonCellMl;
    totalPlanktonCellMl;
    createdAt;
};
exports.PlanktonData = PlanktonData;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PlanktonData.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'crop_id', type: 'uuid' }),
    __metadata("design:type", String)
], PlanktonData.prototype, "cropId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => crop_entity_1.Crop, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'crop_id' }),
    __metadata("design:type", crop_entity_1.Crop)
], PlanktonData.prototype, "crop", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', name: 'measurement_date' }),
    __metadata("design:type", Date)
], PlanktonData.prototype, "measurementDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'time', name: 'measurement_time' }),
    __metadata("design:type", String)
], PlanktonData.prototype, "measurementTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', nullable: true, name: 'green_algae_ga_cell_ml' }),
    __metadata("design:type", Number)
], PlanktonData.prototype, "greenAlgaeGaCellMl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', nullable: true, name: 'blue_green_algae_bga_cell_ml' }),
    __metadata("design:type", Number)
], PlanktonData.prototype, "blueGreenAlgaeBgaCellMl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', nullable: true, name: 'dinoflagellata_cell_ml' }),
    __metadata("design:type", Number)
], PlanktonData.prototype, "dinoflagellataCellMl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', nullable: true, name: 'diatom_cell_ml' }),
    __metadata("design:type", Number)
], PlanktonData.prototype, "diatomCellMl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', nullable: true, name: 'protozoa_cell_ml' }),
    __metadata("design:type", Number)
], PlanktonData.prototype, "protozoaCellMl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', nullable: true, name: 'floc_cell_ml' }),
    __metadata("design:type", Number)
], PlanktonData.prototype, "flocCellMl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', nullable: true, name: 'golden_brown_algae_cell_ml' }),
    __metadata("design:type", Number)
], PlanktonData.prototype, "goldenBrownAlgaeCellMl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', nullable: true, name: 'euglenophyta_cell_ml' }),
    __metadata("design:type", Number)
], PlanktonData.prototype, "euglenophytaCellMl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', nullable: true, name: 'zoo_cell_ml' }),
    __metadata("design:type", Number)
], PlanktonData.prototype, "zooCellMl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', nullable: true, name: 'haptoyphyta_cell_ml' }),
    __metadata("design:type", Number)
], PlanktonData.prototype, "haptoyphytaCellMl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', nullable: true, name: 'golden_green_algae_cell_ml' }),
    __metadata("design:type", Number)
], PlanktonData.prototype, "goldenGreenAlgaeCellMl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', nullable: true, name: 'yellow_green_algae_cell_ml' }),
    __metadata("design:type", Number)
], PlanktonData.prototype, "yellowGreenAlgaeCellMl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', nullable: true, name: 'other_plankton_cell_ml' }),
    __metadata("design:type", Number)
], PlanktonData.prototype, "otherPlanktonCellMl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', nullable: true, name: 'total_plankton_cell_ml' }),
    __metadata("design:type", Number)
], PlanktonData.prototype, "totalPlanktonCellMl", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], PlanktonData.prototype, "createdAt", void 0);
exports.PlanktonData = PlanktonData = __decorate([
    (0, typeorm_1.Entity)('plankton_data')
], PlanktonData);
//# sourceMappingURL=plankton-data.entity.js.map