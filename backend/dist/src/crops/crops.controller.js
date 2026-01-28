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
exports.CropsController = void 0;
const common_1 = require("@nestjs/common");
const crops_service_1 = require("./crops.service");
const create_crop_dto_1 = require("./dto/create-crop.dto");
const update_crop_dto_1 = require("./dto/update-crop.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let CropsController = class CropsController {
    cropsService;
    constructor(cropsService) {
        this.cropsService = cropsService;
    }
    create(createCropDto, req) {
        return this.cropsService.create(createCropDto, req.user.id);
    }
    findAll(pondId, req) {
        if (!pondId) {
            throw new common_1.BadRequestException('pondId query parameter is required');
        }
        return this.cropsService.findAll(pondId, req.user.id);
    }
    findOne(id, req) {
        return this.cropsService.findOne(id, req.user.id);
    }
    update(id, updateCropDto, req) {
        return this.cropsService.update(id, updateCropDto, req.user.id);
    }
    harvest(id, harvestData, req) {
        return this.cropsService.harvest(id, harvestData, req.user.id);
    }
    remove(id, req) {
        return this.cropsService.remove(id, req.user.id);
    }
};
exports.CropsController = CropsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_crop_dto_1.CreateCropDto, Object]),
    __metadata("design:returntype", void 0)
], CropsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('pondId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CropsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CropsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_crop_dto_1.UpdateCropDto, Object]),
    __metadata("design:returntype", void 0)
], CropsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/harvest'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], CropsController.prototype, "harvest", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CropsController.prototype, "remove", null);
exports.CropsController = CropsController = __decorate([
    (0, common_1.Controller)('crops'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [crops_service_1.CropsService])
], CropsController);
//# sourceMappingURL=crops.controller.js.map