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
exports.WaterQualityService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const water_quality_record_entity_1 = require("./water-quality-record.entity");
const ponds_service_1 = require("../ponds/ponds.service");
let WaterQualityService = class WaterQualityService {
    recordsRepository;
    pondsService;
    constructor(recordsRepository, pondsService) {
        this.recordsRepository = recordsRepository;
        this.pondsService = pondsService;
    }
    async create(createDto, userId) {
        await this.pondsService.findOne(createDto.pondId, userId);
        const record = this.recordsRepository.create(createDto);
        return this.recordsRepository.save(record);
    }
    async findAll(pondId, userId) {
        if (!pondId) {
            return [];
        }
        await this.pondsService.findOne(pondId, userId);
        return this.recordsRepository.find({
            where: { pondId },
            order: { recordedAt: 'DESC' },
        });
    }
    async findByPond(pondId, userId, startDate, endDate) {
        await this.pondsService.findOne(pondId, userId);
        if (startDate && endDate) {
            return this.recordsRepository.find({
                where: {
                    pondId,
                    recordedAt: (0, typeorm_2.Between)(startDate, endDate),
                },
                order: { recordedAt: 'DESC' },
            });
        }
        return this.recordsRepository.find({
            where: { pondId },
            order: { recordedAt: 'DESC' },
        });
    }
    async findOne(id, userId) {
        const record = await this.recordsRepository.findOneBy({ id });
        if (!record) {
            throw new common_1.NotFoundException(`WaterQualityRecord with ID ${id} not found`);
        }
        await this.pondsService.findOne(record.pondId, userId);
        return record;
    }
    async update(id, updateDto, userId) {
        await this.findOne(id, userId);
        await this.recordsRepository.update(id, updateDto);
        return this.findOne(id, userId);
    }
    async remove(id, userId) {
        await this.findOne(id, userId);
        return this.recordsRepository.delete(id);
    }
    async getLatestByPond(pondId, userId) {
        await this.pondsService.findOne(pondId, userId);
        return this.recordsRepository.findOne({
            where: { pondId },
            order: { recordedAt: 'DESC' },
        });
    }
};
exports.WaterQualityService = WaterQualityService;
exports.WaterQualityService = WaterQualityService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(water_quality_record_entity_1.WaterQualityRecord)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        ponds_service_1.PondsService])
], WaterQualityService);
//# sourceMappingURL=water-quality.service.js.map