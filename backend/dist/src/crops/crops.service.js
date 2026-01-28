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
exports.CropsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crop_entity_1 = require("./crop.entity");
const ponds_service_1 = require("../ponds/ponds.service");
let CropsService = class CropsService {
    cropsRepository;
    pondsService;
    constructor(cropsRepository, pondsService) {
        this.cropsRepository = cropsRepository;
        this.pondsService = pondsService;
    }
    async create(createCropDto, userId) {
        await this.pondsService.findOne(createCropDto.pondId, userId);
        const crop = this.cropsRepository.create(createCropDto);
        return this.cropsRepository.save(crop);
    }
    async findAll(pondId, userId) {
        if (!pondId) {
            return [];
        }
        await this.pondsService.findOne(pondId, userId);
        return this.cropsRepository.find({ where: { pondId } });
    }
    async findByPond(pondId, userId) {
        await this.pondsService.findOne(pondId, userId);
        return this.cropsRepository.find({ where: { pondId } });
    }
    async findOne(id, userId) {
        const crop = await this.cropsRepository.findOneBy({ id });
        if (!crop) {
            throw new common_1.NotFoundException(`Crop with ID ${id} not found`);
        }
        await this.pondsService.findOne(crop.pondId, userId);
        return crop;
    }
    async update(id, updateCropDto, userId) {
        await this.findOne(id, userId);
        await this.cropsRepository.update(id, updateCropDto);
        return this.findOne(id, userId);
    }
    async remove(id, userId) {
        await this.findOne(id, userId);
        return this.cropsRepository.delete(id);
    }
    async harvest(id, harvestData, userId) {
        await this.findOne(id, userId);
        await this.cropsRepository.update(id, {
            ...harvestData,
            status: 'harvested',
        });
        return this.findOne(id, userId);
    }
};
exports.CropsService = CropsService;
exports.CropsService = CropsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(crop_entity_1.Crop)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        ponds_service_1.PondsService])
], CropsService);
//# sourceMappingURL=crops.service.js.map