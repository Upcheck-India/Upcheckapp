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
exports.FeedRecordsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const feed_record_entity_1 = require("./feed-record.entity");
let FeedRecordsService = class FeedRecordsService {
    recordsRepository;
    constructor(recordsRepository) {
        this.recordsRepository = recordsRepository;
    }
    create(createDto) {
        const record = this.recordsRepository.create(createDto);
        return this.recordsRepository.save(record);
    }
    findAll(pondId) {
        if (pondId) {
            return this.recordsRepository.find({
                where: { pondId },
                order: { recordedAt: 'DESC' },
            });
        }
        return this.recordsRepository.find({ order: { recordedAt: 'DESC' } });
    }
    findOne(id) {
        return this.recordsRepository.findOneBy({ id });
    }
    async update(id, updateDto) {
        await this.recordsRepository.update(id, updateDto);
        return this.findOne(id);
    }
    remove(id) {
        return this.recordsRepository.delete(id);
    }
    async getTotalFeedByPond(pondId) {
        const result = await this.recordsRepository
            .createQueryBuilder('feed')
            .select('SUM(feed.quantityKg)', 'totalFeed')
            .where('feed.pondId = :pondId', { pondId })
            .getRawOne();
        return result?.totalFeed || 0;
    }
};
exports.FeedRecordsService = FeedRecordsService;
exports.FeedRecordsService = FeedRecordsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(feed_record_entity_1.FeedRecord)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], FeedRecordsService);
//# sourceMappingURL=feed-records.service.js.map