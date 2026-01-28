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
exports.FarmsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const farm_entity_1 = require("./farm.entity");
let FarmsService = class FarmsService {
    farmsRepository;
    constructor(farmsRepository) {
        this.farmsRepository = farmsRepository;
    }
    create(createFarmDto, userId) {
        const farm = this.farmsRepository.create({
            ...createFarmDto,
            userId,
        });
        return this.farmsRepository.save(farm);
    }
    findAll(userId) {
        return this.farmsRepository.find({ where: { userId } });
    }
    async findOne(id, userId) {
        const farm = await this.farmsRepository.findOneBy({ id });
        if (!farm) {
            throw new common_1.NotFoundException(`Farm with ID ${id} not found`);
        }
        if (farm.userId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to access this farm');
        }
        return farm;
    }
    async update(id, updateFarmDto, userId) {
        const farm = await this.findOne(id, userId);
        await this.farmsRepository.update(id, updateFarmDto);
        return this.findOne(id, userId);
    }
    async remove(id, userId) {
        await this.findOne(id, userId);
        return this.farmsRepository.delete(id);
    }
};
exports.FarmsService = FarmsService;
exports.FarmsService = FarmsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(farm_entity_1.Farm)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], FarmsService);
//# sourceMappingURL=farms.service.js.map