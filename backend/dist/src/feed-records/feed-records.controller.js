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
exports.FeedRecordsController = void 0;
const common_1 = require("@nestjs/common");
const feed_records_service_1 = require("./feed-records.service");
const create_feed_record_dto_1 = require("./dto/create-feed-record.dto");
const update_feed_record_dto_1 = require("./dto/update-feed-record.dto");
let FeedRecordsController = class FeedRecordsController {
    feedRecordsService;
    constructor(feedRecordsService) {
        this.feedRecordsService = feedRecordsService;
    }
    create(createDto) {
        return this.feedRecordsService.create(createDto);
    }
    findAll(pondId) {
        return this.feedRecordsService.findAll(pondId);
    }
    getTotalFeed(pondId) {
        return this.feedRecordsService.getTotalFeedByPond(pondId);
    }
    findOne(id) {
        return this.feedRecordsService.findOne(id);
    }
    update(id, updateDto) {
        return this.feedRecordsService.update(id, updateDto);
    }
    remove(id) {
        return this.feedRecordsService.remove(id);
    }
};
exports.FeedRecordsController = FeedRecordsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_feed_record_dto_1.CreateFeedRecordDto]),
    __metadata("design:returntype", void 0)
], FeedRecordsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('pondId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FeedRecordsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('pond/:pondId/total'),
    __param(0, (0, common_1.Param)('pondId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FeedRecordsController.prototype, "getTotalFeed", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FeedRecordsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_feed_record_dto_1.UpdateFeedRecordDto]),
    __metadata("design:returntype", void 0)
], FeedRecordsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FeedRecordsController.prototype, "remove", null);
exports.FeedRecordsController = FeedRecordsController = __decorate([
    (0, common_1.Controller)('feed-records'),
    __metadata("design:paramtypes", [feed_records_service_1.FeedRecordsService])
], FeedRecordsController);
//# sourceMappingURL=feed-records.controller.js.map