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
exports.PondsController = void 0;
const common_1 = require("@nestjs/common");
const ponds_service_1 = require("./ponds.service");
const create_pond_dto_1 = require("./dto/create-pond.dto");
const update_pond_dto_1 = require("./dto/update-pond.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let PondsController = class PondsController {
    pondsService;
    constructor(pondsService) {
        this.pondsService = pondsService;
    }
    create(createPondDto, req) {
        return this.pondsService.create(createPondDto, req.user.id);
    }
    findAll(farmId, req) {
        if (!farmId) {
            throw new common_1.BadRequestException('farmId query parameter is required');
        }
        return this.pondsService.findAll(farmId, req.user.id);
    }
    findOne(id, req) {
        return this.pondsService.findOne(id, req.user.id);
    }
    update(id, updatePondDto, req) {
        return this.pondsService.update(id, updatePondDto, req.user.id);
    }
    remove(id, req) {
        return this.pondsService.remove(id, req.user.id);
    }
};
exports.PondsController = PondsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_pond_dto_1.CreatePondDto, Object]),
    __metadata("design:returntype", void 0)
], PondsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('farmId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PondsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PondsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_pond_dto_1.UpdatePondDto, Object]),
    __metadata("design:returntype", void 0)
], PondsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PondsController.prototype, "remove", null);
exports.PondsController = PondsController = __decorate([
    (0, common_1.Controller)('ponds'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [ponds_service_1.PondsService])
], PondsController);
//# sourceMappingURL=ponds.controller.js.map