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
exports.MortalityController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const mortality_service_1 = require("./mortality.service");
const create_mortality_record_dto_1 = require("./dto/create-mortality-record.dto");
let MortalityController = class MortalityController {
    mortalityService;
    constructor(mortalityService) {
        this.mortalityService = mortalityService;
    }
    create(dto) {
        return this.mortalityService.create(dto);
    }
    findByCrop(cropId) {
        return this.mortalityService.findByCrop(cropId);
    }
};
exports.MortalityController = MortalityController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_mortality_record_dto_1.CreateMortalityRecordDto]),
    __metadata("design:returntype", void 0)
], MortalityController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('crop/:cropId'),
    __param(0, (0, common_1.Param)('cropId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MortalityController.prototype, "findByCrop", null);
exports.MortalityController = MortalityController = __decorate([
    (0, common_1.Controller)('mortality'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [mortality_service_1.MortalityService])
], MortalityController);
//# sourceMappingURL=mortality.controller.js.map