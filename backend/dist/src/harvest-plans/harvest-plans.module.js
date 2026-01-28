"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HarvestPlansModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const harvest_plan_entity_1 = require("./harvest-plan.entity");
const harvest_plans_controller_1 = require("./harvest-plans.controller");
const harvest_plans_service_1 = require("./harvest-plans.service");
const transaction_entity_1 = require("../transactions/transaction.entity");
const crop_entity_1 = require("../crops/crop.entity");
let HarvestPlansModule = class HarvestPlansModule {
};
exports.HarvestPlansModule = HarvestPlansModule;
exports.HarvestPlansModule = HarvestPlansModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([harvest_plan_entity_1.HarvestPlan, transaction_entity_1.Transaction, crop_entity_1.Crop])],
        controllers: [harvest_plans_controller_1.HarvestPlansController],
        providers: [harvest_plans_service_1.HarvestPlansService],
        exports: [harvest_plans_service_1.HarvestPlansService],
    })
], HarvestPlansModule);
//# sourceMappingURL=harvest-plans.module.js.map