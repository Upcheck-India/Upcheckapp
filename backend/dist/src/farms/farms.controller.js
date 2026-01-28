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
exports.FarmsController = void 0;
const common_1 = require("@nestjs/common");
const farms_service_1 = require("./farms.service");
const create_farm_dto_1 = require("./dto/create-farm.dto");
const update_farm_dto_1 = require("./dto/update-farm.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let FarmsController = class FarmsController {
    farmsService;
    constructor(farmsService) {
        this.farmsService = farmsService;
    }
    create(createFarmDto, req) {
        return this.farmsService.create(createFarmDto, req.user.id);
    }
    findAll(req) {
        return this.farmsService.findAll(req.user.id);
    }
    findOne(id, req) {
        return this.farmsService.findOne(id, req.user.id);
    }
    update(id, updateFarmDto, req) {
        return this.farmsService.update(id, updateFarmDto, req.user.id);
    }
    remove(id, req) {
        return this.farmsService.remove(id, req.user.id);
    }
};
exports.FarmsController = FarmsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_farm_dto_1.CreateFarmDto, Object]),
    __metadata("design:returntype", void 0)
], FarmsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FarmsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FarmsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_farm_dto_1.UpdateFarmDto, Object]),
    __metadata("design:returntype", void 0)
], FarmsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FarmsController.prototype, "remove", null);
exports.FarmsController = FarmsController = __decorate([
    (0, common_1.Controller)('farms'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [farms_service_1.FarmsService])
], FarmsController);
//# sourceMappingURL=farms.controller.js.map