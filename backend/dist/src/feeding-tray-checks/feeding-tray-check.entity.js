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
exports.FeedingTrayCheck = void 0;
const typeorm_1 = require("typeorm");
const feed_record_entity_1 = require("../feed-records/feed-record.entity");
const crop_entity_1 = require("../crops/crop.entity");
let FeedingTrayCheck = class FeedingTrayCheck {
    id;
    cropId;
    crop;
    feedRecordId;
    feedRecord;
    checkDate;
    checkTime;
    trayNumber;
    remainingFeedStatus;
    createdAt;
};
exports.FeedingTrayCheck = FeedingTrayCheck;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], FeedingTrayCheck.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'crop_id', type: 'uuid' }),
    __metadata("design:type", String)
], FeedingTrayCheck.prototype, "cropId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => crop_entity_1.Crop, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'crop_id' }),
    __metadata("design:type", crop_entity_1.Crop)
], FeedingTrayCheck.prototype, "crop", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'feed_record_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], FeedingTrayCheck.prototype, "feedRecordId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => feed_record_entity_1.FeedRecord, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'feed_record_id' }),
    __metadata("design:type", feed_record_entity_1.FeedRecord)
], FeedingTrayCheck.prototype, "feedRecord", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', name: 'check_date' }),
    __metadata("design:type", Date)
], FeedingTrayCheck.prototype, "checkDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'time', name: 'check_time' }),
    __metadata("design:type", String)
], FeedingTrayCheck.prototype, "checkTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', name: 'tray_number' }),
    __metadata("design:type", Number)
], FeedingTrayCheck.prototype, "trayNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'remaining_feed_status' }),
    __metadata("design:type", String)
], FeedingTrayCheck.prototype, "remainingFeedStatus", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], FeedingTrayCheck.prototype, "createdAt", void 0);
exports.FeedingTrayCheck = FeedingTrayCheck = __decorate([
    (0, typeorm_1.Entity)('feeding_tray_checks')
], FeedingTrayCheck);
//# sourceMappingURL=feeding-tray-check.entity.js.map