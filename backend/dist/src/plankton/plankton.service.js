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
exports.PlanktonService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const plankton_data_entity_1 = require("./plankton-data.entity");
let PlanktonService = class PlanktonService {
    planktonRepository;
    constructor(planktonRepository) {
        this.planktonRepository = planktonRepository;
    }
    async create(dto) {
        const total = (dto.greenAlgaeGaCellMl || 0) +
            (dto.blueGreenAlgaeBgaCellMl || 0) +
            (dto.dinoflagellataCellMl || 0) +
            (dto.diatomCellMl || 0) +
            (dto.protozoaCellMl || 0) +
            (dto.flocCellMl || 0) +
            (dto.goldenBrownAlgaeCellMl || 0) +
            (dto.euglenophytaCellMl || 0) +
            (dto.zooCellMl || 0) +
            (dto.haptoyphytaCellMl || 0) +
            (dto.goldenGreenAlgaeCellMl || 0) +
            (dto.yellowGreenAlgaeCellMl || 0) +
            (dto.otherPlanktonCellMl || 0);
        const record = this.planktonRepository.create({
            ...dto,
            totalPlanktonCellMl: total,
        });
        return this.planktonRepository.save(record);
    }
    async findByCrop(cropId) {
        return this.planktonRepository.find({
            where: { cropId },
            order: { measurementDate: 'DESC', measurementTime: 'DESC' },
        });
    }
};
exports.PlanktonService = PlanktonService;
exports.PlanktonService = PlanktonService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(plankton_data_entity_1.PlanktonData)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PlanktonService);
//# sourceMappingURL=plankton.service.js.map