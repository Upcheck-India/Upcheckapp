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
exports.PondsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const pond_entity_1 = require("./pond.entity");
const farms_service_1 = require("../farms/farms.service");
let PondsService = class PondsService {
    pondsRepository;
    farmsService;
    constructor(pondsRepository, farmsService) {
        this.pondsRepository = pondsRepository;
        this.farmsService = farmsService;
    }
    async create(createPondDto, userId) {
        await this.farmsService.findOne(createPondDto.farmId, userId);
        const pond = this.pondsRepository.create(createPondDto);
        return this.pondsRepository.save(pond);
    }
    async findAll(farmId, userId) {
        await this.farmsService.findOne(farmId, userId);
        return this.pondsRepository.find({ where: { farmId } });
    }
    async findOne(id, userId) {
        const pond = await this.pondsRepository.findOne({
            where: { id },
            relations: ['farm'],
        });
        if (!pond) {
            throw new common_1.NotFoundException(`Pond with ID ${id} not found`);
        }
        if (pond.farm.userId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to access this pond');
        }
        return pond;
    }
    async update(id, updatePondDto, userId) {
        await this.findOne(id, userId);
        await this.pondsRepository.update(id, updatePondDto);
        return this.findOne(id, userId);
    }
    async remove(id, userId) {
        await this.findOne(id, userId);
        return this.pondsRepository.delete(id);
    }
};
exports.PondsService = PondsService;
exports.PondsService = PondsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(pond_entity_1.Pond)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        farms_service_1.FarmsService])
], PondsService);
//# sourceMappingURL=ponds.service.js.map