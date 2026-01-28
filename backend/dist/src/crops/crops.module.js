"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CropsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const crops_service_1 = require("./crops.service");
const crops_controller_1 = require("./crops.controller");
const crop_entity_1 = require("./crop.entity");
const ponds_module_1 = require("../ponds/ponds.module");
let CropsModule = class CropsModule {
};
exports.CropsModule = CropsModule;
exports.CropsModule = CropsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([crop_entity_1.Crop]), ponds_module_1.PondsModule],
        controllers: [crops_controller_1.CropsController],
        providers: [crops_service_1.CropsService],
        exports: [crops_service_1.CropsService],
    })
], CropsModule);
//# sourceMappingURL=crops.module.js.map