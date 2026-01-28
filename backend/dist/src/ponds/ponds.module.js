"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PondsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const ponds_service_1 = require("./ponds.service");
const ponds_controller_1 = require("./ponds.controller");
const pond_entity_1 = require("./pond.entity");
const farms_module_1 = require("../farms/farms.module");
let PondsModule = class PondsModule {
};
exports.PondsModule = PondsModule;
exports.PondsModule = PondsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([pond_entity_1.Pond]), farms_module_1.FarmsModule],
        controllers: [ponds_controller_1.PondsController],
        providers: [ponds_service_1.PondsService],
        exports: [ponds_service_1.PondsService],
    })
], PondsModule);
//# sourceMappingURL=ponds.module.js.map