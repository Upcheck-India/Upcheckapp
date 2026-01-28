"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FarmsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const farms_service_1 = require("./farms.service");
const farms_controller_1 = require("./farms.controller");
const farm_entity_1 = require("./farm.entity");
let FarmsModule = class FarmsModule {
};
exports.FarmsModule = FarmsModule;
exports.FarmsModule = FarmsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([farm_entity_1.Farm])],
        controllers: [farms_controller_1.FarmsController],
        providers: [farms_service_1.FarmsService],
        exports: [farms_service_1.FarmsService],
    })
], FarmsModule);
//# sourceMappingURL=farms.module.js.map