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
exports.HarvestPlansController = void 0;
const common_1 = require("@nestjs/common");
const harvest_plans_service_1 = require("./harvest-plans.service");
const create_harvest_plan_dto_1 = require("./dto/create-harvest-plan.dto");
const update_harvest_plan_dto_1 = require("./dto/update-harvest-plan.dto");
let HarvestPlansController = class HarvestPlansController {
    harvestPlansService;
    constructor(harvestPlansService) {
        this.harvestPlansService = harvestPlansService;
    }
    create(createDto) {
        return this.harvestPlansService.create(createDto);
    }
    findAll(pondId) {
        return this.harvestPlansService.findAll(pondId);
    }
    findOne(id) {
        return this.harvestPlansService.findOne(id);
    }
    update(id, updateDto) {
        return this.harvestPlansService.update(id, updateDto);
    }
    complete(id, payload) {
        return this.harvestPlansService.completePlan(id, payload);
    }
    getSummary(pondId, farmId) {
        return this.harvestPlansService.getCycleSummary(pondId, farmId);
    }
    remove(id) {
        return this.harvestPlansService.remove(id);
    }
};
exports.HarvestPlansController = HarvestPlansController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_harvest_plan_dto_1.CreateHarvestPlanDto]),
    __metadata("design:returntype", void 0)
], HarvestPlansController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('pondId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HarvestPlansController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HarvestPlansController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_harvest_plan_dto_1.UpdateHarvestPlanDto]),
    __metadata("design:returntype", void 0)
], HarvestPlansController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/complete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HarvestPlansController.prototype, "complete", null);
__decorate([
    (0, common_1.Get)('pond/:pondId/summary'),
    __param(0, (0, common_1.Param)('pondId')),
    __param(1, (0, common_1.Query)('farmId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], HarvestPlansController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HarvestPlansController.prototype, "remove", null);
exports.HarvestPlansController = HarvestPlansController = __decorate([
    (0, common_1.Controller)('harvest-plans'),
    __metadata("design:paramtypes", [harvest_plans_service_1.HarvestPlansService])
], HarvestPlansController);
//# sourceMappingURL=harvest-plans.controller.js.map