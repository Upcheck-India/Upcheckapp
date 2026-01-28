"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedRecordsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const feed_records_service_1 = require("./feed-records.service");
const feed_records_controller_1 = require("./feed-records.controller");
const feed_record_entity_1 = require("./feed-record.entity");
let FeedRecordsModule = class FeedRecordsModule {
};
exports.FeedRecordsModule = FeedRecordsModule;
exports.FeedRecordsModule = FeedRecordsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([feed_record_entity_1.FeedRecord])],
        controllers: [feed_records_controller_1.FeedRecordsController],
        providers: [feed_records_service_1.FeedRecordsService],
        exports: [feed_records_service_1.FeedRecordsService],
    })
], FeedRecordsModule);
//# sourceMappingURL=feed-records.module.js.map