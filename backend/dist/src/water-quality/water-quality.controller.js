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
exports.WaterQualityController = void 0;
const common_1 = require("@nestjs/common");
const water_quality_service_1 = require("./water-quality.service");
const create_water_quality_record_dto_1 = require("./dto/create-water-quality-record.dto");
const update_water_quality_record_dto_1 = require("./dto/update-water-quality-record.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let WaterQualityController = class WaterQualityController {
    waterQualityService;
    constructor(waterQualityService) {
        this.waterQualityService = waterQualityService;
    }
    create(createDto, req) {
        return this.waterQualityService.create(createDto, req.user.id);
    }
    findAll(pondId, req) {
        if (!pondId) {
            throw new common_1.BadRequestException('pondId query parameter is required');
        }
        return this.waterQualityService.findAll(pondId, req.user.id);
    }
    getLatest(pondId, req) {
        return this.waterQualityService.getLatestByPond(pondId, req.user.id);
    }
    findOne(id, req) {
        return this.waterQualityService.findOne(id, req.user.id);
    }
    update(id, updateDto, req) {
        return this.waterQualityService.update(id, updateDto, req.user.id);
    }
    remove(id, req) {
        return this.waterQualityService.remove(id, req.user.id);
    }
};
exports.WaterQualityController = WaterQualityController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_water_quality_record_dto_1.CreateWaterQualityRecordDto, Object]),
    __metadata("design:returntype", void 0)
], WaterQualityController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('pondId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], WaterQualityController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('pond/:pondId/latest'),
    __param(0, (0, common_1.Param)('pondId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], WaterQualityController.prototype, "getLatest", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], WaterQualityController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_water_quality_record_dto_1.UpdateWaterQualityRecordDto, Object]),
    __metadata("design:returntype", void 0)
], WaterQualityController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], WaterQualityController.prototype, "remove", null);
exports.WaterQualityController = WaterQualityController = __decorate([
    (0, common_1.Controller)('water-quality'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [water_quality_service_1.WaterQualityService])
], WaterQualityController);
//# sourceMappingURL=water-quality.controller.js.map